#!/usr/bin/env python3
"""Convert the six approved B1 elemental original PNGs to 768x1024 WebP.

Run from repository root:
    python -m pip install Pillow
    python scripts/build_b1_elemental_hq.py --source-dir /path/to/originals

Source artwork is 1086x1448. Do not upscale old 480x640 previews or change
game card effects, the hand crop, or the Asset Factory queue.
"""
from pathlib import Path
from PIL import Image
import argparse
import hashlib
import json

SOURCES = {
    "fire-aoe-small.webp": "image-gen-4(10).png",
    "fire-aoe-medium.webp": "image-gen-5(4).png",
    "fire-aoe-large.webp": "image-gen-6(4).png",
    "thunder-single-small.webp": "image-gen-7(4).png",
    "thunder-single-medium.webp": "image-gen-8(4).png",
    "thunder-single-large.webp": "image-gen-9(2).png",
}


def main() -> None:
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--source-dir", type=Path, required=True)
    cli.add_argument("--output-dir", type=Path, default=Path("v4-1/assets"))
    args = cli.parse_args()
    missing = [name for name in SOURCES.values()
               if not (args.source_dir / name).is_file()]
    if missing:
        raise SystemExit("Missing original images: " + ", ".join(missing))
    args.output_dir.mkdir(parents=True, exist_ok=True)
    info = []
    for filename, src in SOURCES.items():
        with Image.open(args.source_dir / src) as im:
            if im.size != (1086, 1448):
                raise ValueError(f"{src}: original is {im.size}, expected 1086x1448")
            im = im.convert("RGB").resize((768, 1024), Image.Resampling.LANCZOS)
            target = args.output_dir / filename
            im.save(target, "WEBP", quality=83, method=6)
        with Image.open(target) as ready:
            ready.load()
            assert ready.format == "WEBP" and ready.size == (768, 1024)
        raw = target.read_bytes()
        item = dict(filename=filename, original=src, bytes=len(raw),
                    sha256=hashlib.sha256(raw).hexdigest())
        info.append(item)
        print(item)
    print(json.dumps(info, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
