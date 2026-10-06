"""Exercise tooling only in temporary synthetic checkouts; never rewrite the app."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]


class ReleaseTools(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        shutil.copytree(ROOT / 'v4-1', self.root / 'v4-1')
        (self.root / 'tools').mkdir()
        for name in ['astral_release.py', 'astral-files.json']:
            shutil.copy2(ROOT / 'tools' / name, self.root / 'tools' / name)

    def tearDown(self):
        self.temp.cleanup()

    def run_tool(self, *args, success=True):
        result = subprocess.run(['python3', str(self.root / 'tools/astral_release.py'), *args],
                                capture_output=True, text=True)
        self.assertEqual(result.returncode == 0, success, result.stdout + result.stderr)
        return result

    def test_current_metadata_is_valid_and_regeneration_is_byte_identical(self):
        self.run_tool('verify')
        paths = [self.root / 'v4-1' / name for name in ['sw.js', 'release.json']]
        before = [p.read_bytes() for p in paths]
        version = json.loads(paths[1].read_text())['version']
        self.run_tool('release', '--version', version)
        self.assertEqual(before, [p.read_bytes() for p in paths])

    def test_changed_runtime_fails_until_explicit_metadata_update(self):
        path = self.root / 'v4-1/planning-engine.js'
        path.write_bytes(path.read_bytes() + b'\n// synthetic tooling test\n')
        self.run_tool('verify', success=False)
        self.run_tool('release', '--version', '4.9')
        self.run_tool('verify')

    def test_bad_lists_and_missing_inputs_fail(self):
        path = self.root / 'tools/astral-files.json'
        original = json.loads(path.read_text())
        for entry in ['../secret', '/absolute', './missing.js', './release.json', original[0]]:
            path.write_text(json.dumps(original + [entry]))
            self.run_tool('verify', success=False)

    def test_packages_are_reproducible_and_contain_exact_release_bytes(self):
        first, second = self.root / 'a.zip', self.root / 'b.zip'
        self.run_tool('package', '--output', str(first))
        self.run_tool('package', '--output', str(second))
        self.assertEqual(hashlib.sha256(first.read_bytes()).digest(), hashlib.sha256(second.read_bytes()).digest())
        expected = json.loads((self.root / 'tools/astral-files.json').read_text()) + ['./release.json', './sw.js']
        with zipfile.ZipFile(first) as archive:
            self.assertEqual(archive.testzip(), None)
            self.assertEqual(sorted(archive.namelist()), sorted('v4-1/' + name[2:] for name in expected))
            for name in expected:
                self.assertEqual(archive.read('v4-1/' + name[2:]), (self.root / 'v4-1' / name).read_bytes())
        self.run_tool('package', '--output', str(first), success=False)
        self.run_tool('package', '--output', str(self.root / 'v4-1/bad.zip'), success=False)


if __name__ == '__main__':
    unittest.main()
