# Northstar after-hours energy dashboard

Static, build-free dashboard for a sample three-floor office. It uses Three.js
0.160.1 from the local `node_modules` directory and custom SVG charts for the
energy views.

## Run locally

```bash
npm ci
python3 -m http.server 8000
```

Open `http://localhost:8000/`. No application server, API, or building-management
service is required.

## Bundled sample data

`js/data.js` deterministically generates seven days of hourly readings beginning
Monday, 3 November 2025 at 00:00 UTC. The dataset contains 12 rooms across three
floors, each with a stable ID, name, floor, floor area, and 168 hourly kWh
readings. Null readings represent missing intervals.

The default window is Thursday, 6 November 2025. The Finance Office has an
unusual 02:00–04:00 spike, while the Quiet Office has three missing readings
that same afternoon. The interface labels the data as sample data throughout.
