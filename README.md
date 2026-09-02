# ParcelLens

A vanilla HTML and JavaScript prototype for exploring Maryland parcels with two analysis entry points:

- **ADU feasibility** — starts with developed residential and town-house parcels in the current map view.
- **Tax model analyzer** — starts with parcels that have a positive appraised full value and have no exemption status.

The two choices are independent: jurisdictional geographies can be selected as geographic subsets, and either analysis can then be applied within a subset.

The app uses [Leaflet](https://leafletjs.com/) for the map and OpenStreetMap tiles. Parcel and jurisdiction boundaries are requested directly from the provided ArcGIS REST feature layer or a local shapefile in assets/ as GeoJSON.

## Current building blocks

- Map centered on Maryland at first load.
- Independent dropdowns for geographic subset and analysis type.
- Two-tier geography selection for General Assembly districts, U.S. congressional districts, counties, municipalities, and councilmanic/commissioner districts within counties.
- County council / commissioner districts from county-level services for Anne Arundel, Baltimore City, Baltimore County, Calvert, Carroll, Cecil, Charles, Dorchester, Frederick, Garrett, Harford, ==Howard==, Montgomery, Prince George's, Queen Anne's, Somerset, St. Mary's, Wicomico, and Worcester counties. Allegany, Caroline, Kent, and Talbot use their county boundaries from the statewide political-boundaries layer because their commissioners are elected at-large. (Howard County districts need to be verified; Washington County districts service has not been identified.)
- Selected statewide geography boundaries loaded from Maryland iMAP and highlighted on selection.
- Tool-specific query definitions in `app.js`.
- Limited metrics for ADU feasibility (basically n for total number of single-family homes).
- Compact tax metrics include land value, overall assessed value, land-to-total ratio, and estimated current county tax revenue.
- County, municipality, and county council / commissioner selections use the temporary `COUNTY_TAX_RATES` table in `app.js`, currently set to 1% for every Maryland county and Baltimore City.
- The tax model analyzer exposes hypothetical split-rate results for separate land and improvements inputs after parcel loading. The modeled result is calculated only after submission as the parcel-level sum of land value × land rate plus improvement value × improvement rate.
- After tax parcels load, the welcome panel provides an specific parcel subset viewer that highlight different ways to identify  underutilized properties. It cosmetically highlights non-exempt parcels that meet one of the following sets of underutilization criteria:
    - no improvements or vacant land, 
    - land value at least half of total assessed value, or land-dominant, 
    - high-value land-dominant parcels, where land value is at least $1 million, in urban areas, 
    - non-single-family parcels whose land-to-total ratio exceeds the developed single-family benchmark for the selected geography. 
All options inherit the tax filter's `EXCLASS IS NULL` exclusion.
- REST `query` requests constrained to the current map extent or selected geography. ==This needs to be verified. Current map view is not the desired method.==
- Selected-geography requests first retrieve matching object IDs, then fetch parcel geometry in batches to avoid the service's transfer limit. ==This needs to be verified, especially what is meant by "matching object IDs". Is it looking for a field in the parcels that matches the selected geography, or is it just grabbing unique object IDs that fall within the geography?==
- Parcel results are reduced to parcels whose calculated centers fall within the selected geography shape.
- GeoJSON parcel rendering with hover states and parcel detail popups. ==Consider other fields to include in the popups.==
- Loading, success, error, and request cancellation states.
- Responsive layout for smaller screens. ==This might not apply to every feature.==
- Acknowledgments

## Data service

Parcel source: Maryland iMAP, `PlanningCadastre/MD_ParcelBoundaries/MapServer/0`.

Geographic sources: Maryland iMAP's `Boundaries/MD_ElectionBoundaries` service provides 2022 U.S. congressional districts (layer 0) and Maryland legislative districts (layer 1). The `Boundaries/MD_PoliticalBoundaries` service provides county boundaries (layer 1, including Baltimore City) and detailed municipality boundaries (layer 5).

County council districts are not maintained as a single statewide layer in the state boundary services reviewed for this prototype. They vary by county, so the app combines several county-maintained services rather than implying that one statewide source exists.

The prototype now combines the verified local services into one county-district choice list. The local layers use different field names, so each source is normalized before it reaches the existing parcel-query code. Multipart boundaries, such as Frederick, Cecil, and Garrett, are grouped by district; Garrett's election-district layer is grouped using its `Comm_Dist` field. Queen Anne's and Somerset counties are provided as zipped shapefiles in `assets/districts/` and parsed in the browser with shpjs. Howard County is provided by the county's WFS endpoint using its `DISTRICT20` field. Allegany, Caroline, Kent, and Talbot are represented as one `At-large` choice each using the corresponding county shape from Maryland iMAP. The Wicomico service does not support paginated queries, so it is requested without a result-record limit. Howard and Washington remain pending authoritative district sources.

The statewide layer uses different fields from the former county service. The ADU starter filter uses `LU` values `R` (Residential) and `TH` (Town House), requires `SQFTSTRC > 0` as a developed-structure proxy, and excludes placeholder account IDs. The tax starter filter uses `NFMTTLVL > 0` (New Appraised Full Value), `EXCLASS IS NULL` (no exemption class), and the same account cleanup. This is a conservative exclusion because the layer does not provide a taxable-value or exemption-amount field. See the note on SDAT below.

The current queries are intentionally starter filters, not a zoning or tax determination. Official planning, zoning, assessment, and permitting sources should be added before using either tool for decisions. Ordinary map-envelope requests remain limited to 1,000 features; ==zooming in and refreshing gives a more focused result. Selected-geography requests page through matching object IDs so the full selected result can be loaded.== (The highlighted portion is AI-generated and should be verified.)

Note on SDAT: The SDAT Real Property Search terms prohibit automated or robotic collection, including data mining and web scraping. Therefore, this application does not scrape or collect detailed SDAT search results.

## Suggested next steps

Christopher's wish list:
1. Add a button to download results as-is or with key derived metrics like land:total ratio, mean sfh land:total, etc.
2. Enable Howard County Council districts (and Washington commissioner districts) in geographic subsets.
3. Customize the actual base tax rates by county so they are not all just 1%.
4. Optimize optimize optimize. Especially loading parcel geometries if possible.
5. Implement ADU analysis, like setback buffers, building footprints, parking spaces (if available), owner-occupied (if applicable), ADU already existing, and county-by-county regulations.

AI recommendations:
1. Confirm the authoritative ADU eligibility rules and map each rule to available GIS fields or additional services. ==See C's wish list #5==
2. Add a parcel search and selected-parcel workflow so analysis can be run on one property at a time. ==Low priority==
3. Add the assessment-year, tax-rate, exemption, and scenario inputs needed by the tax model. ==tax rate high priority (see C's wish list #3); others probably not, as the exemption factors are very specific to individual parcels and are not available programmatically or in batches==
4. Add a small backend proxy if deployment or the GIS service's CORS policy requires one. ==yes, especially if this applies to Howard County Council districts (see C's wish list #2)==
5. Add tests around query construction and data formatting before expanding the analysis logic. ==good idea==
