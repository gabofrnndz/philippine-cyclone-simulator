# Philippine Tropical Cyclone Simulator
**FICTIONAL SIMULATION — NOT AN ACTUAL PAGASA PRODUCT.**

A static, client-side browser sandbox (Leaflet + vanilla JS modules, no build step) with an endless, seeded cyclone world, PHT 12-hour clock, and a fully customizable cyclone identity system (local name, international name, local/international designations, simulation ID, name lists, template generators, display formats).

## Run
`python3 -m http.server` then open http://localhost:8000 (ES modules need a server). Deploy: push to `main`, enable Pages → GitHub Actions.

## Implemented
Clock/steps/speeds, endless mode, auto formation, identity system, steering/intensity/land decay, crude landfall detection, simulated TCWS, event log, God Mode, save/load/export.

## v0.2 added
120 h forecast track with uncertainty cone, per-city wind/rain/surge hazards, simulated TCWS and rainfall levels, LGU status, PDF bulletin.

## v0.3 maps
Basemap menu: OpenStreetMap, built-in simplified Philippines outline (offline), seeded fictional archipelago (random islands and cities), or upload your own GeoJSON (polygons = land, Points with `name`/`pop` = cities; WGS84 lon/lat). An image overlay (scanned or fictional map) can be placed by bounds for visual use only; landfall uses vector polygons. Changing the map clears active storms and moves the formation zone east of the map.

## v0.4 added
Fujiwhara-type interaction, moisture competition and mergers; rainfall accumulation driving flood and landslide risk per LGU (susceptibility is a placeholder); simulated port/airport/road closures and evacuation counts; fictional IR / water-vapor / visible satellite canvas (day/night aware); Chart.js wind and pressure history.
Barangay-level: no bundled data. Upload a GeoJSON of barangay Points (`name`, `pop`) and each becomes an LGU unit.

## Roadmap (from planning doc)
Real barangay dataset, real flood/landslide susceptibility data, emergency resource model.
