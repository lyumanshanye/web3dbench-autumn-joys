# Northstar after-hours energy map

A static, local-only dashboard for exploring room-level electricity use in a
three-floor office. The 3D cutaway, room table, hourly charts, comparison view,
and CSV export all read from the same bundled sample dataset.

## Run locally

```bash
npm ci
python3 -m http.server 8080
```

Open `http://localhost:8080`. There is no build step and no building-management
service.

## Sample dataset

`data.js` contains the complete sample week:

- 8–14 November 2026 (UTC), 168 hourly intervals in every room.
- 12 rooms across 3 floors, each with a stable ID, name, floor, and area.
- Energy values in kWh; missing intervals are stored as `null`.
- Finance & Ops (`r-201`) has an unusual 02:00–05:00 spike on 14 November.
- Archive (`r-304`) has a four-hour gap on 13 November, 06:00–10:00.

The initial 48-hour range is positioned to include both the spike and the
missing-data run. Missing values are excluded from totals and visibly hatched in
the 3D model and chart; their summaries are labelled partial with the available
reading count.
