# ParcelLens

A vanilla HTML and JavaScript prototype for exploring Maryland parcels with two analysis entry points:

- **ADU feasibility** — starts with developed residential and town-house parcels in the current map view.
- **Tax model analyzer** — starts with parcels that have a positive appraised full value.

The two choices are independent: a statewide geography can be selected as a geographic subset, and either analysis can then be applied within that subset.

The app uses [Leaflet](https://leafletjs.com/) for the map and OpenStreetMap tiles. It does not use the Esri JavaScript SDK. Parcel boundaries are requested directly from the provided ArcGIS REST feature layer as GeoJSON.

## Run locally

Because the browser fetches parcel data from a remote service, use a local static server rather than opening `index.html` directly. For example, from this folder:

```text
npx serve .
```

Then open the local URL printed by the server. No build step or package installation is required; Leaflet is loaded from a CDN.

## Current building blocks

- Map centered on Maryland at first load.
- Independent dropdowns for geographic subset and analysis type.
- Two-tier geography selection for General Assembly districts, U.S. congressional districts, counties, and municipalities.
- County council / commissioner districts from configured local ArcGIS services for Anne Arundel, Baltimore City, Baltimore County, Carroll, Cecil, Dorchester, Frederick, Harford, Montgomery, and Prince George's counties.
- Selected statewide geography boundaries loaded from Maryland iMAP and highlighted on selection.
- Tool-specific query definitions in `app.js`.
- REST `query` requests constrained to the current map extent or selected geography.
- Selected-geography requests first retrieve matching object IDs, then fetch parcel geometry in batches to avoid the service's transfer limit.
- Parcel results are reduced to parcels whose calculated centers fall within the selected geography shape.
- GeoJSON parcel rendering with hover states and parcel detail popups.
- Loading, success, error, and request cancellation states.
- Responsive layout for smaller screens.

## Data service

Parcel source: Maryland iMAP, `PlanningCadastre/MD_ParcelBoundaries/MapServer/0`.

Geographic sources: Maryland iMAP's `Boundaries/MD_ElectionBoundaries` service provides 2022 U.S. congressional districts (layer 0) and Maryland legislative districts (layer 1). The `Boundaries/MD_PoliticalBoundaries` service provides county boundaries (layer 1, including Baltimore City) and detailed municipality boundaries (layer 5).

County council districts are not maintained as a single statewide layer in the state boundary services reviewed for this prototype. They vary by county, so the app combines several county-maintained services rather than implying that one statewide source exists.

The prototype now combines the verified local services into one county-district choice list. The local layers use different field names, so each source is normalized before it reaches the existing parcel-query code. Multipart boundaries, such as Frederick and Cecil features, are grouped by district. Calvert, Caroline, Charles, Garrett, and Kent are not included yet because no specific authoritative service URL was available for them. The Howard WFS URL identified during research is a congressional-district layer, not a county council layer, so it is not used here. Montgomery's working endpoint is the ArcGIS REST path at `gis4.montgomerycountymd.gov/arcgis/rest/services/elections/council/FeatureServer/0`.

The statewide layer uses different fields from the former county service. The ADU starter filter uses `LU` values `R` (Residential) and `TH` (Town House), requires `SQFTSTRC > 0` as a developed-structure proxy, and excludes placeholder account IDs. The tax starter filter uses `NFMTTLVL > 0` (New Appraised Full Value), `EXCLASS IS NULL` (no exemption class), and the same account cleanup. This is a conservative exclusion because the layer does not provide a taxable-value or exemption-amount field. See the note on SDAT below.

The current queries are intentionally starter filters, not a zoning or tax determination. Official planning, zoning, assessment, and permitting sources should be added before using either tool for decisions. Ordinary map-envelope requests remain limited to 1,000 features; zooming in and refreshing gives a more focused result. Selected-geography requests page through matching object IDs so the full selected result can be loaded.

Note on SDAT: The SDAT Real Property Search terms prohibit automated or robotic collection, including data mining and web scraping. Therefore, this application does not scrape or collect detailed SDAT search results.

## Suggested next steps

1. Confirm the authoritative ADU eligibility rules and map each rule to available GIS fields or additional services.
2. Add a parcel search and selected-parcel workflow so analysis can be run on one property at a time.
3. Add the assessment-year, tax-rate, exemption, and scenario inputs needed by the tax model.
4. Add a small backend proxy if deployment or the GIS service's CORS policy requires one.
5. Add tests around query construction and data formatting before expanding the analysis logic.
