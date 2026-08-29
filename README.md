# ParcelLens

A vanilla HTML and JavaScript prototype for exploring Maryland parcels with two analysis entry points:

- **ADU feasibility** — starts with developed residential and town-house parcels in the current map view.
- **Tax model analyzer** — starts with parcels that have a positive appraised full value.

The app uses [Leaflet](https://leafletjs.com/) for the map and OpenStreetMap tiles. It does not use the Esri JavaScript SDK. Parcel boundaries are requested directly from the provided ArcGIS REST feature layer as GeoJSON.

## Run locally

Because the browser fetches parcel data from a remote service, use a local static server rather than opening `index.html` directly. For example, from this folder:

```text
npx serve .
```

Then open the local URL printed by the server. No build step or package installation is required; Leaflet is loaded from a CDN.

## Current building blocks

- Map centered on Maryland at first load.
- Minimal landing state with two prominent tool buttons.
- Tool-specific query definitions in `app.js`.
- REST `query` requests constrained to the current map extent.
- GeoJSON parcel rendering with hover states and parcel detail popups.
- Loading, success, error, and request cancellation states.
- Responsive layout for smaller screens.

## Data service

Parcel source: Maryland iMAP, `PlanningCadastre/MD_ParcelBoundaries/MapServer/0`.

The statewide layer uses different fields from the former county service. The ADU starter filter uses `LU` values `R` (Residential) and `TH` (Town House), requires `SQFTSTRC > 0` as a developed-structure proxy, and excludes placeholder account IDs. The tax starter filter uses `NFMTTLVL > 0` (New Appraised Full Value) and the same account cleanup.

The current queries are intentionally starter filters, not a zoning or tax determination. Official planning, zoning, assessment, and permitting sources should be added before using either tool for decisions. The service currently limits responses to 1,000 features per request in this prototype; zooming in and refreshing gives a more focused result.

## Suggested next steps

1. Confirm the authoritative ADU eligibility rules and map each rule to available GIS fields or additional services.
2. Add a parcel search and selected-parcel workflow so analysis can be run on one property at a time.
3. Add the assessment-year, tax-rate, exemption, and scenario inputs needed by the tax model.
4. Add a small backend proxy if deployment or the GIS service's CORS policy requires one.
5. Add tests around query construction and data formatting before expanding the analysis logic.
