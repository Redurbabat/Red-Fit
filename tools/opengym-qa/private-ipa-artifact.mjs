// A public CI runner gets only the recipient's public key. The private key and
// decrypted IPA remain on the owner's computer, outside version control.
import { createCipheriv, createDecipheriv, createHash, createPrivateKey, createPublicKey,
  generateKeyPairSync, privateDecrypt, publicEncrypt, randomBytes, randomUUID, constants } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { access, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { pathToFileURL } from 'node:url';

const payloadName = 'RED-Fit-UNSIGNED.ipa.enc';
const envelopeName = 'recipient.json';
const oaep = { padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' };
const fingerprint = key => createHash('sha256').update(key.export({ type: 'spki', format: 'der' })).digest('hex');

function recipientKey(encoded) {
  encoded = (encoded ?? '').trim();
  if (!encoded || encoded.length > 2048 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
    throw new Error('Expected a base64 SPKI public key, never a private key');
  }
  const key = createPublicKey({ key: Buffer.from(encoded, 'base64'), format: 'der', type: 'spki' });
  if (key.asymmetricKeyType !== 'rsa' || key.asymmetricKeyDetails.modulusLength < 3072) {
    throw new Error('Recipient must use RSA with at least 3072 bits');
  }
  return key;
}

export async function generateRecipient(directory) {
  await mkdir(directory, { recursive: false });
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 3072 });
  await writeFile(path.join(directory, 'private.pem'), privateKey.export({ type: 'pkcs8', format: 'pem' }), { flag: 'wx', mode: 0o600 });
  const recipient = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
  await writeFile(path.join(directory, 'recipient.txt'), recipient + '\n', { flag: 'wx' });
  return recipient;
}

export async function encryptIpa(input, encodedRecipient, directory) {
  const publicKey = recipientKey(encodedRecipient);
  const key = randomBytes(32);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  // Refuse an existing output directory rather than replacing another export.
  await mkdir(directory, { recursive: false });
  await pipeline(createReadStream(input), cipher,
    createWriteStream(path.join(directory, payloadName), { flags: 'wx' }));
  const envelope = {
    version: 1, algorithm: 'AES-256-GCM+RSA-OAEP-SHA256',
    recipient: fingerprint(publicKey),
    key: publicEncrypt({ key: publicKey, ...oaep }, key).toString('base64'),
    iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'),
  };
  key.fill(0);
  await writeFile(path.join(directory, envelopeName), JSON.stringify(envelope) + '\n', { flag: 'wx' });
}

export async function decryptIpa(directory, privateKeyFile, output) {
  try { await access(output); throw new Error('Output already exists'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const envelope = JSON.parse(await readFile(path.join(directory, envelopeName), 'utf8'));
  const privateKey = createPrivateKey(await readFile(privateKeyFile));
  if (envelope.version !== 1 || envelope.algorithm !== 'AES-256-GCM+RSA-OAEP-SHA256' ||
      fingerprint(createPublicKey(privateKey)) !== envelope.recipient) throw new Error('Wrong recipient or unsupported envelope');
  const key = privateDecrypt({ key: privateKey, ...oaep }, Buffer.from(envelope.key, 'base64'));
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
  const partial = output + '.partial-' + randomUUID();
  try {
    await pipeline(createReadStream(path.join(directory, payloadName)), decipher,
      createWriteStream(partial, { flags: 'wx', mode: 0o600 }));
    // Only a fully authenticated payload receives the final .ipa filename.
    await rename(partial, output);
  } catch (error) {
    await unlink(partial).catch(() => {});
    throw error;
  } finally { key.fill(0); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'keygen' && args.length === 1) console.log(await generateRecipient(args[0]));
  else if (command === 'encrypt' && args.length === 2) await encryptIpa(args[0], process.env.REDFIT_IPA_RECIPIENT, args[1]);
  else if (command === 'decrypt' && args.length === 3) await decryptIpa(...args);
  else throw new Error('Usage: keygen <new-key-directory> | encrypt <ipa> <new-artifact-directory> | decrypt <artifact-directory> <private.pem> <output.ipa>');
}
