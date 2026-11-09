#!/usr/bin/env python3
"""Verify the original RED Fit iPhone IPA contains the native embedded targets.

This performs integrity and packaging checks only. Passing is NOT Apple signing,
provisioning, installation, or runtime validation.
"""
import json
import plistlib
import sys
import tempfile
from pathlib import Path
from zipfile import BadZipFile, ZipFile, ZIP_STORED

APP = 'Payload/App.app/'
NATIVE_BUNDLES = {
    'iPhone': (APP, ''),
    'Watch': (APP + 'Watch/OpenGymWatch.app/', '.watchkitapp'),
    'iPhone widgets + Live Activity': (APP + 'PlugIns/OpenGymWidgets.appex/', '.widgets'),
    'Watch widgets': (APP + 'Watch/OpenGymWatch.app/PlugIns/OpenGymWatchWidgets.appex/', '.watchkitapp.widgets'),
    'Background asset downloader': (APP + 'Extensions/AnimationPacksDownloader.appex/', '.AnimationPacksDownloader'),
}


def verify_ipa(ipa: Path, app_id: str) -> list[str]:
    """Return packaging errors; never modify or sign the input IPA."""
    if not ipa.is_file() or ipa.stat().st_size == 0:
        return [f'IPA missing or empty: {ipa}']
    try:
        with ZipFile(ipa) as zip_file:
            names = [item.filename for item in zip_file.infolist()]
            available = set(names)
            errors: list[str] = []
            if len(names) != len(available):
                errors.append('IPA contains duplicate ZIP member names')
            for name in names:
                if name.startswith('/') or '..' in Path(name).parts:
                    errors.append(f'Unsafe archive member: {name}')
            corrupt_member = zip_file.testzip()
            if corrupt_member:
                errors.append(f'Bad ZIP CRC: {corrupt_member}')
            for label, (prefix, suffix) in NATIVE_BUNDLES.items():
                path = prefix + 'Info.plist'
                if path not in available:
                    errors.append(f'{label}: missing {path}')
                    continue
                try:
                    plist = plistlib.loads(zip_file.read(path))
                except (ValueError, TypeError, plistlib.InvalidFileException, OSError) as exc:
                    errors.append(f'{label}: invalid Info.plist ({exc})')
                    continue
                expected = app_id + suffix
                if plist.get('CFBundleIdentifier') != expected:
                    errors.append(f'{label}: CFBundleIdentifier must be {expected}, got {plist.get("CFBundleIdentifier")!r}')
                if label in ('iPhone', 'Watch') and plist.get('CFBundleDisplayName') != 'RED Fit':
                    errors.append(f'{label}: CFBundleDisplayName is not RED Fit')
                if label == 'Watch' and plist.get('WKCompanionAppBundleIdentifier') != app_id:
                    errors.append(f'Watch: companion app ID does not match {app_id}')
            for required in (APP + 'App', APP + 'Assets.car', APP + 'public/index.html'):
                if required not in available:
                    errors.append(f'Missing application binary or resource: {required}')
            if not any(item.startswith(APP + 'public/assets/') and item.endswith('.js') for item in available):
                errors.append('No compiled JavaScript assets in iOS application bundle')
            return errors
    except (OSError, BadZipFile, RuntimeError) as exc:
        return [f'Cannot read IPA as ZIP: {exc}']


def selftest() -> None:
    with tempfile.TemporaryDirectory() as folder:
        path = Path(folder) / 'fixture.ipa'
        app_id = 'ch.opengym.app'
        def make_zip(*, corrupt_watch: bool = False, omit_widget: bool = False) -> None:
            with ZipFile(path, 'w', ZIP_STORED) as zf:
                for label, (prefix, suffix) in NATIVE_BUNDLES.items():
                    if omit_widget and label == 'Watch widgets':
                        continue
                    bundle_id = app_id + ('.wrong' if corrupt_watch and label == 'Watch' else suffix)
                    info = {'CFBundleIdentifier': bundle_id}
                    if label in ('iPhone', 'Watch'):
                        info['CFBundleDisplayName'] = 'RED Fit'
                    if label == 'Watch':
                        info['WKCompanionAppBundleIdentifier'] = app_id
                    zf.writestr(prefix + 'Info.plist', plistlib.dumps(info))
                for p in (APP + 'App', APP + 'Assets.car', APP + 'public/index.html', APP + 'public/assets/app.js'):
                    zf.writestr(p, b'minimal-fixture-data')
        make_zip()
        assert verify_ipa(path, app_id) == [], 'Valid IPA bundle fixture must pass'
        make_zip(corrupt_watch=True)
        assert any('Watch: CFBundleIdentifier' in x for x in verify_ipa(path, app_id))
        make_zip(omit_widget=True)
        assert any('Watch widgets: missing' in x for x in verify_ipa(path, app_id))
        path.write_bytes(b'not a zip')
        assert any('Cannot read IPA as ZIP' in x for x in verify_ipa(path, app_id))
    print('IPA verifier self-tests: 4/4 passed')


def main() -> int:
    if len(sys.argv) == 2 and sys.argv[1] == '--selftest':
        selftest()
        return 0
    if len(sys.argv) != 2:
        print('Usage: python3 scripts/verify-unsigned-ipa.py <path-to-IPA> | --selftest', file=sys.stderr)
        return 2
    frontend = Path(__file__).resolve().parent.parent
    app_id = json.loads((frontend / 'capacitor.config.json').read_text(encoding='utf-8'))['appId']
    ipa = Path(sys.argv[1])
    errors = verify_ipa(ipa, app_id)
    if errors:
        for error in errors:
            print('FAIL:', error, file=sys.stderr)
        return 1
    print(f'Original RED Fit IPA package verified: {ipa.name} ({ipa.stat().st_size} bytes, '
          f'{len(NATIVE_BUNDLES)} native bundles, appId {app_id}).')
    print('This IPA has not been signed or provisioned for physical iPhone installation.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
