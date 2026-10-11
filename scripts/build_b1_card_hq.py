#!/usr/bin/env python3
"""Build B1 card art from individually approved 1086x1448 PNG originals.

Usage:
    python -m pip install Pillow
    python scripts/build_b1_card_hq.py --source-dir /path/to/pngs

Each card keeps its own file; this does not generate new art and does not touch
the game engine. Output is a 768x1024 WebP for the existing illustration slot.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

ART = {
    "b1-physical-bludgeon.webp": "炎龍を砕く黄金騎士.png",
    "b1-physical-rapid.webp": "炎火の連撃_双星槌撃.png",
    "b1-physical-heavy.webp": "黄金の大槌_炎の一撃.png",
    "b1-physical-sneak.webp": "炎纏う不屈の聖騎士.png",
    "b1-physical-hammer.webp": "金色の戦乙女_炎撃の大槌.png",
    "b1-physical-doping.webp": "輝光の戦乙女と炎槌.png",
    "b1-physical-adversity.webp": "炎弧を纏う星騎士の大槌撃墜.png",
    "b1-physical-rage.webp": "逆鱗の炎撃_竜を纏う騎士.png",
    "b1-dark-mental-collapse.webp": "紫の精神崩壊に苦しむ騎士.png",
    "b1-dark-curse.webp": "呪われた騎士の緑の絶叫.png",
    "b1-dark-death-song.webp": "死の歌を奏でる冥界の女王.png",
    "b1-dark-hallucination.webp": "砕けた鏡界の亡霊騎士.png",
}
SIZE = (768, 1024)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, default=Path("v4-1/assets"))
    parser.add_argument("--manifest", type=Path, default=Path("design/b1-card-hq-generated-manifest.json"))
    parser.add_argument("--only", choices=["physical", "dark", "all"], default="all")
    args = parser.parse_args()
    from PIL import Image

    selected = {k: v for k, v in ART.items() if args.only == "all" or
                (args.only == "physical" and "physical" in k) or
                (args.only == "dark" and "dark" in k)}
    missing = [v for v in selected.values() if not (args.source_dir / v).is_file()]
    if missing:
        raise SystemExit("Source PNG missing:\n" + "\n".join(missing))

    args.output_dir.mkdir(parents=True, exist_ok=True)
    args.manifest.parent.mkdir(parents=True, exist_ok=True)
    result = []
    for filename, source in selected.items():
        original = args.source_dir / source
        with Image.open(original) as image:
            if image.width * 4 != image.height * 3:
                raise ValueError(f"Expected 3:4 art, got {image.size}: {source}")
            image = image.convert("RGB").resize(SIZE, Image.Resampling.LANCZOS)
            output = args.output_dir / filename
            image.save(output, format="WEBP", quality=83, method=6)
        with Image.open(output) as saved:
            saved.load()
            if saved.format != "WEBP" or saved.size != SIZE:
                raise ValueError(f"Invalid rendered file: {output}")
        data = output.read_bytes()
        result.append({"filename": filename, "source": source, "dimensions": list(SIZE),
                       "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()})
        print(f"{filename}: {len(data):,} bytes")
    args.manifest.write_text(json.dumps({"version": 1, "quality": 83, "items": result},
                                        ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Validated {len(result)} images. Manifest: {args.manifest}")


if __name__ == "__main__":
    main()
