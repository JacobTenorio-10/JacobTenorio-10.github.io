# Testing Videos

The "Testing" section on the Multi-Mission Competition Aircraft project
card plays as many videos as you add, 3 per row. Videos autoplay (muted) and
loop as soon as the section scrolls into view, and pause when it scrolls out
of view.

## Adding videos

1. Drop video files into `assets/videos/aircraft/test-flights/`.
2. Name them so they sort in the order you want (`1.mp4`, `2.mp4`, ... `10.mp4`, ...).
   Supported formats: mp4, webm, mov, m4v, ogv. mp4 (H.264) is the safest bet
   for broad browser support.
3. Regenerate the manifest so the site picks them up:

   ```
   powershell -ExecutionPolicy Bypass -File assets/videos/generate-manifests.ps1
   ```

4. Refresh the page. That's it — no HTML/JS edits needed, and there's no
   limit on how many videos you add.

## Captions

Optional captions shown under each video live in `assets/videos/captions.js`,
keyed by folder path and then filename. This file is hand-maintained and
never touched by `generate-manifests.ps1`, so edits persist across manifest
regeneration. A video with no entry there just shows no caption.

## Row layout

- Full rows of 3 videos are always equal width.
- A row with 2 leftover videos splits that row 50/50.
- A row with exactly 1 leftover video keeps it the same width as a normal
  column and centers it in the row.

## A note on file size

Video files are much larger than images. GitHub enforces a **hard 100MB
per-file limit** — a push containing a larger file is rejected outright. Keep
an eye on file size before adding footage (e.g. re-encode with `ffmpeg` at a
lower bitrate, roughly 5 Mbps is plenty for 1080p30 and keeps a ~70s clip
around 40-50MB). Even well under that limit, large videos make the repo
slower to clone/push and slower for visitors to load.
