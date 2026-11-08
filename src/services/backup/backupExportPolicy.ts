/**
 * The normal RED Fit backup and its importer share a single size limit.
 * Refuse to export an archive that RED Fit cannot later restore.
 * Separate private photo archives have their own transfer size policy.
 */
export const MAX_STANDARD_BACKUP_BYTES = 25 * 1024 * 1024;

export class BackupTooLargeError extends Error {
  constructor() {
    super("Das Backup ist größer als 25 MiB und kann nicht wieder importiert werden.");
    this.name = "BackupTooLargeError";
  }
}

export function assertRestorableBackupSize(byteLength: number): void {
  if (!Number.isSafeInteger(byteLength) || byteLength <= 0) {
    throw new RangeError("Invalid backup file size");
  }
  if (byteLength > MAX_STANDARD_BACKUP_BYTES) {
    throw new BackupTooLargeError();
  }
}
