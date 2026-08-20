# Test Flight Videos

The "Test Flights" section on the Multi-Mission Competition Aircraft project
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

## Row layout

- Full rows of 3 videos are always equal width.
- A row with 2 leftover videos splits that row 50/50.
- A row with exactly 1 leftover video keeps it the same width as a normal
  column and centers it in the row.

## A note on file size

Video files are much larger than images. GitHub Pages doesn't set a hard
per-file limit the way some hosts do, but large videos make the repo slower
to clone/push and slower for visitors to load — consider compressing footage
(e.g. H.264 mp4, reasonable bitrate/resolution) before adding it here.
