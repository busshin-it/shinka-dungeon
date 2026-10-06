#!/usr/bin/env python3
"""Verify/package the checked-in v4-1 app; update release metadata only on request."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'v4-1'
BUILD_RE = re.compile(r"^const BUILD = '[^']+';$", re.M)
FILES_RE = re.compile(r'^const FILES = (\[.*\]);$', re.M)


def inputs():
    paths = json.loads((ROOT / 'tools' / 'astral-files.json').read_text())
    if not isinstance(paths, list) or not all(isinstance(p, str) for p in paths):
        raise ValueError('astral-files.json must contain an array of relative file names')
    if len(paths) != len(set(paths)):
        raise ValueError('Duplicate release input')
    for name in paths:
        if not name.startswith('./') or '..' in Path(name).parts or name in {'./sw.js', './release.json'}:
            raise ValueError(f'Unsafe release input: {name}')
        path = APP / name
        if path.resolve().parent != APP.resolve() and APP.resolve() not in path.resolve().parents:
            raise ValueError(f'Release input escapes app: {name}')
        if path.is_symlink() or not path.is_file():
            raise ValueError(f'Missing or symlinked release input: {name}')
    return sorted(paths)


def metadata(version):
    if not re.fullmatch(r'\d+\.\d+(?:\.\d+)?', version):
        raise ValueError('Version must be numeric, e.g. 4.9')
    files = inputs()
    for required in ['./index.html', './planning.html', './engine.js', './planning-engine.js']:
        if required not in files:
            raise ValueError(f'Missing required app input: {required}')
    digest = hashlib.sha256()
    for name in files:
        digest.update(name.encode())
        digest.update((APP / name).read_bytes())
    return {'version': version, 'build': version + '-' + digest.hexdigest()[:12],
            'scope': './', 'entry': './', 'planning': './planning.html', 'files': len(files)}, files


def expected_worker(current, info, files):
    if len(BUILD_RE.findall(current)) != 1 or len(FILES_RE.findall(current)) != 1:
        raise ValueError('Service worker metadata anchors changed; review the worker manually')
    worker = BUILD_RE.sub(lambda _: "const BUILD = '" + info['build'] + "';", current)
    return FILES_RE.sub(lambda _: 'const FILES = ' + json.dumps(files, separators=(',', ':')) + ';', worker)


def verify():
    info = json.loads((APP / 'release.json').read_text())
    expected, files = metadata(info['version'])
    if info != expected:
        raise ValueError('release.json does not match app bytes; run release --version VERSION after review')
    worker = (APP / 'sw.js').read_text()
    if worker != expected_worker(worker, expected, files):
        raise ValueError('sw.js build/cache list does not match release.json and app bytes')
    print(f"Verified {info['build']}: {len(files)} cached files")
    return info, files


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('verify')
    release = sub.add_parser('release')
    release.add_argument('--version', required=True)
    package = sub.add_parser('package')
    package.add_argument('--output', type=Path, default=ROOT / 'dist' / 'astral-pwa.zip')
    args = parser.parse_args()
    if args.command == 'release':
        info, files = metadata(args.version)
        current = (APP / 'sw.js').read_text()
        worker = expected_worker(current, info, files)
        # Validate every input/anchor before writing. Runtime code is never regenerated.
        (APP / 'sw.js').write_text(worker)
        (APP / 'release.json').write_text(json.dumps(info, indent=2) + '\n')
        verify()
    elif args.command == 'verify':
        verify()
    else:
        info, files = verify()
        output = args.output.resolve()
        if output == APP or APP in output.parents:
            raise ValueError('Archive output must be outside v4-1')
        if output.exists():
            raise ValueError(f'Refusing to overwrite {output}; choose a new output')
        output.parent.mkdir(parents=True, exist_ok=True)
        # Fixed timestamps/order/modes make identical inputs produce identical ZIP bytes.
        with zipfile.ZipFile(output, 'x', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
            for name in sorted(files + ['./release.json', './sw.js']):
                entry = zipfile.ZipInfo('v4-1/' + name[2:], date_time=(1980, 1, 1, 0, 0, 0))
                entry.compress_type = zipfile.ZIP_DEFLATED
                entry.external_attr = 0o100644 << 16
                archive.writestr(entry, (APP / name).read_bytes(), compresslevel=9)
        print(f"Packaged {info['build']}: {output}")


if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, OSError, json.JSONDecodeError) as error:
        raise SystemExit(str(error))
