"""
Post-processes assets/Jacob_Tenorio_Portfolio.pdf to shrink embedded images.

Chromium's print-to-PDF embeds each <img> at its full source resolution
regardless of how small it's actually displayed on the page -- the
portfolio carousel photos are optimized to ~1920px for the live site's
lightbox, but in the PDF each one is shown at roughly a third of a page
width. This walks every image in the PDF and downsamples/recompresses
any that are larger than needed, in place, without touching layout.

Called automatically by `npm run build:pdf` right after the PDF itself
is generated -- no need to run this on its own.
"""
import io
import sys

import fitz
from PIL import Image

PDF_PATH = r"C:\Users\jacob\Documents\portfolio-website\assets\Jacob_Tenorio_Portfolio.pdf"
MAX_DIM = 900
QUALITY = 78


def main():
    doc = fitz.open(PDF_PATH)
    before_total = 0
    after_total = 0
    seen = set()

    for page in doc:
        for img in page.get_images():
            xref = img[0]
            if xref in seen:
                continue
            seen.add(xref)

            info = doc.extract_image(xref)
            raw = info["image"]
            before_total += len(raw)

            im = Image.open(io.BytesIO(raw))
            w, h = im.size
            if max(w, h) <= MAX_DIM:
                after_total += len(raw)
                continue

            scale = MAX_DIM / max(w, h)
            im = im.convert("RGB").resize(
                (round(w * scale), round(h * scale)), Image.LANCZOS
            )
            buf = io.BytesIO()
            im.save(buf, "JPEG", quality=QUALITY, optimize=True)
            new_bytes = buf.getvalue()
            after_total += len(new_bytes)

            page.replace_image(xref, stream=new_bytes)

    doc.save(PDF_PATH + ".tmp", garbage=4, deflate=True)
    doc.close()

    import os
    os.replace(PDF_PATH + ".tmp", PDF_PATH)

    print(
        f"Compressed embedded images: {before_total/1024/1024:.1f}MB -> "
        f"{after_total/1024/1024:.1f}MB"
    )


if __name__ == "__main__":
    sys.exit(main())
