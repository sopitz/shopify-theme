#!/usr/bin/env python3
"""Build a reproducible, theme-only Shopify release from this repository."""

import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parent.parent
FOLDERS = ('assets', 'config', 'layout', 'locales', 'sections', 'snippets', 'templates')
SEMVER = re.compile(r'(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--tag', help='Release tag, which must match theme metadata (vX.Y.Z).')
    parser.add_argument('--output', type=Path, default=ROOT / 'dist')
    args = parser.parse_args()
    metadata = json.loads((ROOT / 'config/settings_schema.json').read_text())
    version = next(group['theme_version'] for group in metadata if group.get('name') == 'theme_info')
    if not SEMVER.fullmatch(version):
        raise SystemExit('Theme version must use X.Y.Z semantic versioning.')
    if args.tag is not None and args.tag != f'v{version}':
        raise SystemExit(f'Tag {args.tag!r} does not match theme version v{version}.')
    development_package = ROOT / 'package.json'
    if development_package.is_file() and json.loads(development_package.read_text()).get('version') != version:
        raise SystemExit('package.json version does not match the theme version.')

    changelog = (ROOT / 'CHANGELOG.md').read_text()
    match = re.search(r'^## \[' + re.escape(version) + r'\] - [^\n]+\n(.*?)(?=^## \[|\Z)', changelog, re.M | re.S)
    if not match:
        raise SystemExit(f'CHANGELOG.md needs a section for {version}.')

    files = []
    for folder in FOLDERS:
        directory = ROOT / folder
        if not directory.is_dir():
            raise SystemExit(f'Missing theme folder: {folder}')
        for path in directory.rglob('*'):
            if path.is_symlink():
                raise SystemExit(f'Symlinks are not permitted in theme packages: {path.relative_to(ROOT)}')
            if path.is_file():
                if any(part.startswith('.') for part in path.relative_to(ROOT).parts):
                    raise SystemExit(f'Hidden file in theme package: {path.relative_to(ROOT)}')
                files.append(path)
    files.sort(key=lambda path: path.relative_to(ROOT).as_posix())
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    package = output / f'upswing-shopify-theme-{version}.zip'
    manifest_files = []
    with zipfile.ZipFile(package, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in files:
            name = path.relative_to(ROOT).as_posix()
            data = path.read_bytes()
            entry = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            entry.create_system = 3
            entry.external_attr = 0o100644 << 16
            entry.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(entry, data, compresslevel=9)
            manifest_files.append({'path': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
    with zipfile.ZipFile(package) as archive:
        if archive.testzip() is not None or set(archive.namelist()) != {item['path'] for item in manifest_files}:
            raise SystemExit('ZIP validation failed.')
    digest = hashlib.sha256(package.read_bytes()).hexdigest()
    (output / f'{package.name}.sha256').write_text(f'{digest}  {package.name}\n')
    commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    manifest = {'theme': 'Upswing Wellbeing', 'version': version, 'tag': f'v{version}', 'commit': commit,
                'zip': package.name, 'zip_bytes': package.stat().st_size, 'zip_sha256': digest,
                'files': manifest_files}
    (output / f'upswing-shopify-theme-{version}.manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    (output / 'release-notes.md').write_text(match[1].strip() + '\n')
    print(json.dumps({'version': version, 'commit': commit, 'files': len(files), 'zip': str(package), 'sha256': digest}, indent=2))


if __name__ == '__main__':
    main()
