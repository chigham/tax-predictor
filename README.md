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
- County and municipality tax calculations use the `COUNTY_TAX_RATES` table in `app.js`. Every rate was verified against the [Maryland SDAT 2026–2027 tax rate table](https://dat.maryland.gov/SiteAssets/Pages/Tax-Rates/Tax%20Rates%202026-2027%20-%20Tax%20Table%20%26%20Homestead%20Credit%20Caps_July%202026_0726-A.pdf) (updated July 2026). Montgomery County adds the countywide MCPS-designated rate ([2026 Real Property Tax Rate Schedule](https://assets.montgomerycountymd.gov/files/2026-06/2026%20Real%20PropertyTax%20Rate%20Schedule.pdf)) to its base rate, and St. Mary's County adds its countywide fire and supplemental services rates ([Real Estate Tax Rates](https://www.stmaryscountymd.gov/docs/REALESTATETAXRATES.pdf)). The source is cited next to current tax, in parcel popups, in the methodology, and in every export. Listed municipalities receive their municipality-specific rate; unlisted and unincorporated parcels use the county base rate. Split-rate scenarios use the user-entered rates uniformly across the selected parcels.
- The tax model analyzer exposes hypothetical split-rate results for separate land and improvements inputs. All totals, including split-rate scenarios, come from geometry-free ArcGIS statistics on the parcel points layer, so no geography requires downloading every parcel.
- An **Advanced** section in the split-rate scenario sets where split rates apply: everywhere (default), only within 2020 Census urban areas, or everywhere except farm, marsh, and managed forest land (`LU` `A`/`MA`, or `FCMACODE` set). Land use is used instead of zoning because zoning codes differ by county and Maryland assesses farmland by use. Excluded accounts keep their current rate; revenue-neutral presets balance only the covered accounts. Urban coverage for a selection is clipped by the iMAP geometry service (`Utilities/Geometry/GeometryServer/intersect`). The setting carries across selections and is reported in popups, the summary, and the parcel CSV (`SPLIT_RATES_APPLY`).
- After tax parcels load, the welcome panel's **Color parcels by** dropdown sets how parcel shapes are colored (zoom 14 and closer), with a matching legend at the bottom center of the map:
    - **Bill change** (default): blue when the hypothetical split-rate bill is lower, red when higher. When the Advanced setting is not "Everywhere", shapes whose accounts all keep their current rate get a dashed gray outline.
    - **Underutilized parcels**: shows a second dropdown and definitions. It cosmetically highlights non-exempt parcels that meet one of the following sets of underutilization criteria (shapes that keep their current rate under the Advanced setting get a dashed outline):
        - no improvements or vacant land, 
        - land value at least half of total assessed value, or land-dominant, 
        - high-value land-dominant parcels, where land value is at least $1 million, in urban areas, 
        - non-single-family parcels whose land-to-total ratio exceeds the single-family benchmark for the selected geography. 
    - **Land value per acre**: the combined land assessment of a shape's accounts divided by its GIS acreage (`POLYACRES`), less any shapes nested inside it. Colors are 7 percentile groups (viridis ramp) computed in one server statistics request on the parcel boundaries layer for the whole selection. Farm, marsh, and managed forest land (the Advanced exclusion rule) gets its own color and is left out of the percentiles because it is assessed at use value. Popups and the parcel CSV (`PARCEL_POLYGON_ACRES`, `LAND_VALUE_PER_ACRE`) report the same measure.
    - **No coloring**: plain tan parcels.
All options inherit the tax filter's `EXCLASS IS NULL` exclusion.
- Single-family home (SFH) benchmark: `LU = 'R'`, `SQFTSTRC > 0`, and `DESCBLDG` is `DWEL Standard Unit`, `DWEL Split Level` or `DWEL Split Foyer`. Row/townhouses (`Center Unit`/`End Unit`), condos and mobile homes are excluded. Count, mean and median land-to-total ratios are computed in one server statistics request.
- Parcel membership is based on tax account points (one per account, condo units included). Counties match on `JURSCODE`, and municipalities match on the town (`TOWNCODE`/`DESCTOWN`, with a few name aliases; Baltimore City uses `JURSCODE = 'BACI'`). Districts include each account whose point falls inside the district, so every account counts in exactly one district. The same rule drives totals, popups and exports.
- Parcel map: zoomed out, the parcel map service renders a PNG image; clicking it queries the accounts under the cursor. At zoom 17 and closer, the shapes in view are drawn as vectors. Each account point is attached to the smallest shape containing it, so stacked condo units share one shape and the popup lists every taxable account there. Shapes with no taxable account are hidden; account points with no shape are drawn as small open circles.
- Loading, success, error, and request cancellation states.
- Responsive layout for smaller screens. ==This might not apply to every feature.==
- Acknowledgments

## Data service

Analysis source: Maryland iMAP parcel points, `PlanningCadastre/MD_PropertyData/MapServer/0` (one point per tax account). Display shapes: `PlanningCadastre/MD_ParcelBoundaries/MapServer/0`.

Geographic sources: Maryland iMAP's `Boundaries/MD_ElectionBoundaries` service provides 2022 U.S. congressional districts (layer 0) and Maryland legislative districts (layer 1). The `Boundaries/MD_PoliticalBoundaries` service provides county boundaries (layer 1, including Baltimore City) and detailed municipality boundaries (layer 5).

County council districts are not maintained as a single statewide layer in the state boundary services reviewed for this prototype. They vary by county, so the app combines several county-maintained services rather than implying that one statewide source exists.

The prototype now combines the verified local services into one county-district choice list. The local layers use different field names, so each source is normalized before it reaches the existing parcel-query code. Multipart boundaries, such as Frederick, Cecil, and Garrett, are grouped by district; Garrett's election-district layer is grouped using its `Comm_Dist` field. Queen Anne's and Somerset counties are provided as zipped shapefiles in `assets/districts/` and parsed in the browser with shpjs. Howard County is provided by the county's WFS endpoint using its `DISTRICT20` field. Allegany, Caroline, Kent, Talbot, and Washington are represented as one `At-large` choice each using the corresponding county shape from Maryland iMAP. The Wicomico service does not support paginated queries, so it is requested without a result-record limit. Howard remains pending the implementation of an authoritative district source.

Analysis includes accounts with `NFMTTLVL > 0`, `EXCLASS IS NULL`, and non-placeholder account IDs. Account points drive calculations and popups. Since one shape can represent multiple accounts, a vector shape is shown when it contains at least one included account point; shapes are filtered only by placeholder IDs. The source lacks taxable-value and exemption-amount fields, so this is an approximation (see the SDAT note below).

The current query is an intentionally conservative starter filter, not a comprehensive tax determination. Official assessment and finance sources should be added before using the analysis for decisions. Selected-geography requests can page through matching object IDs for interactive selections. Large county, congressional-district, and Baltimore City tax selections keep the calculations on the service and render the parcel outlines as a server-generated image instead of downloading every geometry.

Note on SDAT: The SDAT Real Property Search terms prohibit automated or robotic collection, including data mining and web scraping. Therefore, this application does not scrape or collect detailed SDAT search results.

## Suggested next steps

Christopher's wish list:
1. Optimize optimize optimize. Especially loading parcel geometries if possible. - Always in-progress
2. Make sure underutilized selection follows the same logic as parcel selection for different geographies.
3. Refine landing page and how-analysis-works popup text.
4. Add an advanced feature, where they can apply the changes only to: 1. urban areas, 2. municipalities, or 3. exclude agriculture. - Urban areas and agriculture exclusion done; municipalities remaining.
5. Implement ADU analysis, like setback buffers, building footprints, parking spaces (if available), owner-occupied (if applicable), ADU already existing, and county-by-county regulations. - Add this to a separate app


## CURRENT BUGS

1. 2 of the services for county council districts may be broken (dorchester and charles).

## Run locally

From the project folder, use either option:

1. Start a local server:

    ```
    npx serve .
    ```

    Open the local URL shown in the terminal.

2. Open `index.html` directly in a browser.

The local server is recommended because some browser security settings may restrict requests to the remote GIS data services when the file is opened directly.
