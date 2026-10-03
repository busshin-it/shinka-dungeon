from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path("assets")
OUT = ROOT / "runtime"

RULES = {
    "cards": (420, 640, 72),
    "characters": (720, 720, 76),
    "enemies": (720, 720, 76),
}

for kind, (max_w, max_h, quality) in RULES.items():
    src_dir = ROOT / kind
    if not src_dir.exists():
        continue
    out_dir = OUT / kind
    out_dir.mkdir(parents=True, exist_ok=True)
    for src in src_dir.rglob("*.png"):
        if "runtime" in src.parts:
            continue
        try:
            with Image.open(src) as im:
                im = im.convert("RGBA")
                im.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)
                dst = out_dir / (src.stem + ".webp")
                im.save(dst, "WEBP", quality=quality, method=6)
                print(f"{src} -> {dst} {im.size}")
        except Exception as e:
            print(f"skip {src}: {e}")
