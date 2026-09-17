"""Generate circular-cropped favicon PNGs at common browser sizes from
fcr-scs.png. No SVG, no clip-path — just round PNGs browsers render cleanly.

Output:
  public/favicon.png        -> 32x32  (favicon)
  public/apple-touch-icon.png -> 180x180 (iOS home screen)
  public/icon-192.png       -> 192x192 (Android/manifest)
  public/icon-512.png       -> 512x512 (Android/manifest)
The source public/fcr-scs.png is left untouched.
"""
import os
from PIL import Image, ImageDraw

PUBLIC = os.path.join(os.path.dirname(__file__), "..", "presentation_layer", "public")
SRC = os.path.normpath(os.path.join(PUBLIC, "fcr-scs.png"))

# (output filename, side length in px)
TARGETS = [
    ("favicon.png", 64),            # browser tab favicon (64 is plenty sharp at retina tab size)
    ("apple-touch-icon.png", 180),
    ("icon-192.png", 192),
    ("icon-512.png", 512),
]


def circular_crop(src_img: Image.Image, size: int) -> Image.Image:
    """Resize to (size, size) and apply a circular alpha mask."""
    img = src_img.convert("RGBA")
    img = img.resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size, size), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def main() -> None:
    base = Image.open(SRC)
    print(f"loaded {SRC} mode={base.mode} size={base.size}")
    for name, size in TARGETS:
        out_path = os.path.normpath(os.path.join(PUBLIC, name))
        circular_crop(base, size).save(out_path, "PNG", optimize=True)
        kb = os.path.getsize(out_path) / 1024
        print(f"wrote {out_path} {size}x{size} ({kb:.1f} KB)")


if __name__ == "__main__":
    main()