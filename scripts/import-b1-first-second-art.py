#!/usr/bin/env python3
"""Import ten approved B1 card WebPs from a ZIP, verifying each SHA256."""
import argparse
import hashlib
import pathlib
import sys
import zipfile

EXPECTED = {
    "b1-auto-scatter.webp": "112e960da8f08eb1d682600fc1bf5acafce43fbb7cf9cfce49ec92ff637a1182",
    "b1-auto-chain.webp": "0e84271270db409b837021b807004a4c2da31304a7de1e9577cbf2f02bdd321d",
    "b1-auto-heal.webp": "b9ae6f3a4dd11aa7582138231ddea2de71fcab66ec5803da0f070be03bad447f",
    "b1-auto-drain.webp": "12be825802f44122a2c46b6872ffafe1cd1d4b81d6b3432162deaba721653c4d",
    "b1-auto-poison.webp": "fe04212eacb4cd23c7381720dde685cc094dc3d71db4977dcfc6f4ddb39fbec9",
    "b1-fragile.webp": "8c1442b65274ff1c47df10d05ab4c1dfa7e62e6602478f0248cc4e7bb2394ec3",
    "b1-power.webp": "80e7cc876ad728ae57ea48e02f1e8989c5a11a758a2697b171188b233d5013ff",
    "b1-spark.webp": "d266d74e5f84b96ee590b93850b593b0e5cfa993baa2afed82734d00d68aed9e",
    "b1-ice-barrier.webp": "38ee874cd36f2b9e92f00d0223f3b8832c197c276ae4df3fcd9ac17d2f71f1ce",
    "b1-cycle.webp": "18a91681328abd4aaf9c1d1bb93e49067ee38b44ff0c62e79de1fedfaf556eae",
}

def import_approved(zip_path, root):
    if zip_path.stat().st_size > 3_500_000:
        raise ValueError("ZIP too large")
    items = {}
    with zipfile.ZipFile(zip_path) as z:
        names = {entry.filename for entry in z.infolist() if not entry.is_dir()}
        expected_paths = {"v4-1/assets/" + n for n in EXPECTED}
        if not expected_paths.issubset(names) or names - expected_paths - {"IMPORT_MANIFEST.json"}:
            raise ValueError("Wrong or unexpected ZIP contents")
        for filename, expected_sha in EXPECTED.items():
            info = z.getinfo("v4-1/assets/" + filename)
            if not (50_000 <= info.file_size <= 800_000):
                raise ValueError("Invalid size: " + filename)
            data = z.read(info)
            if data[:4] != b"RIFF" or data[8:12] != b"WEBP":
                raise ValueError("Not WebP: " + filename)
            if hashlib.sha256(data).hexdigest() != expected_sha:
                raise ValueError("SHA256 mismatch: " + filename)
            items[filename] = data
    target = (root / "v4-1" / "assets").resolve()
    for filename, data in items.items():
        file = target / filename
        if file.exists() and file.read_bytes() != data:
            raise ValueError("Refusing overwrite: " + filename)
    target.mkdir(parents=True, exist_ok=True)
    for filename, data in items.items():
        file = target / filename
        if not file.exists():
            file.write_bytes(data)
    print("Imported and verified " + str(len(items)) + " B1 WebP assets")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("zip_path", type=pathlib.Path)
    parser.add_argument("--root", type=pathlib.Path, default=pathlib.Path("."))
    args = parser.parse_args()
    try:
        import_approved(args.zip_path, args.root)
    except (OSError, ValueError, zipfile.BadZipFile) as error:
        print("B1 art import failed: " + str(error), file=sys.stderr)
        raise SystemExit(1)
