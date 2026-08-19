# Project Image Carousels

Each project card has 3 image slots (e.g. CAD Model / CFD Analysis / Flight Photo).
Each slot is a scrollable carousel that can hold as many photos as you want, with
the current image centered and the next/previous images peeking at the edges —
scroll, drag, swipe (mobile), or use the arrow buttons to move through them.

## Adding your photos

1. Drop image files into the matching folder, e.g. `assets/images/aircraft/cad/`.
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
| Multi-Mission Competition Aircraft | `aircraft/cad`, `aircraft/cfd`, `aircraft/photo` |
| Glider Deployment Mechanism | `glider/cad`, `glider/iteration`, `glider/print` |
| Autonomous Ambulance | `ambulance/flowchart`, `ambulance/circuitry`, `ambulance/vehicle` |
| Flood Disaster Model | `flood/cfd`, `flood/cad`, `flood/print` |
| HVAC Refrigerant Cycle Simulation | `hvac/diagram`, `hvac/cop`, `hvac/tewi` |
| Radial Heat Conduction (Micro-Turbine) | `turbine/comsol`, `turbine/temp`, `turbine/parametric` |
| CCGT Marine Propulsion | `ccgt/brayton`, `ccgt/rankine`, `ccgt/hrsg` |
