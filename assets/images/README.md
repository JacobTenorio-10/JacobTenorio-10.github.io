# Project Image Carousels

Each project card has 3 image slots — **what / how / result** — matching the
"What? / How? / Results" columns already on each project card. Each slot is a
scrollable carousel that can hold as many photos as you want, with the current
image centered and the next/previous images peeking at the edges — scroll,
drag, swipe (mobile), or use the arrow buttons to move through them.

## Folder naming standard

Every project's 3 category folders must be named exactly `what`, `how`, and
`result` (lowercase, no punctuation — `?` isn't valid in Windows folder names
or URL paths, so it's dropped from the directory name even though the on-page
text still reads "What?" / "How?" / "Results"). **Use this same naming for
any new project you add** — e.g. a new `assets/images/newproject/` folder
should contain `what/`, `how/`, and `result/` subfolders.

## Adding your photos

1. Drop image files into the matching folder, e.g. `assets/images/aircraft/what/`.
2. Name them so they sort in the order you want (`1.jpg`, `2.jpg`, ... `10.jpg`, ...).
   Supported formats: jpg, jpeg, png, webp, gif, avif.
3. Regenerate the manifest so the site picks them up:

   ```
   powershell -ExecutionPolicy Bypass -File assets/images/generate-manifests.ps1
   ```

4. Refresh the page. That's it — no HTML/JS edits needed.

If a folder has no images yet, that slot shows a placeholder (icon + label) so the
carousel is still visible and functional in the meantime.

## Folder → project mapping

| Project | Folders |
|---|---|
| Multi-Mission Competition Aircraft | `aircraft/what`, `aircraft/how`, `aircraft/result` |
| Glider Deployment Mechanism | `glider/what`, `glider/how`, `glider/result` |
| Autonomous Ambulance | `ambulance/what`, `ambulance/how`, `ambulance/result` |
| Flood Disaster Model | `flood/what`, `flood/how`, `flood/result` |
| HVAC Refrigerant Cycle Simulation | `hvac/what`, `hvac/how`, `hvac/result` |
| Radial Heat Conduction (Micro-Turbine) | `turbine/what`, `turbine/how`, `turbine/result` |
| CCGT Marine Propulsion | `ccgt/what`, `ccgt/how`, `ccgt/result` |
