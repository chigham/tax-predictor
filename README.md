# Parcel Analysis MD

The purpose of this web app is to help policy decision makers explore county-level property tax models and support housing and economic development decisions. This is important because current state law only allows counties to tax all parcels at the same rate, which applies to the total value. But splitting the tax rate between land and the improvements may be beneficial, particularly in counties with significant urban populations that struggle with housing scarsity. In this app, you can visualize underutilized parcels that would pay more of a fair share if land was taxed higher than improvements, see what county property taxing would look like with a split rate across several types of jurisdictions, and download reports that summarize the findings.

The **Tax model analyzer** suite focuses on parcels with a positive appraised full value and no exemption status. Select a jurisdictional geography to apply the tax analysis to that subset.

The app uses [Leaflet](https://leafletjs.com/) for the map and OpenStreetMap tiles. Parcel and jurisdiction boundaries are requested directly from the provided ArcGIS REST feature layer or a local shapefile in assets/ as GeoJSON.

## Current building blocks

- Map centered on Maryland at first load.
- A single "tax analysis" suite of capabilities, with geographic subset selection.
- Two-tier geography selection for General Assembly districts, U.S. congressional districts, counties, municipalities, and councilmanic/commissioner districts within counties.
- County council / commissioner districts from county-level services for Anne Arundel, Baltimore City, Baltimore County, Calvert, Carroll, Cecil, Charles, Dorchester, Frederick, Garrett, Harford, Howard, Montgomery, Prince George's, Queen Anne's, Somerset, St. Mary's, Wicomico, and Worcester counties. Allegany, Caroline, Kent, Talbot, and Washington use their county boundaries from the statewide political-boundaries layer because their commissioners are elected at-large.
- Selected statewide geography boundaries loaded from Maryland iMAP and highlighted on selection.
- A tax parcel query definition in `app.js`.
- Compact tax metrics include land value, overall assessed value, land-to-total ratio, and estimated current county tax revenue. Multi-county district selections also show the current-tax breakdown by county.
- Tax parcel popups include all existing parcel fields plus the applicable county or municipal rate, predicted current tax bill, and a hypothetical split-rate bill. Before a scenario is calculated, the hypothetical bill matches the predicted current bill; after calculation, it uses the entered land and improvement rates.
- The tax model analyzer provides summary statistics, detailed parcel info, and metadata download.
- County and municipality tax calculations use the temporary `COUNTY_TAX_RATES` table in `app.js`. Listed municipalities receive their municipality-specific rate; unlisted and unincorporated parcels use the county base rate. Split-rate scenarios use the user-entered rates uniformly across the selected parcels.
- The tax model analyzer exposes hypothetical split-rate results for separate land and improvements inputs after parcel loading. Smaller selections use the loaded parcel values; large server-rendered selections use geometry-free ArcGIS aggregate statistics. This resolves a critical memory error in the browser when trying to load all leaflet parcels for large geographies like PG County.
- After tax parcels load, the welcome panel provides an specific parcel subset viewer that highlight different ways to identify  underutilized properties. It cosmetically highlights non-exempt parcels that meet one of the following sets of underutilization criteria:
    - no improvements or vacant land, 
    - land value at least half of total assessed value, or land-dominant, 
    - high-value land-dominant parcels, where land value is at least $1 million, in urban areas, 
    - non-single-family parcels whose land-to-total ratio exceeds the developed single-family benchmark for the selected geography. 
All options inherit the tax filter's `EXCLASS IS NULL` exclusion.
- REST `query` requests constrained to the current map extent or selected geography.
- Selected-geography requests first retrieve parcel object IDs that spatially intersect the selected geography, then fetch parcel geometry in batches when an interactive layer is appropriate. Parcel centers are used for the final client-side inclusion check; no municipality field is assumed to match a geography selector.
- Parcel results are reduced to parcels whose calculated centers fall within the selected geography shape.
- GeoJSON parcel rendering with hover states and parcel detail popups for smaller selections.
- Server-rendered PNG parcel imagery for counties, U.S. congressional districts, and Baltimore City municipality selection. These large selections avoid retaining hundreds of thousands of Leaflet parcel layers; clicking the map lazily queries the parcel under the cursor to open the same popup structure without loading every geometry.
- Loading, success, error, and request cancellation states.
- Responsive layout for smaller screens. ==This might not apply to every feature.==
- Acknowledgments

## Data service

Parcel source: Maryland iMAP, `PlanningCadastre/MD_ParcelBoundaries/MapServer/0`.

Geographic sources: Maryland iMAP's `Boundaries/MD_ElectionBoundaries` service provides 2022 U.S. congressional districts (layer 0) and Maryland legislative districts (layer 1). The `Boundaries/MD_PoliticalBoundaries` service provides county boundaries (layer 1, including Baltimore City) and detailed municipality boundaries (layer 5).

County council districts are not maintained as a single statewide layer in the state boundary services reviewed for this prototype. They vary by county, so the app combines several county-maintained services rather than implying that one statewide source exists.

The prototype now combines the verified local services into one county-district choice list. The local layers use different field names, so each source is normalized before it reaches the existing parcel-query code. Multipart boundaries, such as Frederick, Cecil, and Garrett, are grouped by district; Garrett's election-district layer is grouped using its `Comm_Dist` field. Queen Anne's and Somerset counties are provided as zipped shapefiles in `assets/districts/` and parsed in the browser with shpjs. Howard County is provided by the county's WFS endpoint using its `DISTRICT20` field. Allegany, Caroline, Kent, Talbot, and Washington are represented as one `At-large` choice each using the corresponding county shape from Maryland iMAP. The Wicomico service does not support paginated queries, so it is requested without a result-record limit. Howard remains pending the implementation of an authoritative district source.

The tax starter filter uses `NFMTTLVL > 0` (New Appraised Full Value), `EXCLASS IS NULL` (no exemption class), and excludes placeholder account IDs. This is a conservative exclusion because the layer does not provide a taxable-value or exemption-amount field. See the note on SDAT below.

The current query is an intentionally conservative starter filter, not a comprehensive tax determination. Official assessment and finance sources should be added before using the analysis for decisions. Selected-geography requests can page through matching object IDs for interactive selections. Large county, congressional-district, and Baltimore City tax selections keep the calculations on the service and render the parcel outlines as a server-generated image instead of downloading every geometry.

Note on SDAT: The SDAT Real Property Search terms prohibit automated or robotic collection, including data mining and web scraping. Therefore, this application does not scrape or collect detailed SDAT search results.

## Suggested next steps

Christopher's wish list:
1. Add a button to download results as-is or with key derived metrics like land:total ratio, mean sfh land:total, etc. - In-progress
2. Enable Howard County Council districts in geographic subsets. - Done
3. Customize the actual base tax rates by county so they are not all just 1%. - Done
4. Optimize optimize optimize. Especially loading parcel geometries if possible. - Always in-progress
5. Implement ADU analysis, like setback buffers, building footprints, parking spaces (if available), owner-occupied (if applicable), ADU already existing, and county-by-county regulations. - Add this to a separate app

AI recommendations:
- 

## Run locally

From the project folder, use either option:

1. Start a local server:

    ```
    npx serve .
    ```

    Open the local URL shown in the terminal.

2. Open `index.html` directly in a browser.

The local server is recommended because some browser security settings may restrict requests to the remote GIS data services when the file is opened directly.
