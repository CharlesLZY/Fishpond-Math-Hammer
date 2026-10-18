---
name: update-11e-maps
description: Safely update Warhammer 40,000 11e battleplan maps from a new Event Companion PDF. Use for PDF extraction, matchup/layout revision comparison, clean terrain maps, reference images, or map asset deployment.
---

# Update official 11e battleplan maps

## Locate the workspace

This skill lives in the Fishpond Mathhammer repository. The parent `Warhammer`
workspace contains `tools`, `WH40k-11e-terrain-layout`, and the source PDFs.
Run the Python commands below **from that parent workspace**, not from the app.
Read `tools\CLEAN_MAP_PIPELINE.md` for the full contract.

If the sibling tools or images are missing, request/restore the full workspace;
do not invent a replacement extraction pipeline from this repository alone.
The Python tools and PDF archive are not part of the app's Git repository.

Use Python 3.12 or newer. Try the existing interpreter first. Install dependencies
only on a missing-package failure, using
`python -m pip install -r tools\map_pipeline_requirements.txt`.

## Required invariants

- Use matchup identity (both dispositions, both missions, layout letter), not
  fixed PDF page numbers, to match old and new layouts.
- The baseline is `out\map-pipeline\current.json` and its SHA-256-addressed PDF
  archive. Never assume a filename ending in `latest.pdf` is the baseline.
- Compare unsymmetrized source terrain, objectives, deployment/territory lines,
  grid and annotations before deciding which outputs to replace.
- Preserve every selected terrain instance, including image IDs above `Im29`
  and clipped bases. Never segment/inpaint the raster to recover buildings.
- Keep whole terrain layers centrally symmetric. The known map 01 repair is
  identified by matchup and decoded component artwork, not `page 9` or `Im10`.
- Do not symmetrize objectives, deployments, reference images, or the PDF itself.
- Current output sizes: clean/source PNG 1420x1938; full page 2481x3508; clean
  WebP 880x1200; reference WebP 1408x1920. Preserve the 44x60-inch board crop.
- Never force uncertain pairings, loosen checks to make a run pass, or suppress
  new PDF structures. Inspect a failed page and add a focused regression first.
- An unchanged map must remain byte-identical, including map 01's earlier repair.

## 1. Check the existing release

```powershell
python tools\update_map_assets.py verify
git -C fishpond-mathhammer status --short
```

If a release state already exists, **do not reinitialize it to bypass mismatches**.
Resolve unexpected edits or missing files first.

For a workspace with no state, explicitly adopt an already verified current
release once:

```powershell
python tools\update_map_assets.py init --pdf "CURRENT-VERIFIED.pdf" --accept-existing
```

`init` validates dimensions, matchup/page mapping, source coverage and symmetry,
then records existing asset hashes. It does not prove arbitrary existing images
were generated from that PDF: only adopt a release whose provenance is known.
This workspace was initialized from the verified 2026-10-18 release.

## 2. Prepare an incoming PDF

```powershell
python tools\update_map_assets.py prepare --pdf "INCOMING.pdf"
```

Save the printed run directory. Preparation does not change live maps, manifests,
app configuration or the baseline. It archives the PDF, compares every layout,
validates all candidate terrain, renders only changed outputs, and creates:

- `comparison.json`: changed/unchanged matchup-layout entries and changed layers;
- `review_*.png`: current clean map / new annotated source / proposed clean map;
- `staged`: clean PNGs, annotated PNGs, full pages and both WebP variants;
- `plan.json`: checksums, generator/dependency versions, reviewed-file list and
  exact changes to apply.

Open **all** contact sheets. Confirm every building and base is present, whole
terrain pieces pair under a half-turn, and objectives/deployment boundaries
match the incoming PDF. Report the changed matchup/layout table to the user.
Do not treat a user's example of an unchanged layout as definitive evidence:
the 2026-10-18 Take And Hold mirror changed both B and C, not only B.

## 3. Apply the reviewed plan

```powershell
python tools\update_map_assets.py apply --run "PRINTED-RUN-DIRECTORY" --reviewed
python tools\update_map_assets.py verify
```

Only pass `--reviewed` after inspecting the sheets. The command checks baseline,
source, generator, dependency and staged-file hashes again. It updates both
WebP variants, moves manifest pages if necessary, bumps the image URL revision,
and advances the archived baseline. Annotation-only updates do not rewrite clean
maps. Unchanged maps retain their hashes. Reapplying a completed run is a no-op.

If a write fails, completed writes are rolled back. Backups stay under the run's
`backup` directory; failures are explicit. Never delete `current.json` or
`sources` as a recovery shortcut. A stale lock contains a PID: check whether that
specific process is alive before removing only that lock file.

If the generator or dependencies change after preparation, prepare a **new**
run and inspect it again. Do not reuse stale staged renders or edit plan hashes.

## 4. Validate the app

```powershell
python -m unittest discover -s tools -p "test_*.py" -v
Push-Location fishpond-mathhammer
npm test -- src\macro-battleplan\config\__tests__\battleplans11e.test.js
npm run build
git diff --check
git status --short
Pop-Location
```

Historical change-list tests use archived PDF hashes, not whichever file is
currently named `latest.pdf`. Every incoming PDF is validated by `prepare`.

## 5. Deploy only when requested

Never auto-commit or push as part of extraction. If the **current** user request
authorizes deployment, inspect the intended changes and remote branch, stage
only related files, commit with the required co-author trailer, and push
non-destructively. This app deploys `master` through Azure Static Web Apps.

Find the workflow run for the exact pushed commit with `gh run list --commit`,
wait with `gh run watch --exit-status`, and get the actual site URL from the
successful deployment output rather than inferring it from the workflow filename.
Finally verify all deployed image bytes:

```powershell
python tools\update_map_assets.py verify --live-url "https://DEPLOYED-SITE"
```

Only report "live" after the workflow succeeds and the live SHA-256 checks pass.
Summarize changed layouts, validation, and (if authorized) commit/deployment links.
