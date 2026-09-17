"""
Resizes and compresses every photo in the what/how/result carousel folders
for web use. Run this any time after adding new photos.

Camera photos and screenshots are often 3000-4000px wide and several MB
each -- way more than needed for a ~350-450px carousel box or even the
full-screen lightbox. This caps every image at 1920px on its longest side
and re-encodes it as JPEG at quality 82, which in practice cuts file sizes
by 70-90% with no visible quality loss at display size.

Usage:
    python assets/images/optimize-images.py

Safe to re-run: already-optimized JPEGs just get resized/recompressed
again (a no-op resize if already <=1920px, with only trivial additional
generational JPEG loss). PNGs are converted to JPEG and the original PNG
is removed -- run generate-manifests.ps1 afterward to pick up the new
filenames.
"""
import os
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)))
MAX_DIM = 1920
QUALITY = 82


def main():
    changed = []
    for dirpath, _dirnames, filenames in os.walk(ROOT):
        if os.path.basename(dirpath) not in ('what', 'how', 'result'):
            continue
        for fname in sorted(filenames):
            ext = os.path.splitext(fname)[1].lower()
            if ext not in ('.jpg', '.jpeg', '.png', '.webp'):
                continue
            src_path = os.path.join(dirpath, fname)
            orig_size = os.path.getsize(src_path)
            im = Image.open(src_path)
            w, h = im.size

            if im.mode in ('RGBA', 'LA', 'P'):
                im = im.convert('RGBA')
                bg = Image.new('RGB', im.size, (10, 14, 26))
                bg.paste(im, mask=im.split()[-1])
                im = bg
            else:
                im = im.convert('RGB')

            if max(w, h) > MAX_DIM:
                scale = MAX_DIM / max(w, h)
                im = im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)

            new_path = os.path.join(dirpath, os.path.splitext(fname)[0] + '.jpg')
            im.save(new_path, 'JPEG', quality=QUALITY, optimize=True)
            new_size = os.path.getsize(new_path)
            if os.path.abspath(new_path) != os.path.abspath(src_path):
                os.remove(src_path)
            changed.append((src_path, orig_size, new_size))

    if not changed:
        print("No images found in any what/how/result folder.")
        return

    before = sum(c[1] for c in changed)
    after = sum(c[2] for c in changed)
    print(f"Processed {len(changed)} images")
    print(f"Before: {before/1024/1024:.2f} MB")
    print(f"After:  {after/1024/1024:.2f} MB")
    if before:
        print(f"Saved:  {(before-after)/1024/1024:.2f} MB ({100*(1-after/before):.0f}%)")


if __name__ == '__main__':
    main()
