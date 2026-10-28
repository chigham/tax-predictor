const PARCEL_LAYER_URL =
  "https://mdgeodata.md.gov/imap/rest/services/PlanningCadastre/MD_ParcelBoundaries/MapServer/0";
const PARCEL_MAP_SERVICE_URL = PARCEL_LAYER_URL.replace(/\/0$/, "");
const STATE_CENTER = [39.2, -76.7];
const STATE_ZOOM = 8;
const VECTOR_MIN_ZOOM = 14;
const MAX_PARCELS_PER_REQUEST = 1000;
const PARCEL_OUT_FIELDS =
  "OBJECTID,ACCTID,ADDRESS,STRTNUM,STRTDIR,STRTNAM,STRTTYP,STRTSFX,STRTUNT,CITY,ZIPCODE,DESCLU,LU,ACRES,SQFTSTRC,YEARBLT,NFMTTLVL,NFMLNDVL,NFMIMPVL,ZONING,BLDG_UNITS,OOI,JURSCODE,TOWNCODE,DESCTOWN,DESCBLDG";
const PARCEL_POINTS_LAYER_URL =
  "https://mdgeodata.md.gov/imap/rest/services/PlanningCadastre/MD_PropertyData/MapServer/0";
// Shapes carry only one account's attributes, so they are not filtered by value, exemption, or town.
// A shape renders when at least one qualifying account point falls inside it.
// Shapes without an account (e.g. condominium complex outlines) are kept so their unit points have a container.
const PARCEL_SHAPE_WHERE = "ACCTID IS NULL OR ACCTID NOT IN ('ROW', 'UNK', 'GCE')";
const SFH_BUILDING_TYPES = ["DWEL Standard Unit", "DWEL Split Level", "DWEL Split Foyer"];
const SFH_WHERE = `LU = 'R' AND SQFTSTRC > 0 AND DESCBLDG IN (${SFH_BUILDING_TYPES.map((type) => `'${type}'`).join(", ")})`;
const TOWNHOUSE_BUILDING_TYPES = ["DWEL Center Unit", "DWEL End Unit"];
const AGRICULTURAL_LAND_USES = ["A", "MA"];
const COMMERCIAL_LAND_USES = ["C", "CC", "CA", "EC"];
const INDUSTRIAL_LAND_USES = ["I"];
const MIXED_USE_LAND_USES = ["CR", "RC"];
const COMMERCIAL_RELATED_LAND_USES = [
  ...COMMERCIAL_LAND_USES,
  ...INDUSTRIAL_LAND_USES,
  ...MIXED_USE_LAND_USES,
];
const sqlList = (values) => values.map((value) => `'${value}'`).join(", ");
const NOT_AGRICULTURAL_WHERE = `(LU IS NULL OR LU NOT IN (${sqlList(AGRICULTURAL_LAND_USES)}))`;
const IMPROVED_WHERE = `${NOT_AGRICULTURAL_WHERE} AND NFMIMPVL > 0`;
// Report property types. Each account belongs to exactly one type: the first whose rule matches.
// `where` (server statistics) and `matches` (parcel CSV) must describe the same rule.
const PROPERTY_TYPES = [
  {
    key: "agricultural",
    label: "Agricultural",
    definition: "Land use Agricultural or Marsh Land, with or without buildings.",
    where: `LU IN (${sqlList(AGRICULTURAL_LAND_USES)})`,
    matches: ({ lu }) => AGRICULTURAL_LAND_USES.includes(lu),
  },
  {
    key: "vacant",
    label: "Vacant / unimproved land",
    definition: "Any other land use with no assessed improvement value (blank or $0).",
    where: `${NOT_AGRICULTURAL_WHERE} AND (NFMIMPVL IS NULL OR NFMIMPVL = 0)`,
    matches: ({ improved }) => !improved,
  },
  {
    key: "sfh",
    label: "Single-family homes",
    definition: `Improved residential accounts that meet the SFH benchmark rule: structure square footage > 0 and building type ${SFH_BUILDING_TYPES.join(", ")}.`,
    where: `${IMPROVED_WHERE} AND ${SFH_WHERE}`,
    matches: ({ properties }) => isSingleFamilyParcel(properties),
  },
  {
    key: "townhouse",
    label: "Townhouses / rowhouses",
    definition: `Improved accounts with land use Town House, or residential with building type ${TOWNHOUSE_BUILDING_TYPES.join(", ")}.`,
    where: `${IMPROVED_WHERE} AND (LU = 'TH' OR (LU = 'R' AND DESCBLDG IN (${sqlList(TOWNHOUSE_BUILDING_TYPES)})))`,
    matches: ({ lu, properties }) => lu === "TH" || (lu === "R" && TOWNHOUSE_BUILDING_TYPES.includes(properties.DESCBLDG)),
  },
  {
    key: "condo",
    label: "Condominiums",
    definition: "Improved accounts with land use Residential Condominium (each unit is its own account).",
    where: `${IMPROVED_WHERE} AND LU = 'U'`,
    matches: ({ lu }) => lu === "U",
  },
  {
    key: "otherResidential",
    label: "Other residential",
    definition: "Remaining improved residential accounts, such as mobile homes, rental dwellings, and accounts with no building type.",
    where: `${IMPROVED_WHERE} AND LU = 'R' AND (DESCBLDG IS NULL OR DESCBLDG NOT IN (${sqlList([...SFH_BUILDING_TYPES, ...TOWNHOUSE_BUILDING_TYPES])}) OR (DESCBLDG IN (${sqlList(SFH_BUILDING_TYPES)}) AND (SQFTSTRC IS NULL OR SQFTSTRC <= 0)))`,
    matches: ({ lu }) => lu === "R",
  },
  {
    key: "apartments",
    label: "Apartments",
    definition: "Improved accounts with land use Apartments.",
    where: `${IMPROVED_WHERE} AND LU = 'M'`,
    matches: ({ lu }) => lu === "M",
  },
  {
    key: "commercial",
    label: "Commercial",
    definition: "Improved accounts with land use Commercial, Commercial Condominium, Country Club, or Exempt Commercial.",
    where: `${IMPROVED_WHERE} AND LU IN (${sqlList(COMMERCIAL_LAND_USES)})`,
    matches: ({ lu }) => COMMERCIAL_LAND_USES.includes(lu),
  },
  {
    key: "mixedUse",
    label: "Mixed use",
    definition: "Improved accounts with land use Commercial/Residential or Residential/Commercial.",
    where: `${IMPROVED_WHERE} AND LU IN (${sqlList(MIXED_USE_LAND_USES)})`,
    matches: ({ lu }) => MIXED_USE_LAND_USES.includes(lu),
  },
  {
    key: "industrial",
    label: "Industrial",
    definition: "Improved accounts with land use Industrial.",
    where: `${IMPROVED_WHERE} AND LU IN (${sqlList(INDUSTRIAL_LAND_USES)})`,
    matches: ({ lu }) => INDUSTRIAL_LAND_USES.includes(lu),
  },
  {
    key: "other",
    label: "Other",
    definition: "Remaining improved accounts, mostly land use Exempt without an exemption class.",
    where: `${IMPROVED_WHERE} AND (LU IS NULL OR LU NOT IN (${sqlList(["R", "TH", "U", "M", ...COMMERCIAL_RELATED_LAND_USES])}))`,
    matches: () => true,
  },
];
const OCCUPANCY_GROUPS = [
  { key: "H", label: "Owner-occupied (code H)" },
  { key: "N", label: "Not owner-occupied (code N)" },
  { key: "D", label: "Other occupancy code (D)" },
  { key: "", label: "Not reported" },
];
// Land-share distributions are requested as counts at 5-point bands (0%, 5%, … 95%, below 100%).
const LAND_SHARE_BANDS = 20;
// Bills that change by less than this fraction either way count as "about the same".
const ABOUT_THE_SAME_THRESHOLD = 0.01;
const COUNTY_TAX_RATES = {
  "Allegany County": {"base": 0.00975, "municipalities":{"Barton": 0.009133, "Cumberland": 0.008195, "Frostburg": 0.00861, "Lonaconing": 0.008756, "Luke": 0.008752, "Midland": 0.009133, "Westernport": 0.009133}},  // varies by municipality
  "Anne Arundel County": {"base": 0.00968, "municipalities":{"Annapolis": 0.00577, "Highland Beach": 0.00938}},  // varies by municipality
  "Baltimore City": {"base": 0.02248, "municipalities":{}},
  "Baltimore County": {"base": 0.011, "municipalities":{}},
  "Calvert County": {"base": 0.00967, "municipalities":{"Chesapeake Beach": 0.00605, "North Beach": 0.00605}},  // 0.00605 in municipalities
  "Caroline County": {"base": 0.0096, "municipalities":{"Denton": 0.009, "Federalsburg": 0.0088, "Greensboro": 0.009, "Preston": 0.0095, "Ridgely": 0.0091}},  // varies by municipality
  "Carroll County": {"base": 0.01018, "municipalities":{}},
  "Cecil County": {"base": 0.009724, "municipalities":{}},
  "Charles County": {"base": 0.01141, "municipalities":{"Indian Head": 0.01112, "La Plata": 0.01023}},  // varies by municipality
  "Dorchester County": {"base": 0.0103, "municipalities":{"Cambridge": 0.009567, "Hurlock": 0.009479}},  // varies in two municipalities
  "Frederick County": {"base": 0.0111, "municipalities":{"Frederick": 0.010125, "Myersville": 0.009666}},  // varies in two municipalities
  "Garrett County": {"base": 0.01, "municipalities":{"Mountain Lake Park": 0.009476}},  // varies in one municipality
  "Harford County": {"base": 0.009779, "municipalities":{"Aberdeen": 0.008413, "Bel Air": 0.008413, "Havre de Grace": 0.008413}},  // 0.008413 in municipalities
  "Howard County": {"base": 0.01044, "municipalities":{}},
  "Kent County": {"base": 0.01022, "municipalities":{}},
  "Montgomery County": {"base": 0.007176, "municipalities":{}},  // 0.6706% (base rate) + 0.047% (MCPS-designated)
  "Prince George's County": {"base": 0.01, "municipalities":{"Berwyn Heights": 0.00867, "Bladensburg": 0.00875, "Bowie": 0.00878, "Brentwood": 0.00919, "Capitol Heights": 0.00908, "Cheverly": 0.00902, "College Park": 0.00968, "Colmar Manor": 0.00903, "Cottage City": 0.00929, "District Heights": 0.00923, "Eagle Harbor": 0.00999, "Edmonston": 0.00908, "Fairmount Heights": 0.00937, "Forest Heights": 0.00893, "Glenarden": 0.00892, "Greenbelt": 0.00875, "Hyattsville": 0.00884, "Landover Hills": 0.00907, "Laurel": 0.00867, "Morningside": 0.00909, "Mount Rainier": 0.00879, "New Carrollton": 0.00886, "North Brentwood": 0.0098, "Riverdale Park": 0.00882, "Seat Pleasant": 0.00885, "University Park": 0.00881, "Upper Marlboro": 0.0093}},  // varies by municipality
  "Queen Anne's County": {"base": 0.008, "municipalities":{"Centreville": 0.0067, "Millington": 0.00715}},  // varies in two municipalities
  "Somerset County": {"base": 0.01, "municipalities":{}},
  "St. Mary's County": {"base": 0.009278, "municipalities":{}},  // 0.8478% (base rate) + 0.056% (fire) + 0.024% (supplemental services)
  "Talbot County": {"base": 0.00818, "municipalities":{"Easton": 0.00685, "Oxford": 0.007, "Queen Anne": 0.007579, "St. Michaels": 0.00691, "Trappe": 0.0072}},  // varies by municipality
  "Washington County": {"base": 0.00928, "municipalities":{"Boonsboro": 0.00803, "Clear Spring": 0.00803, "Funkstown": 0.00803, "Hagerstown": 0.00803, "Hancock": 0.00803, "Keedysville": 0.00803, "Sharpsburg": 0.00803, "Smithsburg": 0.00803, "Williamsport": 0.00803}},  // 0.00803 in municipalities
  "Wicomico County": {"base": 0.007799, "municipalities":{}},
  "Worcester County": {"base": 0.00815, "municipalities":{}},
};
const COUNTY_BY_JURISDICTION = {
  ALLE: "Allegany County",
  ANNE: "Anne Arundel County",
  BACI: "Baltimore City",
  BACO: "Baltimore County",
  CALV: "Calvert County",
  CARO: "Caroline County",
  CARR: "Carroll County",
  CECI: "Cecil County",
  CHAR: "Charles County",
  DORC: "Dorchester County",
  FRED: "Frederick County",
  GARR: "Garrett County",
  HARF: "Harford County",
  HOWA: "Howard County",
  KENT: "Kent County",
  MONT: "Montgomery County",
  PRIN: "Prince George's County",
  QUEE: "Queen Anne's County",
  SOME: "Somerset County",
  STMA: "St. Mary's County",
  TALB: "Talbot County",
  WASH: "Washington County",
  WICO: "Wicomico County",
  WORC: "Worcester County",
};
const COUNTY_BOUNDARY_SERVICE_URL =
  "https://mdgeodata.md.gov/imap/rest/services/Boundaries/MD_PoliticalBoundaries/FeatureServer/1";

const GEOGRAPHY_CONFIG = {
  assembly: {
    label: "Maryland General Assembly districts",
    choiceLabel: "District",
    serviceUrl: "https://mdgeodata.md.gov/imap/rest/services/Boundaries/MD_ElectionBoundaries/FeatureServer/1",
    valueField: "DISTRICT",
    formatChoice: (value) => `MD - ${value}`,
  },
  congressional: {
    label: "U.S. congressional districts",
    choiceLabel: "District",
    serviceUrl: "https://mdgeodata.md.gov/imap/rest/services/Boundaries/MD_ElectionBoundaries/FeatureServer/0",
    valueField: "DISTRICT",
    formatChoice: (value) => `U.S. - ${value}`,
  },
  county: {
    label: "Counties",
    choiceLabel: "County",
    serviceUrl: COUNTY_BOUNDARY_SERVICE_URL,
    valueField: "COUNTY",
    formatChoice: (value) => value,
  },
  municipality: {
    label: "Municipalities",
    choiceLabel: "Municipality",
    serviceUrl: "https://mdgeodata.md.gov/imap/rest/services/Boundaries/MD_PoliticalBoundaries/FeatureServer/5",
    valueField: "MUN_NAME",
    formatChoice: formatMunicipalityName,
  },
  countyCouncil: {
    label: "County council / commissioner districts",
    choiceLabel: "county district",
    valueField: "GEOGRAPHY_LABEL",
    formatChoice: (value) => value,
    sources: [
      {
        county: "Allegany County",
        serviceUrl: COUNTY_BOUNDARY_SERVICE_URL,
        where: "COUNTY = 'Allegany'",
        valueField: "COUNTY",
        outFields: "COUNTY",
        formatChoice: () => "At-large",
      },
      {
        county: "Anne Arundel County",
        serviceUrl: "https://gis.aacounty.org/arcgis/rest/services/OpenData/Political_OpenData/MapServer/4",
        valueField: "CNCLDIST",
        outFields: "CNCLDIST,COUNCILS",
        formatChoice: (properties) => `${properties.CNCLDIST}${properties.COUNCILS ? ` (${properties.COUNCILS})` : ""}`,
      },
      {
        county: "Baltimore City",
        serviceUrl: "https://services1.arcgis.com/UWYHeuuJISiGmgXx/arcgis/rest/services/Baltimore_City_Council_District/FeatureServer/80",
        valueField: "AREA_NAME",
        outFields: "AREA_NAME",
      },
      {
        county: "Baltimore County",
        serviceUrl: "https://bcgis.baltimorecountymd.gov/arcgis/rest/services/Apps/MyNeighborhood/MapServer/13",
        valueField: "COUNCILMANIC_DISTRICTS",
        outFields: "COUNCILMANIC_DISTRICTS",
      },
      {
        county: "Calvert County",
        serviceUrl: "https://services2.arcgis.com/svdkKIzwWblQ8cKK/arcgis/rest/services/Local_Election_Districts/FeatureServer/281",
        valueField: "DISTRICT",
        outFields: "DISTRICT",
        formatChoice: (properties) => `District ${properties.DISTRICT}`,
      },
      {
        county: "Carroll County",
        serviceUrl: "https://services.arcgis.com/Uf0DiYpD9NOFO5YH/ArcGIS/rest/services/CommissionerDistricts/FeatureServer/0",
        valueField: "COMMDIST",
        outFields: "COMMDIST",
        formatChoice: (properties) => `District ${properties.COMMDIST}`,
      },
      {
        county: "Cecil County",
        serviceUrl: "https://cecilmaps.org/arcgis/rest/services/Hosted/Ceci_lCounty_Council_Districts_(effective_Feb_11_2022)/FeatureServer/0",
        valueField: "comm_distr",
        outFields: "comm_distr,district",
      },
      {
        county: "Caroline County",
        serviceUrl: COUNTY_BOUNDARY_SERVICE_URL,
        where: "COUNTY = 'Caroline'",
        valueField: "COUNTY",
        outFields: "COUNTY",
        formatChoice: () => "At-large",
      },
      {
        county: "Dorchester County",
        serviceUrl: "https://services7.arcgis.com/yqhlYKSnzjiOzQig/ArcGIS/rest/services/Council_District_Draft4/FeatureServer/0",
        valueField: "DIST_NAME",
        outFields: "DIST_NAME,DISTRICT",
      },
      {
        county: "Frederick County",
        serviceUrl: "https://fcgis.frederickcountymd.gov/server_pub/rest/services/Elections/Elections/MapServer/8",
        valueField: "COUNCIL_DIST",
        outFields: "COUNCIL_DIST",
        formatChoice: (properties) => `District ${properties.COUNCIL_DIST}`,
      },
      {
        county: "Garrett County",
        serviceUrl: "https://services3.arcgis.com/Hj3vC5lmzqLyRabS/ArcGIS/rest/services/Board_of_Elections/FeatureServer/0",
        valueField: "Comm_Dist",
        outFields: "Comm_Dist",
        formatChoice: (properties) => `District ${properties.Comm_Dist}`,
      },
      {
        county: "Harford County",
        serviceUrl: "https://services.arcgis.com/q8r0H9SbF6PzNpYE/ArcGIS/rest/services/2025_Harford_County_Election_Files_gdb/FeatureServer/2",
        valueField: "DISTRICT",
        outFields: "DISTRICT",
        formatChoice: (properties) => `District ${properties.DISTRICT}`,
      },
      {
        county: "Montgomery County",
        serviceUrl: "https://geohub.montgomerycountymd.gov/mapping1/rest/services/Boundaries/Council_Districts_slim/FeatureServer/0",
        valueField: "COUNCIL",
        outFields: "COUNCIL",
        formatChoice: (properties) => `District ${properties.COUNCIL}`,
      },
      {
        county: "Howard County",
        queryUrl: "https://hcgeoserver.howardcountymd.gov:8443/geoserver/general/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=general%3ACouncil_Districts&outputFormat=text%2Fjavascript&srsName=EPSG%3A4326&maxFeatures=50",
        format: "geojson",
        jsonp: true,
        valueField: "DISTRICT20",
        formatChoice: (properties) => `District ${properties.DISTRICT20}`,
      },
      {
        county: "Kent County",
        serviceUrl: COUNTY_BOUNDARY_SERVICE_URL,
        where: "COUNTY = 'Kent'",
        valueField: "COUNTY",
        outFields: "COUNTY",
        formatChoice: () => "At-large",
      },
      {
        county: "Prince George's County",
        serviceUrl: "https://gis.pgatlas.com/pgatlas/rest/services/Administrative/MapServer/100",
        valueField: "DISTRICT_NUMBER",
        outFields: "DISTRICT_NUMBER",
        formatChoice: (properties) => `District ${properties.DISTRICT_NUMBER}`,
      },
      {
        county: "Charles County",
        serviceUrl: "https://services7.arcgis.com/3BMWkdyrt45RNCrq/arcgis/rest/services/CommDistricts_2022/FeatureServer/0",
        valueField: "COMM_DIST",
        outFields: "COMM_DIST",
        formatChoice: (properties) => `District ${properties.COMM_DIST}`,
      },
      {
        county: "Queen Anne's County",
        serviceUrl: "assets/districts/Queen_Anne_CommissionerDistrictBoundaries.zip",
        format: "shapefile",
        valueField: "CC_Dist",
        formatChoice: (properties) => `District ${properties.CC_Dist}`,
      },
      {
        county: "Somerset County",
        serviceUrl: "assets/districts/Somerset_Commissioner_Districts.zip",
        format: "shapefile",
        valueField: "Name",
        formatChoice: (properties) => properties.Name,
      },
      {
        county: "St. Mary's County",
        serviceUrl: "https://gis.stmaryscountymd.gov/server/rest/services/Public/General1/MapServer/10",
        valueField: "DISTRICT",
        outFields: "DISTRICT",
        formatChoice: (properties) => `District ${properties.DISTRICT}`,
      },
      {
        county: "Talbot County",
        serviceUrl: COUNTY_BOUNDARY_SERVICE_URL,
        where: "COUNTY = 'Talbot'",
        valueField: "COUNTY",
        outFields: "COUNTY",
        formatChoice: () => "At-large",
      },
      {
        county: "Washington County",
        serviceUrl: COUNTY_BOUNDARY_SERVICE_URL,
        where: "COUNTY = 'Washington'",
        valueField: "COUNTY",
        outFields: "COUNTY",
        formatChoice: () => "At-large",
      },
      {
        county: "Wicomico County",
        serviceUrl: "https://gisapps.wicomicocounty.org/server/rest/services/CouncilmanisAdoptedDec2_2025/MapServer/7",
        valueField: "DISTRICT",
        outFields: "DISTRICT",
        supportsPagination: false,
        formatChoice: (properties) => `District ${properties.DISTRICT}`,
      },
      {
        county: "Worcester County",
        serviceUrl: "https://wcg-gisweb.co.worcester.md.us/arcgis/rest/services/Election_Districts_Map_MIL1/MapServer/14",
        valueField: "DISTRICT",
        outFields: "DISTRICT",
        formatChoice: (properties) => `District ${properties.DISTRICT}`,
      },
    ],
  },
};

const TAX_CONFIG = {
  kicker: "Assessment signals",
  title: "Tax model analyzer",
  description:
    "Load Maryland parcels with a positive appraised full value and no exemption class. This tool is for predicting COUNTY LEVEL REAL PROPERTY TAX only, not municipal, state, income, or specialty taxes.",
  where:
    "ACCTID IS NOT NULL AND ACCTID NOT IN ('ROW', 'UNK', 'GCE') AND NFMTTLVL > 0 AND EXCLASS IS NULL",
  color: "#9b721e",
  fillColor: "#e5be72",
  metrics: [
    {
      label: "Land value",
      format: (summary) => summary.landValue === null ? "—" : formatCompactCurrency(summary.landValue),
    },
    {
      label: "Overall value",
      format: (summary) => summary.totalValue === null ? "—" : formatCompactCurrency(summary.totalValue),
    },
    {
      label: "Land / total",
      format: (summary) => summary.landValueRatio === null ? "—" : formatPercent(summary.landValueRatio),
    },
    {
      label: "Current tax",
      format: (summary) => summary.currentTaxRevenue === null ? "—" : formatCompactCurrency(summary.currentTaxRevenue),
    },
    {
      label: "SFH homes (n)",
      format: (summary) => summary.sfhCount === null || summary.sfhCount === undefined ? "—" : summary.sfhCount.toLocaleString(),
    },
    {
      label: "SFH land / total (mean)",
      format: (summary) => summary.meanSfhLandRatio === null || summary.meanSfhLandRatio === undefined ? "—" : formatPercent(summary.meanSfhLandRatio * 100),
    },
    {
      label: "SFH land / total (median)",
      format: (summary) => summary.medianSfhLandRatio === null || summary.medianSfhLandRatio === undefined ? "—" : formatPercent(summary.medianSfhLandRatio * 100),
    },
  ],
};

const map = L.map("map", {
  zoomControl: false,
  preferCanvas: true,
}).setView(STATE_CENTER, STATE_ZOOM);

const zoomControl = L.control.zoom({ position: "bottomright" }).addTo(map);
const zoomLevelIndicator = L.DomUtil.create(
  "span",
  "leaflet-control-zoom-level",
  zoomControl.getContainer(),
);
zoomLevelIndicator.setAttribute("role", "status");
zoomLevelIndicator.setAttribute("aria-live", "polite");

const updateZoomLevel = () => {
  const zoomLevel = map.getZoom();
  zoomLevelIndicator.textContent = `Zoom ${zoomLevel}`;
  zoomLevelIndicator.setAttribute("aria-label", `Map zoom level ${zoomLevel}`);
};

map.on("zoomend", updateZoomLevel);
updateZoomLevel();

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

const elements = {
  toolPanel: document.querySelector("#tool-panel"),
  toolKicker: document.querySelector("#tool-kicker"),
  toolTitle: document.querySelector("#tool-title"),
  toolDescription: document.querySelector("#tool-description"),
  statusIndicator: document.querySelector("#status-indicator"),
  statusMessage: document.querySelector("#status-message"),
  parcelLoadProgress: document.querySelector("#parcel-load-progress"),
  parcelLoadProgressLabel: document.querySelector("#parcel-load-progress-label"),
  parcelLoadProgressCount: document.querySelector("#parcel-load-progress-count"),
  parcelLoadProgressBar: document.querySelector("#parcel-load-progress-bar"),
  parcelCount: document.querySelector("#parcel-count"),
  analysisMetrics: document.querySelector("#analysis-metrics"),
  taxModelControls: document.querySelector("#tax-model-controls"),
  taxScopeControl: document.querySelector("#tax-scope-control"),
  taxScopeSelect: document.querySelector("#tax-scope-select"),
  neutralModeInputs: document.querySelectorAll('input[name="neutral-mode"]'),
  neutralRatio: document.querySelector("#neutral-ratio"),
  neutralRatioGroup: document.querySelector("#neutral-ratio-group"),
  neutralLandOnlyNote: document.querySelector("#neutral-land-only-note"),
  neutralHint: document.querySelector("#neutral-hint"),
  applyNeutralRatio: document.querySelector("#apply-neutral-ratio"),
  resetTaxModel: document.querySelector("#reset-tax-model"),
  taxModelResult: document.querySelector("#tax-model-result"),
  hypotheticalTaxValue: document.querySelector("#hypothetical-tax-value"),
  hypotheticalTaxDelta: document.querySelector("#hypothetical-tax-delta"),
  taxCurrentCountyResults: document.querySelector("#tax-current-county-results"),
  taxModelCountyResults: document.querySelector("#tax-model-county-results"),
  taxDownloadControls: document.querySelector("#tax-download-controls"),
  downloadSummary: document.querySelector("#download-summary"),
  downloadParcels: document.querySelector("#download-parcels"),
  downloadMetadata: document.querySelector("#download-metadata"),
  mapStatus: document.querySelector("#map-status-text"),
  refreshParcels: document.querySelector("#refresh-parcels"),
  geographyToggle: document.querySelector("#geography-toggle"),
  geographyMenu: document.querySelector("#geography-menu"),
  geographySelection: document.querySelector("#geography-selection"),
  geographyTypeSelect: document.querySelector("#geography-type-select"),
  geographyChoiceLabel: document.querySelector("#geography-choice-label"),
  geographyChoiceSelect: document.querySelector("#geography-choice-select"),
  underutilizedControl: document.querySelector("#underutilized-control"),
  underutilizedSelect: document.querySelector("#underutilized-select"),
  underutilizedDescription: document.querySelector("#underutilized-description"),
  underutilizedDescriptionText: document.querySelector("#underutilized-description-text"),
  underutilizedZoomHint: document.querySelector("#underutilized-zoom-hint"),
  underutilizedZoomHintText: document.querySelector("#underutilized-zoom-hint-text"),
  underutilizedZoomButton: document.querySelector("#underutilized-zoom-button"),
  selectedGeography: document.querySelector("#selected-geography"),
  acknowledgements: document.querySelector(".acknowledgements"),
  acknowledgementsTrigger: document.querySelector(".acknowledgements-trigger"),
  acknowledgementsPopover: document.querySelector("#acknowledgements-popover"),
};

zoomControl.getContainer().append(elements.mapStatus.closest(".map-status"));

let parcelLayer = null;
let geographyLayer = null;
let geographyFeatures = [];
let selectedGeography = null;
let geographyLoadRequest = null;
let currentRequest = null;
let currentTaxRate = null;
let taxScenarioModel = null;
let taxScenarioFrame = 0;
let downloadRequest = null;
let openParcelPopup = null;
let latestTaxSummary = null;
let underutilizedMode = "";
let underutilizedUpdateId = 0;
let underutilizedContext = null;
let urbanFeaturesPromise = null;
let parcelLoadingMarker = null;

function setStatus(message, state = "ready") {
  elements.statusMessage.textContent = message;
  elements.statusIndicator.className = "status-indicator";
  if (state !== "ready") {
    elements.statusIndicator.classList.add(`is-${state}`);
  }
}

function updateMapStatus(message) {
  elements.mapStatus.textContent = message;
}

function showParcelLoadProgress(label, loaded = 0, total = null, indeterminate = false) {
  elements.parcelLoadProgress.hidden = false;
  elements.parcelLoadProgress.classList.toggle("is-indeterminate", indeterminate);
  elements.parcelLoadProgressLabel.textContent = label;
  elements.parcelLoadProgressCount.textContent = total === null
    ? "Working…"
    : `${loaded.toLocaleString()} / ${total.toLocaleString()}`;
  elements.parcelLoadProgressBar.style.width = total && !indeterminate
    ? `${Math.min(100, (loaded / total) * 100)}%`
    : "0%";
}

function hideParcelLoadProgress() {
  elements.parcelLoadProgress.hidden = true;
  elements.parcelLoadProgress.classList.remove("is-indeterminate");
  elements.parcelLoadProgressBar.style.width = "0%";
}

function formatPercent(value) {
  return Number.isFinite(value)
    ? `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value)}%`
    : "Not available";
}

function formatCompactCurrency(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "Not available";
  const absolute = Math.abs(number);
  if (absolute >= 1e9) return `$${(number / 1e9).toFixed(2)}B`;
  if (absolute >= 1e6) return `$${(number / 1e6).toFixed(2)}M`;
  if (absolute >= 1e3) return `$${(number / 1e3).toFixed(2)}K`;
  return formatCurrency(number);
}

function updateAnalysisMetrics(summary = null) {
  elements.analysisMetrics.replaceChildren(
    ...TAX_CONFIG.metrics.map((metric) => {
      const card = document.createElement("div");
      card.className = "metric-card";
      const label = document.createElement("span");
      label.className = "metric-label";
      label.textContent = metric.label;
      const value = document.createElement("strong");
      value.textContent = summary ? metric.format(summary) : "—";
      card.append(label, value);
      return card;
    }),
  );
}

function clearParcelResults() {
  if (currentRequest) {
    currentRequest.abort();
    currentRequest = null;
  }
  if (downloadRequest) {
    downloadRequest.abort();
    downloadRequest = null;
  }
  underutilizedUpdateId += 1;
  underutilizedContext = null;
  if (parcelLayer) {
    map.removeLayer(parcelLayer);
    parcelLayer = null;
  }
  if (openParcelPopup) {
    openParcelPopup.popup.remove();
    openParcelPopup = null;
  }
  removeParcelLoadingMarker();
  latestTaxSummary = null;
  taxScenarioModel = null;
  hideParcelLoadProgress();
  elements.underutilizedSelect.disabled = false;
  underutilizedMode = "";
  elements.underutilizedSelect.value = "";
  updateUnderutilizedDescription();
  elements.underutilizedControl.hidden = true;
  currentTaxRate = null;
  elements.taxModelControls.hidden = true;
  elements.hypotheticalTaxValue.textContent = "—";
  elements.hypotheticalTaxDelta.textContent = "";
  resetTaxCountyResults(elements.taxModelCountyResults);
  elements.taxModelCountyResults.hidden = true;
  resetTaxCountyResults(elements.taxCurrentCountyResults);
  elements.taxCurrentCountyResults.hidden = true;
  elements.taxDownloadControls.hidden = true;
  setDownloadButtonsDisabled(false);
  elements.parcelCount.textContent = "—";
  updateAnalysisMetrics();
  elements.refreshParcels.disabled = true;
}

function initializeTaxTool() {
  elements.toolPanel.hidden = false;
  elements.toolKicker.textContent = TAX_CONFIG.kicker;
  elements.toolTitle.textContent = TAX_CONFIG.title;
  elements.toolDescription.textContent = TAX_CONFIG.description;
  elements.selectedGeography.textContent = "All Maryland";
  clearParcelResults();
  setStatus("Choose a geography to load tax analysis results.");
  updateMapStatus("Choose a geography to load parcels");
}

function getMapExtent() {
  const bounds = map.getBounds();
  return {
    xmin: bounds.getWest(),
    ymin: bounds.getSouth(),
    xmax: bounds.getEast(),
    ymax: bounds.getNorth(),
  };
}

function formatGeographyName(feature = selectedGeography) {
  if (!feature) return "All Maryland";
  const config = GEOGRAPHY_CONFIG[elements.geographyTypeSelect.value];
  return config.formatChoice(feature.properties[config.valueField]);
}

function formatMunicipalityName(value) {
  return String(value)
    .toLowerCase()
    .replace(/(^|[ -])([a-z])/g, (_, separator, letter) => `${separator}${letter.toUpperCase()}`);
}

function geographyQueryUrl(type) {
  const config = GEOGRAPHY_CONFIG[type];
  const params = new URLSearchParams({
    where: "1=1",
    outFields: config.valueField,
    returnGeometry: "true",
    outSR: "4326",
    resultRecordCount: "3000",
    f: "geojson",
  });
  return `${config.serviceUrl}/query?${params.toString()}`;
}

function countyCouncilQueryUrl(source) {
  if (source.queryUrl) return source.queryUrl;

  const params = new URLSearchParams({
    where: source.where || "1=1",
    outFields: source.outFields,
    returnGeometry: "true",
    outSR: "4326",
    f: "geojson",
  });
  if (source.supportsPagination !== false) params.set("resultRecordCount", "3000");
  return `${source.serviceUrl}/query?${params.toString()}`;
}

let countyCouncilJsonpRequestId = 0;

function loadCountyCouncilJsonp(source, signal) {
  return new Promise((resolve, reject) => {
    const callbackName = `taxPredictorHowardCouncil${++countyCouncilJsonpRequestId}`;
    const script = document.createElement("script");
    let settled = false;

    const cleanup = () => {
      script.remove();
      delete window[callbackName];
      signal.removeEventListener("abort", handleAbort);
    };
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback(value);
    };
    const handleAbort = () => {
      const error = new DOMException("The request was aborted.", "AbortError");
      finish(reject, error);
    };

    window[callbackName] = (payload) => finish(resolve, payload);
    script.onerror = () => finish(reject, new Error("The Howard County district service could not be loaded."));
    signal.addEventListener("abort", handleAbort, { once: true });

    const url = new URL(countyCouncilQueryUrl(source));
    url.searchParams.set("outputFormat", "text/javascript");
    url.searchParams.set("srsName", "EPSG:4326");
    url.searchParams.set("format_options", `callback:${callbackName}`);
    script.src = url.toString();
    document.head.append(script);
  });
}

function compareCountyDistricts(a, b) {
  const [countyA, districtA = ""] = a.properties.GEOGRAPHY_LABEL.split(" — ");
  const [countyB, districtB = ""] = b.properties.GEOGRAPHY_LABEL.split(" — ");
  const countyComparison = countyA.localeCompare(countyB);
  if (countyComparison) return countyComparison;

  const numberA = Number(districtA.match(/District (\d+)/)?.[1]);
  const numberB = Number(districtB.match(/District (\d+)/)?.[1]);
  if (Number.isFinite(numberA) && Number.isFinite(numberB)) return numberA - numberB;
  if (Number.isFinite(numberA)) return -1;
  if (Number.isFinite(numberB)) return 1;
  return districtA.localeCompare(districtB);
}

async function loadCountyCouncilChoices(signal, sources = GEOGRAPHY_CONFIG.countyCouncil.sources) {
  const responses = await Promise.all(
    sources.map(async (source) => {
      try {
        if (source.format === "shapefile") {
          if (typeof shp !== "function") throw new Error("The shapefile parser did not load.");
          const response = await fetch(source.serviceUrl, { signal });
          if (!response.ok) throw new Error(`Service returned ${response.status}.`);
          const payload = await shp(await response.arrayBuffer());
          if (payload.type !== "FeatureCollection") {
            throw new Error("The shapefile service did not return GeoJSON.");
          }
          return { source, payload };
        }

        let payload;
        if (source.jsonp) {
          payload = await loadCountyCouncilJsonp(source, signal);
        } else {
          const response = await fetch(countyCouncilQueryUrl(source), {
            signal,
            headers: { Accept: "application/geo+json, application/json" },
          });
          payload = await response.json();
          if (!response.ok) {
            throw new Error(payload.error?.message || `Service returned ${response.status}.`);
          }
        }
        if (payload.error || payload.type !== "FeatureCollection") {
          throw new Error(payload.error?.message || "The district service did not return GeoJSON.");
        }
        return { source, payload };
      } catch (error) {
        if (error.name === "AbortError") throw error;
        console.warn(`Skipping ${source.county} district service:`, error);
        return null;
      }
    }),
  );

  const featuresByValue = new Map();
  responses.filter(Boolean).forEach(({ source, payload }) => {
    (payload.features || [])
      .filter((feature) => feature.geometry && feature.properties?.[source.valueField])
      .forEach((feature) => {
        const district = String(feature.properties[source.valueField]);
        const value = `${source.county}:${district}`;
        const label = `${source.county} — ${source.formatChoice?.(feature.properties) || `District ${district}`}`;
        const geometry = feature.geometry.type === "Polygon"
          ? [feature.geometry.coordinates]
          : feature.geometry.type === "MultiPolygon"
            ? feature.geometry.coordinates
            : [];
        if (!geometry.length) return;
        const existing = featuresByValue.get(value);
        if (existing) {
          existing.geometry.coordinates.push(...geometry);
        } else {
          featuresByValue.set(value, {
            type: "Feature",
            properties: {
              GEOGRAPHY_LABEL: label,
              GEOGRAPHY_VALUE: value,
              COUNTY: source.county,
            },
            geometry: { type: "MultiPolygon", coordinates: [...geometry] },
          });
        }
      });
  });

  if (!featuresByValue.size) {
    throw new Error("No county district services returned usable boundaries.");
  }
  return [...featuresByValue.values()].sort(compareCountyDistricts);
}

function normalizeAssemblyDistrictValue(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const match = text.match(/^\s*(\d+)(?:[A-Z])?\s*$/i);
  if (!match) return text;
  return match[1];
}

function compareAssemblyDistrictValues(a, b) {
  const getParts = (value) => {
    const text = String(value ?? "").trim();
    const match = text.match(/^(\d+)([A-Z])?$/i);
    if (!match) return { base: Number.NaN, suffix: "" };
    return { base: Number(match[1]), suffix: (match[2] || "").toUpperCase() };
  };

  const left = getParts(a);
  const right = getParts(b);
  if (Number.isFinite(left.base) && Number.isFinite(right.base) && left.base !== right.base) {
    return left.base - right.base;
  }
  if (left.base !== right.base) return String(a).localeCompare(String(b));
  const suffixOrder = { "": 0, A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, I: 9, J: 10 };
  return (suffixOrder[left.suffix] ?? 99) - (suffixOrder[right.suffix] ?? 99);
}

async function loadGeographyChoices(type) {
  const config = GEOGRAPHY_CONFIG[type];
  if (geographyLoadRequest) geographyLoadRequest.abort();
  const request = new AbortController();
  geographyLoadRequest = request;
  elements.geographyChoiceLabel.textContent = `Choose a ${config.choiceLabel.toLowerCase()}`;
  elements.geographyChoiceSelect.disabled = true;
  elements.geographyChoiceSelect.replaceChildren(new Option("Loading choices…", ""));

  try {
    if (type === "countyCouncil") {
      geographyFeatures = await loadCountyCouncilChoices(request.signal);
    } else {
      const response = await fetch(geographyQueryUrl(type), {
        signal: request.signal,
        headers: { Accept: "application/geo+json, application/json" },
      });
      const payload = await response.json();

      if (!response.ok || payload.error) {
        throw new Error(payload.error?.message || `Geography service returned ${response.status}.`);
      }
      if (payload.type !== "FeatureCollection") {
        throw new Error("The geography service did not return GeoJSON.");
      }

      const featuresByValue = new Map();
      const addFeature = (value, feature) => {
        const geometry = feature.geometry.type === "Polygon"
          ? [feature.geometry.coordinates]
          : feature.geometry.coordinates;
        const existing = featuresByValue.get(value);
        if (existing) {
          existing.geometry.coordinates.push(...geometry);
        } else {
          featuresByValue.set(value, {
            type: "Feature",
            properties: { ...feature.properties, [config.valueField]: value },
            geometry: { type: "MultiPolygon", coordinates: [...geometry] },
          });
        }
      };

      (payload.features || [])
        .filter((feature) => feature.geometry && feature.properties?.[config.valueField])
        .forEach((feature) => {
          const rawValue = String(feature.properties[config.valueField]).trim();
          if (!rawValue) return;

          if (type === "assembly") {
            const combinedValue = normalizeAssemblyDistrictValue(rawValue);
            addFeature(rawValue, feature);
            if (combinedValue && combinedValue !== rawValue) {
              addFeature(combinedValue, feature);
            }
          } else {
            addFeature(rawValue, feature);
          }
        });

      geographyFeatures = [...featuresByValue.values()].sort((a, b) => {
        if (type === "assembly") {
          return compareAssemblyDistrictValues(a.properties[config.valueField], b.properties[config.valueField]);
        }
        return String(a.properties[config.valueField]).localeCompare(String(b.properties[config.valueField]));
      });
    }

    if (geographyLoadRequest !== request) return;

    elements.geographyChoiceLabel.textContent = `Choose a ${config.choiceLabel.toLowerCase()}`;
    elements.geographyChoiceSelect.replaceChildren(new Option("All Maryland", ""));
    geographyFeatures.forEach((feature) => {
      const value = feature.properties[config.valueField];
      elements.geographyChoiceSelect.add(new Option(config.formatChoice(value), value));
    });
    elements.geographyChoiceSelect.disabled = false;
  } catch (error) {
    if (error.name === "AbortError" || geographyLoadRequest !== request) return;
    console.error(error);
    elements.geographyChoiceSelect.replaceChildren(new Option("Choices unavailable", ""));
    updateMapStatus(`Could not load ${config.label.toLowerCase()}`);
  }
}

function createGeographyStyle() {
  return {
    color: "#0f4d40",
    weight: 2,
    opacity: 0.9,
    fillColor: "#8ed1b4",
    fillOpacity: 0.1,
    interactive: false,
  };
}

function showSelectedGeography() {
  if (geographyLayer) {
    map.removeLayer(geographyLayer);
    geographyLayer = null;
  }
  if (!selectedGeography) {
    map.setView(STATE_CENTER, STATE_ZOOM);
    return;
  }

  geographyLayer = L.geoJSON(selectedGeography, { style: createGeographyStyle() }).addTo(map);
  geographyLayer.bringToFront();
  map.fitBounds(geographyLayer.getBounds(), { padding: [42, 42] });
}

function ringCenter(ring) {
  let areaTwice = 0;
  let centerX = 0;
  let centerY = 0;

  for (let index = 0; index < ring.length - 1; index += 1) {
    const [x1, y1] = ring[index];
    const [x2, y2] = ring[index + 1];
    const cross = x1 * y2 - x2 * y1;
    areaTwice += cross;
    centerX += (x1 + x2) * cross;
    centerY += (y1 + y2) * cross;
  }

  if (!areaTwice) {
    const points = ring.slice(0, -1);
    const total = points.reduce(
      (center, [x, y]) => [center[0] + x, center[1] + y],
      [0, 0],
    );
    return [total[0] / points.length, total[1] / points.length];
  }

  return [centerX / (3 * areaTwice), centerY / (3 * areaTwice)];
}

function geometryCenter(geometry) {
  if (!geometry) return null;
  if (geometry.type === "Point") return geometry.coordinates;
  if (geometry.type === "Polygon") return ringCenter(geometry.coordinates[0]);
  if (geometry.type === "MultiPolygon") {
    const centers = geometry.coordinates.map((polygon) => ringCenter(polygon[0]));
    const total = centers.reduce(
      (center, [x, y]) => [center[0] + x, center[1] + y],
      [0, 0],
    );
    return [total[0] / centers.length, total[1] / centers.length];
  }
  return null;
}

function countyKeyFromStateName(value) {
  const name = String(value || "").trim();
  if (!name) return null;
  return name === "Baltimore City" ? name : `${name} County`;
}

async function resolveCountyTaxRate(geographyType, geography, signal) {
  if (!geography) return null;

  let countyKey = null;
  if (geographyType === "county") {
    countyKey = countyKeyFromStateName(geography.properties?.COUNTY);
  } else if (geographyType === "countyCouncil") {
    countyKey = geography.properties?.COUNTY;
  } else if (geographyType === "municipality") {
    const center = geometryCenter(geography.geometry);
    if (center) {
      const params = new URLSearchParams({
        geometry: `${center[0]},${center[1]}`,
        geometryType: "esriGeometryPoint",
        inSR: "4326",
        spatialRel: "esriSpatialRelIntersects",
        outFields: "COUNTY",
        returnGeometry: "false",
        resultRecordCount: "1",
        f: "json",
      });
      const response = await fetch(`${COUNTY_BOUNDARY_SERVICE_URL}/query?${params.toString()}`, {
        signal,
        headers: { Accept: "application/json" },
      });
      const payload = await response.json();
      if (!response.ok || payload.error) {
        throw new Error(payload.error?.message || `County service returned ${response.status}.`);
      }
      countyKey = countyKeyFromStateName(payload.features?.[0]?.attributes?.COUNTY);
    }
  }

  if (!countyKey) return null;
  if (geographyType === "municipality") {
    return taxRateForLocation(countyKey, geography.properties?.MUN_NAME);
  }
  return COUNTY_TAX_RATES[countyKey]?.base ?? null;
}

function municipalRateEntry(county, municipality) {
  if (!municipality) return null;
  const boundaryName = MUNICIPALITY_NAMES_BY_PARCEL_TOWN[String(municipality).trim().toUpperCase()];
  const municipalityName = normalizeMunicipalityName(boundaryName || municipality);
  return Object.entries(COUNTY_TAX_RATES[county]?.municipalities || {})
    .find(([name]) => normalizeMunicipalityName(name) === municipalityName) || null;
}

function taxRateForLocation(county, municipality) {
  const countyRates = COUNTY_TAX_RATES[county];
  if (!countyRates) return null;
  return municipalRateEntry(county, municipality)?.[1] ?? countyRates.base;
}

function taxRateForParcel(properties) {
  const county = COUNTY_BY_JURISDICTION[String(properties.JURSCODE || "").toUpperCase()];
  const municipality = properties.TOWNCODE
    ? municipalityNameFromParcelDescription(properties.DESCTOWN)
    : null;
  return taxRateForLocation(county, municipality);
}

function taxJurisdictionDetails(properties) {
  const county = COUNTY_BY_JURISDICTION[String(properties.JURSCODE || "").toUpperCase()] || "Unknown county";
  const parcelMunicipality = properties.TOWNCODE
    ? municipalityNameFromParcelDescription(properties.DESCTOWN)
    : null;
  const rate = taxRateForLocation(county, parcelMunicipality);
  const countyRate = COUNTY_TAX_RATES[county]?.base ?? null;
  const municipality = municipalRateEntry(county, parcelMunicipality)?.[0] ?? null;
  const hasDistinctMunicipalRate = municipality && Number.isFinite(rate)
    && Number.isFinite(countyRate) && rate !== countyRate;
  const jurisdiction = hasDistinctMunicipalRate ? `${county} — ${municipality}` : county;
  return { county, municipality: hasDistinctMunicipalRate ? municipality : null, rate, jurisdiction };
}

function normalizeMunicipalityName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\bcity\b/g, "")
    .replace(/\bsaint\b/g, "st")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function municipalityNameFromParcelDescription(value) {
  const parts = String(value || "").trim().split(/\s+/);
  return parts.length > 1 ? parts.slice(1).join(" ") : null;
}

function pointInRing(point, ring) {
  const [x, y] = point;
  let inside = false;

  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [currentX, currentY] = ring[index];
    const [previousX, previousY] = ring[previous];
    const intersects =
      currentY > y !== previousY > y &&
      x < ((previousX - currentX) * (y - currentY)) / (previousY - currentY) + currentX;
    if (intersects) inside = !inside;
  }

  return inside;
}

function pointInGeometry(point, geometry) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.some(
    (polygon) => pointInRing(point, polygon[0]) && polygon.slice(1).every((hole) => !pointInRing(point, hole)),
  );
}

function createPointInGeometryTester(geometry) {
  const polygons = (geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates).map((polygon) => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [x, y] of polygon[0]) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    return { polygon, minX, minY, maxX, maxY };
  });
  return ([x, y]) => polygons.some(({ polygon, minX, minY, maxX, maxY }) =>
    x >= minX && x <= maxX && y >= minY && y <= maxY
    && pointInRing([x, y], polygon[0])
    && polygon.slice(1).every((hole) => !pointInRing([x, y], hole)));
}

function geometryArea(geometry) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.reduce((total, polygon) => {
    const ring = polygon[0];
    let area = 0;
    for (let index = 0; index < ring.length - 1; index += 1) {
      area += ring[index][0] * ring[index + 1][1] - ring[index + 1][0] * ring[index][1];
    }
    return total + Math.abs(area) / 2;
  }, 0);
}

function attachPointsToShapes(shapes, points) {
  const candidates = shapes
    .filter((shape) => shape.geometry)
    .map((shape) => ({
      shape,
      area: geometryArea(shape.geometry),
      contains: createPointInGeometryTester(shape.geometry),
      accounts: [],
    }))
    .sort((a, b) => a.area - b.area);
  const orphans = [];
  points.forEach((point) => {
    const owner = candidates.find((candidate) => candidate.contains(point.geometry.coordinates));
    if (owner) owner.accounts.push(point.properties || {});
    else orphans.push(point);
  });
  const parcels = candidates
    .filter((candidate) => candidate.accounts.length)
    .sort((a, b) => b.area - a.area)
    .map(({ shape, accounts }) => ({ type: "Feature", geometry: shape.geometry, properties: { accounts } }));
  return { parcels, orphans };
}

function webMercatorPoint([longitude, latitude]) {
  const earthRadius = 20037508.34;
  const x = (longitude * earthRadius) / 180;
  const clampedLatitude = Math.max(-85.05112878, Math.min(85.05112878, latitude));
  const y =
    (Math.log(Math.tan(((90 + clampedLatitude) * Math.PI) / 360)) / (Math.PI / 180)) *
    (earthRadius / 180);
  return [x, y];
}

// Parcel town names that differ from MUN_NAME in the municipality boundary layer.
const PARCEL_TOWN_NAMES = {
  BOONSBORO: "BOONESBORO",
  BROOKEVILLE: "BROOKVILLE",
  "CHEVY CHASE SECTION 3": "CHEVY CHASE SEC. 3",
  "CHEVY CHASE SECTION 5": "CHEVY CHASE SEC. 5",
  "CHEVY CHASE TOWN": "CHEVY CHASE TOWN OF",
  FREDERICK: "FREDERICK CITY",
  "LOCH LYNN HEIGHTS": "LOCH LYNN",
  "MARTINS ADDITIONS": "MARTINS ADDITION",
  "NORTH CHEVY CHASE": "CHEVY CHASE NORTH",
  "ST. MICHAELS": "SAINT MICHAELS",
};
const MUNICIPALITY_NAMES_BY_PARCEL_TOWN = Object.fromEntries(
  Object.entries(PARCEL_TOWN_NAMES).map(([boundaryName, parcelName]) => [parcelName, boundaryName]),
);

function geographyAttributeFilter(geography) {
  if (!geography) return null;
  const geographyType = elements.geographyTypeSelect.value;
  if (geographyType === "county") {
    const countyKey = countyKeyFromStateName(geography.properties?.COUNTY);
    const code = Object.keys(COUNTY_BY_JURISDICTION).find((key) => COUNTY_BY_JURISDICTION[key] === countyKey);
    return code ? `JURSCODE = '${code}'` : null;
  }
  if (geographyType === "municipality") {
    const name = String(geography.properties?.MUN_NAME || "").trim().toUpperCase();
    if (!name) return null;
    if (name === "BALTIMORE CITY") return "JURSCODE = 'BACI'";
    // DESCTOWN is "<JURSCODE> <Town>", e.g. "CARO Denton".
    const townName = (PARCEL_TOWN_NAMES[name] || name).replace(/'/g, "''");
    return `TOWNCODE IS NOT NULL AND UPPER(DESCTOWN) LIKE '____ ${townName}'`;
  }
  return null;
}

function parcelWhere(geography) {
  const attributeFilter = geographyAttributeFilter(geography);
  return attributeFilter ? `${TAX_CONFIG.where} AND ${attributeFilter}` : TAX_CONFIG.where;
}

function geographyGeometryForQuery(geography = selectedGeography) {
  if (!geography) return null;

  const geometry = geography.geometry;
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return {
    rings: polygons.flatMap((polygon) => polygon.map((ring) => ring.map(webMercatorPoint))),
    spatialReference: { wkid: 3857 },
  };
}

function geographyGeometryForExport(geography) {
  if (!geography) return null;
  const polygons = geography.geometry.type === "Polygon"
    ? [geography.geometry.coordinates]
    : geography.geometry.coordinates;
  return {
    rings: polygons.flatMap((polygon) => polygon.map((ring) => ring)),
    spatialReference: { wkid: 4326 },
  };
}

function serverParcelExportRequest(geography) {
  const bounds = map.getBounds();
  const southwest = webMercatorPoint([bounds.getWest(), bounds.getSouth()]);
  const northeast = webMercatorPoint([bounds.getEast(), bounds.getNorth()]);
  const size = map.getSize();
  // Scale uniformly: ArcGIS widens the bbox to match the image aspect ratio, which would misalign the overlay.
  const scale = Math.min(1, 2048 / Math.max(size.x, size.y));
  const width = Math.max(1, Math.round(size.x * scale));
  const height = Math.max(1, Math.round(size.y * scale));
  const params = new URLSearchParams({
    bbox: `${southwest[0]},${southwest[1]},${northeast[0]},${northeast[1]}`,
    bboxSR: "3857",
    imageSR: "3857",
    size: `${width},${height}`,
    format: "png32",
    transparent: "true",
    dpi: "96",
    layers: "show:0",
    layerDefs: JSON.stringify({ 0: parcelWhere(geography) }),
    f: "image",
  });
  const geometry = geographyAttributeFilter(geography) ? null : geographyGeometryForExport(geography);
  if (geometry) {
    const polygonFilter = {
      geometryType: "esriGeometryPolygon",
      geometry,
    };
    params.set("spatialFilter", JSON.stringify({
      ...polygonFilter,
      spatialRel: "esriSpatialRelIntersects",
    }));
    params.set("clipping", JSON.stringify(polygonFilter));
  }
  return {
    url: `${PARCEL_MAP_SERVICE_URL}/export`,
    options: { method: "POST", body: params },
  };
}

async function queryAllGeojson(layerUrl, params, signal, pageSize, maxFeatures = 20000) {
  const features = [];
  for (let offset = 0; offset < maxFeatures; offset += pageSize) {
    const response = await fetch(`${layerUrl}/query`, {
      method: "POST",
      body: new URLSearchParams({
        ...params,
        orderByFields: "OBJECTID",
        resultOffset: String(offset),
        resultRecordCount: String(pageSize),
        f: "geojson",
      }),
      signal,
      headers: { Accept: "application/geo+json, application/json" },
    });
    const payload = await response.json();
    if (!response.ok || payload.error || payload.type !== "FeatureCollection") {
      throw new Error(payload.error?.message || `Parcel service returned ${response.status}.`);
    }
    const page = payload.features || [];
    features.push(...page);
    const more = payload.exceededTransferLimit || payload.properties?.exceededTransferLimit;
    if (!more || !page.length) break;
  }
  return features;
}

function viewEnvelopeFilter() {
  const extent = getMapExtent();
  return {
    geometry: `${extent.xmin},${extent.ymin},${extent.xmax},${extent.ymax}`,
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
  };
}

async function loadAnalysisPoints(geography, spatialFilter, signal) {
  const features = await queryAllGeojson(PARCEL_POINTS_LAYER_URL, {
    where: parcelWhere(geography),
    ...spatialFilter,
    outFields: PARCEL_OUT_FIELDS,
    returnGeometry: "true",
    outSR: "4326",
  }, signal, 2000);
  const pointFeatures = features.filter((feature) => feature.geometry?.type === "Point");
  if (!geography || geographyAttributeFilter(geography)) return pointFeatures;
  const contains = createPointInGeometryTester(geography.geometry);
  return pointFeatures.filter((feature) => contains(feature.geometry.coordinates));
}

async function loadShapes(spatialFilter, signal) {
  return queryAllGeojson(PARCEL_LAYER_URL, {
    where: PARCEL_SHAPE_WHERE,
    ...spatialFilter,
    outFields: "OBJECTID",
    returnGeometry: "true",
    outSR: "4326",
  }, signal, MAX_PARCELS_PER_REQUEST);
}

// This one is really smart
async function loadAccountsAtPoint(latlng, geography, signal) {
  const clickFilter = {
    geometry: `${latlng.lng},${latlng.lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
  };
  const shapes = await loadShapes(clickFilter, signal);
  const shape = shapes
    .filter((feature) => feature.geometry)
    .sort((a, b) => geometryArea(a.geometry) - geometryArea(b.geometry))[0];
  if (shape) {
    const points = await loadAnalysisPoints(geography, {
      geometry: JSON.stringify(geographyGeometryForExport(shape)),
      geometryType: "esriGeometryPolygon",
      inSR: "4326",
      spatialRel: "esriSpatialRelIntersects",
    }, signal);
    if (points.length) return points.map((point) => point.properties || {});
  }
  const nearby = await loadAnalysisPoints(geography, {
    ...clickFilter,
    distance: "8",
    units: "esriSRUnit_Meter",
  }, signal);
  return nearby.map((point) => point.properties || {});
}

function openAccountsPopup(latlng, accounts) {
  const popup = L.popup({ className: "parcel-tooltip", maxWidth: 300 })
    .setLatLng(latlng)
    .setContent(stackedPopupMarkup(accounts));
  openParcelPopup = { popup, accounts };
  popup.once("remove", () => {
    if (openParcelPopup?.popup === popup) openParcelPopup = null;
  });
  popup.openOn(map);
}

function removeParcelLoadingMarker() {
  if (parcelLoadingMarker) {
    map.removeLayer(parcelLoadingMarker);
    parcelLoadingMarker = null;
  }
}

function showParcelLoadingMarker(latlng) {
  removeParcelLoadingMarker();
  parcelLoadingMarker = L.marker(latlng, {
    interactive: false,
    icon: L.divIcon({
      className: "parcel-loading-marker-container",
      html: '<span class="parcel-loading-marker" aria-hidden="true"></span>',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    }),
    zIndexOffset: 1000,
  }).addTo(map);
}

// TODO: find out why this is handled here and not CSS (is it a map thing?)
function underutilizedStyle(style) {
  return { ...style, color: "#e56b2f", fillColor: "#f4a261", weight: 2.5, fillOpacity: 0.58 };
}

// This is another really cool function
function createParcelMapLayer(geography) {
  const layer = L.layerGroup();
  let refreshTimer = null;
  let refreshRequest = null;
  let parcelClickRequest = null;
  let pendingRefreshResolve = null;
  let imageOverlay = null;
  let vectorLayer = null;

  const removeImage = () => {
    if (imageOverlay) layer.removeLayer(imageOverlay);
    imageOverlay = null;
  };
  const removeVectors = () => {
    if (vectorLayer) layer.removeLayer(vectorLayer);
    vectorLayer = null;
  };

  const shapeStyle = (feature) => {
    const accounts = feature.properties.accounts;
    const center = geometryCenter(feature.geometry);
    return accounts.some((account) => isUnderutilized(account, center))
      ? underutilizedStyle(createParcelStyle())
      : createParcelStyle();
  };
  const orphanStyle = (points) => {
    const base = { radius: 5, color: TAX_CONFIG.color, weight: 1.5, fill: false };
    return points.some((point) => isUnderutilized(point.properties || {}, point.geometry.coordinates))
      ? { ...base, color: "#e56b2f", weight: 2.5 }
      : base;
  };

  layer.restyle = () => {
    if (!vectorLayer) return;
    vectorLayer.shapes.eachLayer((child) => child.setStyle(shapeStyle(child.feature)));
    vectorLayer.orphans.forEach((marker) => marker.setStyle(orphanStyle(marker.points)));
  };

  const showImage = async (signal) => {
    const bounds = map.getBounds();
    const exportRequest = serverParcelExportRequest(geography);
    const response = await fetch(exportRequest.url, {
      ...exportRequest.options,
      signal,
      headers: { Accept: "image/png" },
    });
    if (!response.ok) throw new Error(`Parcel map service returned ${response.status}.`);
    const imageUrl = URL.createObjectURL(await response.blob());
    if (signal.aborted || !map.hasLayer(layer)) {
      URL.revokeObjectURL(imageUrl);
      return;
    }
    removeVectors();
    removeImage();
    imageOverlay = L.imageOverlay(imageUrl, bounds, { opacity: 0.78, interactive: false }).addTo(layer);
    imageOverlay.once("remove", () => URL.revokeObjectURL(imageUrl));
  };

  const showVectors = async (signal) => {
    const view = viewEnvelopeFilter();
    const [shapes, points] = await Promise.all([
      loadShapes(view, signal),
      loadAnalysisPoints(geography, view, signal),
    ]);
    if (signal.aborted || !map.hasLayer(layer)) return;
    const { parcels, orphans } = attachPointsToShapes(shapes, points);
    const shapesLayer = L.geoJSON({ type: "FeatureCollection", features: parcels }, {
      style: shapeStyle,
      onEachFeature: (feature, child) => {
        child.on({
          click: (event) => openAccountsPopup(event.latlng, feature.properties.accounts),
          mouseover: () => child.setStyle({ weight: 2.5, fillOpacity: 0.48 }),
          mouseout: () => child.setStyle(shapeStyle(feature)),
        });
      },
    });
    // Accounts that share a location (e.g. condo units) without a containing shape share one marker.
    const orphansByLocation = new Map();
    orphans.forEach((point) => {
      const key = point.geometry.coordinates.join(",");
      if (!orphansByLocation.has(key)) orphansByLocation.set(key, []);
      orphansByLocation.get(key).push(point);
    });
    const orphanMarkers = [...orphansByLocation.values()].map((points) => {
      const [lng, lat] = points[0].geometry.coordinates;
      const marker = L.circleMarker([lat, lng], orphanStyle(points));
      marker.points = points;
      marker.on("click", (event) => openAccountsPopup(event.latlng, points.map((point) => point.properties || {})));
      return marker;
    });
    removeImage();
    removeVectors();
    vectorLayer = L.featureGroup([shapesLayer, ...orphanMarkers]).addTo(layer);
    vectorLayer.shapes = shapesLayer;
    vectorLayer.orphans = orphanMarkers;
  };

  const handleMapClick = async (event) => {
    if (map.getZoom() >= VECTOR_MIN_ZOOM) return;
    if (
      geography &&
      !geographyAttributeFilter(geography) &&
      !pointInGeometry([event.latlng.lng, event.latlng.lat], geography.geometry)
    ) {
      removeParcelLoadingMarker();
      return;
    }
    if (parcelClickRequest) parcelClickRequest.abort();
    showParcelLoadingMarker(event.latlng);
    const request = new AbortController();
    parcelClickRequest = request;

    try {
      const accounts = await loadAccountsAtPoint(event.latlng, geography, request.signal);
      if (!accounts.length || parcelClickRequest !== request || !map.hasLayer(layer)) return;
      openAccountsPopup(event.latlng, accounts);
    } catch (error) {
      if (error.name !== "AbortError") console.warn("Could not load the selected parcel:", error);
    } finally {
      if (parcelClickRequest === request) {
        removeParcelLoadingMarker();
        parcelClickRequest = null;
      }
    }
  };

  layer.refresh = () => new Promise((resolve, reject) => {
    if (pendingRefreshResolve) pendingRefreshResolve();
    pendingRefreshResolve = resolve;
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(async () => {
      if (refreshRequest) refreshRequest.abort();
      const request = new AbortController();
      refreshRequest = request;
      try {
        if (map.getZoom() >= VECTOR_MIN_ZOOM) {
          await showVectors(request.signal);
        } else {
          await showImage(request.signal);
        }
        resolve();
      } catch (error) {
        if (error.name === "AbortError") {
          resolve();
          return;
        }
        reject(error);
      } finally {
        if (pendingRefreshResolve === resolve) pendingRefreshResolve = null;
        if (refreshRequest === request) refreshRequest = null;
      }
    }, 100);
  });

  layer.on("add", () => {
    map.on("moveend", layer.refresh);
    map.on("zoomend", layer.refresh);
    map.on("click", handleMapClick);
  });
  layer.on("remove", () => {
    if (pendingRefreshResolve) pendingRefreshResolve();
    pendingRefreshResolve = null;
    clearTimeout(refreshTimer);
    if (refreshRequest) refreshRequest.abort();
    if (parcelClickRequest) parcelClickRequest.abort();
    removeParcelLoadingMarker();
    map.off("moveend", layer.refresh);
    map.off("zoomend", layer.refresh);
    map.off("click", handleMapClick);
    removeImage();
    removeVectors();
  });
  return layer;
}

// Analysis query against the account points layer for the selected geography.
function buildParcelQuery(geography = selectedGeography) {
  const params = new URLSearchParams({
    where: parcelWhere(geography),
    outFields: PARCEL_OUT_FIELDS,
    returnGeometry: "true",
    outSR: "4326",
    resultRecordCount: String(MAX_PARCELS_PER_REQUEST),
    f: "geojson",
  });

  if (geography && !geographyAttributeFilter(geography)) {
    params.set("geometry", JSON.stringify(geographyGeometryForQuery(geography)));
    params.set("geometryType", "esriGeometryPolygon");
    params.set("inSR", "3857");
    params.set("spatialRel", "esriSpatialRelIntersects");
  }

  return {
    url: `${PARCEL_POINTS_LAYER_URL}/query`,
    options: {
      method: "POST",
      body: params,
    },
  };
}

async function loadGeographyParcelIds(geography, signal) {
  const idQuery = buildParcelQuery(geography);
  const idParams = new URLSearchParams(idQuery.options.body);
  idParams.delete("outFields");
  idParams.delete("outSR");
  idParams.delete("resultRecordCount");
  idParams.set("returnGeometry", "false");
  idParams.set("returnIdsOnly", "true");
  idParams.set("f", "json");

  const idResponse = await fetch(idQuery.url, {
    method: "POST",
    body: idParams,
    signal,
    headers: { Accept: "application/json" },
  });
  const idPayload = await idResponse.json();

  if (!idResponse.ok || idPayload.error) {
    throw new Error(idPayload.error?.message || `Parcel service returned ${idResponse.status}.`);
  }

  return idPayload.objectIds || [];
}

function parcelAggregateRequest(geography, statistic) {
  const query = buildParcelQuery(geography);
  const params = query.options.body
    ? new URLSearchParams(query.options.body)
    : new URL(query.url).searchParams;
  params.delete("outFields");
  params.delete("outSR");
  params.delete("resultRecordCount");
  params.set("returnGeometry", "false");
  params.set("outStatistics", JSON.stringify(Array.isArray(statistic) ? statistic : [statistic]));
  params.set("f", "json");

  if (query.options.body) {
    return { url: query.url, options: { method: "POST", body: params } };
  }
  return { url: `${query.url.split("?")[0]}?${params.toString()}`, options: {} };
}

async function loadSfhBenchmarks(geography, signal) {
  const ratio = "CAST(NFMLNDVL AS FLOAT) / NFMTTLVL";
  const query = parcelAggregateRequest(geography, [
    { statisticType: "count", onStatisticField: "NFMLNDVL", outStatisticFieldName: "sfhCount" },
    { statisticType: "avg", onStatisticField: ratio, outStatisticFieldName: "meanRatio" },
    {
      statisticType: "PERCENTILE_CONT",
      statisticParameters: { value: 0.5 },
      onStatisticField: ratio,
      outStatisticFieldName: "medianRatio",
    },
  ]);
  query.options.body.set("where", `${query.options.body.get("where")} AND ${SFH_WHERE}`);
  const response = await fetch(query.url, {
    ...query.options,
    signal,
    headers: { Accept: "application/json" },
  });
  const payload = await response.json();
  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message || `Parcel service returned ${response.status}.`);
  }
  const attributes = payload.features?.[0]?.attributes || {};
  const value = (field) => (attributes[field] === null || attributes[field] === undefined ? null : Number(attributes[field]));
  return {
    sfhCount: value("sfhCount") ?? 0,
    meanSfhLandRatio: value("meanRatio"),
    medianSfhLandRatio: value("medianRatio"),
  };
}

function parcelGroupedStatisticsRequest(
  geography,
  statistics,
  { where = null, groupBy = "JURSCODE,TOWNCODE,DESCTOWN" } = {},
) {
  const query = buildParcelQuery(geography);
  const params = query.options.body
    ? new URLSearchParams(query.options.body)
    : new URL(query.url).searchParams;
  params.delete("outFields");
  params.delete("outSR");
  params.delete("resultRecordCount");
  params.set("returnGeometry", "false");
  if (where) params.set("where", `${params.get("where")} AND (${where})`);
  params.set("outFields", groupBy);
  params.set("groupByFieldsForStatistics", groupBy);
  params.set("outStatistics", JSON.stringify(statistics));
  params.set("f", "json");
  if (query.options.body) return { url: query.url, options: { method: "POST", body: params } };
  return { url: `${query.url.split("?")[0]}?${params.toString()}`, options: {} };
}

async function loadCurrentTaxRevenue(geography, signal) {
  const query = parcelGroupedStatisticsRequest(geography, [
    { statisticType: "avg", onStatisticField: "NFMTTLVL", outStatisticFieldName: "averageTotal" },
    { statisticType: "count", onStatisticField: "NFMTTLVL", outStatisticFieldName: "totalCount" },
    // Land and improvement totals let split-rate scenarios be recalculated locally.
    { statisticType: "avg", onStatisticField: "NFMLNDVL", outStatisticFieldName: "averageLand" },
    { statisticType: "count", onStatisticField: "NFMLNDVL", outStatisticFieldName: "landCount" },
    { statisticType: "avg", onStatisticField: "NFMIMPVL", outStatisticFieldName: "averageImprovement" },
    { statisticType: "count", onStatisticField: "NFMIMPVL", outStatisticFieldName: "improvementCount" },
  ]);
  const response = await fetch(query.url, {
    ...query.options,
    signal,
    headers: { Accept: "application/json" },
  });
  const payload = await response.json();
  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message || `Parcel service returned ${response.status}.`);
  }

  let revenue = 0;
  let ratedCount = 0;
  const byCounty = new Map();
  const byJurisdiction = new Map();
  payload.features?.forEach((feature) => {
    const attributes = feature.attributes || {};
    const details = taxJurisdictionDetails(attributes);
    const { county, rate, jurisdiction } = details;
    const total = Number(attributes.averageTotal) * Number(attributes.totalCount);
    const count = Number(attributes.totalCount);
    if (Number.isFinite(rate) && Number.isFinite(total) && Number.isFinite(count)) {
      const countyRevenue = total * rate;
      revenue += countyRevenue;
      byCounty.set(county, (byCounty.get(county) || 0) + countyRevenue);
      const existing = byJurisdiction.get(jurisdiction) || {
        ...details,
        parcelCount: 0,
        totalValue: 0,
        landValue: 0,
        improvementValue: 0,
        currentTax: 0,
      };
      const groupSum = (average, groupCount) => {
        const value = Number(average) * Number(groupCount);
        return Number.isFinite(value) ? value : 0;
      };
      existing.parcelCount += count;
      existing.totalValue += total;
      existing.landValue += groupSum(attributes.averageLand, attributes.landCount);
      existing.improvementValue += groupSum(attributes.averageImprovement, attributes.improvementCount);
      existing.currentTax += countyRevenue;
      byJurisdiction.set(jurisdiction, existing);
      ratedCount += count;
    }
  });
  return {
    revenue: ratedCount ? revenue : null,
    byCounty,
    byJurisdiction,
  };
}

const REST_OF_COUNTY_LABEL = "Rest of county";

function taxBreakdownRow(tagName, className, label, amount) {
  const row = document.createElement(tagName);
  row.className = className;
  const name = document.createElement("span");
  name.textContent = label;
  const value = document.createElement("strong");
  value.textContent = formatCompactCurrency(amount);
  row.append(name, value);
  return row;
}

// Groups jurisdiction totals into counties. Each county lists its distinct-rate
// municipalities (largest current tax first) followed by its rest-of-county entry.
// Counties are ordered by current tax, largest first.
function groupJurisdictionsByCounty(byJurisdiction) {
  const counties = new Map();
  byJurisdiction.forEach((details) => {
    const county = counties.get(details.county) || {
      name: details.county,
      currentTax: 0,
      landValue: 0,
      improvementValue: 0,
      municipalities: [],
      rest: null,
    };
    county.currentTax += details.currentTax;
    county.landValue += details.landValue || 0;
    county.improvementValue += details.improvementValue || 0;
    if (details.municipality) {
      county.municipalities.push(details);
    } else {
      county.rest = details;
    }
    counties.set(details.county, county);
  });
  return [...counties.values()]
    .map((county) => {
      county.municipalities.sort((a, b) => b.currentTax - a.currentTax);
      county.jurisdictions = [...county.municipalities, county.rest].filter(Boolean);
      return county;
    })
    .sort((a, b) => b.currentTax - a.currentTax);
}

function updateCurrentTaxCountyResults(byJurisdiction) {
  const container = elements.taxCurrentCountyResults;
  resetTaxCountyResults(container);
  if (!byJurisdiction?.size) {
    container.hidden = true;
    return;
  }

  const countyRowClass = "tax-model-county-row tax-model-county-row--county";
  const subRowClass = "tax-model-county-row tax-model-county-row--sub";
  groupJurisdictionsByCounty(byJurisdiction).forEach((county) => {
    if (!county.municipalities.length) {
      container.append(taxBreakdownRow("div", countyRowClass, county.name, county.currentTax));
      return;
    }

    const breakdown = document.createElement("ul");
    breakdown.className = "tax-county-breakdown";
    breakdown.setAttribute("aria-label", `${county.name} breakdown by tax rate`);
    county.jurisdictions.forEach((details) => breakdown.append(taxBreakdownRow(
      "li",
      subRowClass,
      `${details.municipality || REST_OF_COUNTY_LABEL} (${formatTaxRate(details.rate)})`,
      details.currentTax,
    )));

    const group = document.createElement("details");
    group.className = "tax-county-group";
    group.open = true;
    group.append(taxBreakdownRow("summary", countyRowClass, county.name, county.currentTax), breakdown);
    container.append(group);
  });
  container.hidden = false;
}

function resetTaxCountyResults(container) {
  container.replaceChildren(container.querySelector(".tax-model-breakdown-heading"));
}

// All metrics come from two server statistics requests on the account points layer.
async function loadTaxMetrics(geographyType, geography, signal, onPartial) {
  const summary = {
    landValue: null,
    totalValue: null,
    landValueRatio: null,
    currentTaxRevenue: null,
    sfhCount: null,
    meanSfhLandRatio: null,
    medianSfhLandRatio: null,
  };

  const sfhPromise = loadSfhBenchmarks(geography, signal)
    .then((benchmarks) => {
      Object.assign(summary, benchmarks);
      onPartial(summary);
    })
    .catch((error) => {
      if (error.name === "AbortError") throw error;
      console.warn("Could not calculate SFH benchmarks:", error);
    });
  const ratePromise = resolveCountyTaxRate(geographyType, geography, signal).catch((error) => {
    if (error.name === "AbortError") throw error;
    console.warn("Could not resolve the county tax rate:", error);
    return null;
  });

  const currentTax = await loadCurrentTaxRevenue(geography, signal);
  const jurisdictions = [...currentTax.byJurisdiction.values()];
  const sum = (field) => jurisdictions.reduce((total, details) => total + (details[field] || 0), 0);
  Object.assign(summary, {
    landValue: sum("landValue"),
    totalValue: sum("totalValue"),
    parcelCount: sum("parcelCount"),
    currentTaxRevenue: currentTax.revenue,
    currentTaxByCounty: currentTax.byCounty,
    currentTaxByJurisdiction: currentTax.byJurisdiction,
  });
  summary.landValueRatio = summary.totalValue > 0 ? (summary.landValue / summary.totalValue) * 100 : null;
  onPartial(summary);

  const [countyTaxRate] = await Promise.all([ratePromise, sfhPromise]);
  summary.countyTaxRate = countyTaxRate;
  return summary;
}

function createParcelStyle() {
  return {
    color: TAX_CONFIG.color,
    weight: 1,
    opacity: 0.8,
    fillColor: TAX_CONFIG.fillColor,
    fillOpacity: 0.25,
  };
}

function displayValue(value, fallback = "Not available") {
  return value === null || value === undefined || value === "" ? fallback : value;
}

function formatCurrency(value) {
  const number = Number(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(number)
    : "Not available";
}

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function rowsToCsv(headers, rows) {
  return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n") + "\r\n";
}

function downloadTextFile(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function downloadBaseName(suffix) {
  const geography = formatGeographyName().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  return `parcelanalysismd-${geography || "selected-area"}-${suffix}`;
}

function scenarioSnapshot() {
  const model = taxScenarioModel;
  if (!model) return null;
  const state = { scope: model.scope, rates: structuredClone(model.rates) };
  const unitPairs = revenueNeutralUnits(model);
  const units = unitPairs.map(([key, unit]) => {
    const entry = state.rates[state.scope][key];
    const jurisdictions = unit.counties
      ? unit.counties.flatMap((county) => county.jurisdictions)
      : unit.jurisdictions || [unit];
    const restOfCounty = state.scope === "jurisdiction" && !unit.municipality
      && unitPairs.some(([, other]) => other.municipality && other.county === unit.county);
    return {
      label: state.scope === "all" ? "All counties" : `${key}${restOfCounty ? ` (${REST_OF_COUNTY_LABEL.toLowerCase()})` : ""}`,
      currentRates: [...new Set(jurisdictions.map((details) => details.rate))].sort((a, b) => a - b),
      land: parseRatePercent(entry?.land),
      improvement: parseRatePercent(entry?.improvement),
    };
  });
  return {
    model,
    scopeLabel: taxScenarioScopeLabel(state.scope, model),
    units,
    missing: units
      .filter((unit) => !Number.isFinite(unit.land) || !Number.isFinite(unit.improvement))
      .map((unit) => unit.label),
    ratesFor: (details) => scenarioRatesFor(details, state),
  };
}

function propertyTypeFor(properties) {
  const facts = {
    properties,
    lu: String(properties.LU || "").trim().toUpperCase(),
    improved: properties.NFMIMPVL !== null && properties.NFMIMPVL !== undefined && Number(properties.NFMIMPVL) > 0,
  };
  return PROPERTY_TYPES.find((type) => type.matches(facts));
}

function occupancyGroupFor(value) {
  const code = String(value || "").trim().toUpperCase();
  return OCCUPANCY_GROUPS.find((group) => group.key === code) || OCCUPANCY_GROUPS.at(-1);
}

function landShareStatistics() {
  const statistics = ["NFMTTLVL", "NFMLNDVL", "NFMIMPVL"].flatMap((field) => [
    { statisticType: "avg", onStatisticField: field, outStatisticFieldName: `avg_${field}` },
    { statisticType: "count", onStatisticField: field, outStatisticFieldName: `count_${field}` },
  ]);
  for (let band = 0; band < LAND_SHARE_BANDS; band += 1) {
    const condition = band === 0
      ? "NFMLNDVL = 0"
      : `NFMLNDVL <= NFMTTLVL * ${(band / LAND_SHARE_BANDS).toFixed(4)}`;
    statistics.push({
      statisticType: "sum",
      onStatisticField: `CASE WHEN NFMLNDVL IS NULL OR ${condition} THEN 1 ELSE 0 END`,
      outStatisticFieldName: `landShareAtMost${band}`,
    });
  }
  statistics.push({
    statisticType: "sum",
    onStatisticField: "CASE WHEN NFMLNDVL IS NULL OR NFMLNDVL < NFMTTLVL THEN 1 ELSE 0 END",
    outStatisticFieldName: "landShareBelowOne",
  });
  return statistics;
}

function breakdownCell(propertyType, attributes) {
  const count = Number(attributes.count_NFMTTLVL) || 0;
  const valueTotal = (field) => {
    const value = Number(attributes[`avg_${field}`]) * Number(attributes[`count_${field}`]);
    return Number.isFinite(value) ? value : 0;
  };
  const share = (value) => (count ? (Number(value) || 0) / count : 0);
  return {
    propertyType: propertyType.key,
    occupancy: occupancyGroupFor(attributes.OOI).key,
    details: taxJurisdictionDetails(attributes),
    count,
    totalValue: valueTotal("NFMTTLVL"),
    landValue: valueTotal("NFMLNDVL"),
    improvementValue: valueTotal("NFMIMPVL"),
    landShareAtMost: Array.from({ length: LAND_SHARE_BANDS }, (_, band) => share(attributes[`landShareAtMost${band}`])),
    landShareBelowOne: share(attributes.landShareBelowOne),
  };
}

// One cell per property type × tax jurisdiction × occupancy code.
async function loadTaxBreakdownCells(geography, signal) {
  const statistics = landShareStatistics();
  const message = "Calculating who pays more and who pays less…";
  let completed = 0;
  showParcelLoadProgress(message, completed, PROPERTY_TYPES.length);
  const groups = await Promise.all(PROPERTY_TYPES.map(async (propertyType) => {
    const query = parcelGroupedStatisticsRequest(geography, statistics, {
      where: propertyType.where,
      groupBy: "JURSCODE,TOWNCODE,DESCTOWN,OOI",
    });
    const response = await fetch(query.url, { ...query.options, signal, headers: { Accept: "application/json" } });
    const payload = await response.json();
    if (!response.ok || payload.error) {
      throw new Error(payload.error?.message || `Parcel service returned ${response.status}.`);
    }
    completed += 1;
    showParcelLoadProgress(message, completed, PROPERTY_TYPES.length);
    return (payload.features || []).map(({ attributes = {} }) => breakdownCell(propertyType, attributes));
  }));
  return groups.flat().filter((cell) => cell.count > 0);
}

// Within a tax jurisdiction, a bill's fractional change is base + slope × land share.
function cellScenario(cell, ratesFor) {
  const rates = ratesFor(cell.details);
  const currentRate = cell.details.rate;
  if (!rates || !Number.isFinite(currentRate) || currentRate <= 0) return null;
  return {
    currentTax: cell.totalValue * currentRate,
    hypotheticalTax: cell.landValue * rates.land + cell.improvementValue * rates.improvement,
    base: rates.improvement / currentRate - 1,
    slope: (rates.land - rates.improvement) / currentRate,
  };
}

// Share of a cell's accounts with land share ≤ x, interpolated linearly within each band.
function landShareAtMost(cell, x) {
  if (x < 0) return 0;
  if (x >= 1) return 1;
  const position = x * LAND_SHARE_BANDS;
  const band = Math.floor(position);
  const lower = cell.landShareAtMost[band];
  const upper = band + 1 < LAND_SHARE_BANDS ? cell.landShareAtMost[band + 1] : cell.landShareBelowOne;
  return lower + (upper - lower) * (position - band);
}

// Share with land share < x. Differs from landShareAtMost only at the 0% and 100% atoms.
function landShareBelow(cell, x) {
  if (x <= 0) return 0;
  if (x === 1) return cell.landShareBelowOne;
  return landShareAtMost(cell, x);
}

function changeShareAtMost(cell, change) {
  const { base, slope } = cell.scenario;
  if (Math.abs(slope) < 1e-9) return change >= base ? 1 : 0;
  const x = (change - base) / slope;
  return slope > 0 ? landShareAtMost(cell, x) : 1 - landShareBelow(cell, x);
}

function changeShareBelow(cell, change) {
  const { base, slope } = cell.scenario;
  if (Math.abs(slope) < 1e-9) return change > base ? 1 : 0;
  const x = (change - base) / slope;
  return slope > 0 ? landShareBelow(cell, x) : 1 - landShareAtMost(cell, x);
}

function medianChange(cells, count) {
  const shareAtMost = (change) =>
    cells.reduce((total, cell) => total + cell.count * changeShareAtMost(cell, change), 0) / count;
  let low = Math.min(...cells.map(({ scenario }) => Math.min(scenario.base, scenario.base + scenario.slope)));
  let high = Math.max(...cells.map(({ scenario }) => Math.max(scenario.base, scenario.base + scenario.slope)));
  if (shareAtMost(low) >= 0.5) return low;
  for (let step = 0; step < 50; step += 1) {
    const middle = (low + high) / 2;
    if (shareAtMost(middle) >= 0.5) high = middle;
    else low = middle;
  }
  return high;
}

function summarizeCells(cells) {
  const priced = cells.filter((cell) => cell.scenario);
  const count = priced.reduce((total, cell) => total + cell.count, 0);
  if (!count) return null;
  const sum = (read) => priced.reduce((total, cell) => total + read(cell), 0);
  const currentTax = sum((cell) => cell.scenario.currentTax);
  const hypotheticalTax = sum((cell) => cell.scenario.hypotheticalTax);
  const payingLess = sum((cell) => cell.count * changeShareBelow(cell, -ABOUT_THE_SAME_THRESHOLD)) / count;
  const payingMore = sum((cell) => cell.count * (1 - changeShareAtMost(cell, ABOUT_THE_SAME_THRESHOLD))) / count;
  return {
    count,
    currentTax,
    hypotheticalTax,
    change: hypotheticalTax - currentTax,
    payingLess,
    payingMore,
    aboutTheSame: Math.max(0, 1 - payingLess - payingMore),
    medianChange: medianChange(priced, count),
    averageChange: (hypotheticalTax - currentTax) / count,
  };
}

const NOT_AVAILABLE_TEXT = "n/a";

function formatTextCurrency(value) {
  return Number.isFinite(value) ? formatCurrency(value) : NOT_AVAILABLE_TEXT;
}

function formatSignedCurrency(value) {
  return Number.isFinite(value)
    ? new Intl.NumberFormat("en-US", {
      style: "currency", currency: "USD", maximumFractionDigits: 0, signDisplay: "exceptZero",
    }).format(Math.round(value))
    : NOT_AVAILABLE_TEXT;
}

function formatShare(fraction) {
  return Number.isFinite(fraction) ? formatPercent(fraction * 100) : NOT_AVAILABLE_TEXT;
}

function formatSignedShare(fraction) {
  return Number.isFinite(fraction)
    ? `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, signDisplay: "exceptZero" }).format(fraction * 100)}%`
    : NOT_AVAILABLE_TEXT;
}

function formatRatePercentText(rate) {
  return Number.isFinite(rate) ? `${formatRateInput(rate)}%` : "not entered";
}

function formatCountText(value) {
  return Number.isFinite(value) ? Math.round(value).toLocaleString("en-US") : NOT_AVAILABLE_TEXT;
}

// Plain-text table: first column left-aligned, the rest right-aligned.
function textTable(headers, rows) {
  const widths = headers.map((header, column) =>
    Math.max(header.length, ...rows.map((row) => String(row[column]).length)));
  const line = (cells) => cells
    .map((cell, column) => (column === 0 ? String(cell).padEnd(widths[column]) : String(cell).padStart(widths[column])))
    .join("   ")
    .trimEnd();
  return [line(headers), line(widths.map((width) => "-".repeat(width))), ...rows.map(line)];
}

function breakdownTables(groups, all) {
  const rows = [...groups.filter((group) => group.summary), { label: "All parcels", summary: all }];
  const totals = textTable(
    ["Group", "Parcels", "Current tax", "Hypothetical tax", "Change", "Change %", "Share now", "Share after"],
    rows.map(({ label, summary }) => [
      label,
      formatCountText(summary.count),
      formatTextCurrency(summary.currentTax),
      formatTextCurrency(summary.hypotheticalTax),
      formatSignedCurrency(summary.change),
      formatSignedShare(summary.currentTax ? summary.change / summary.currentTax : Number.NaN),
      formatShare(summary.currentTax / all.currentTax),
      formatShare(summary.hypotheticalTax / all.hypotheticalTax),
    ]),
  );
  const distribution = textTable(
    ["Group", "Pay less", "About the same", "Pay more", "Median change", "Avg change per parcel"],
    rows.map(({ label, summary }) => [
      label,
      formatShare(summary.payingLess),
      formatShare(summary.aboutTheSame),
      formatShare(summary.payingMore),
      formatSignedShare(summary.medianChange),
      formatSignedCurrency(summary.averageChange),
    ]),
  );
  return ["", ...totals, "", ...distribution];
}

function placeGroups(cells, model) {
  return model.counties.flatMap((county) => {
    const countyCells = cells.filter((cell) => cell.details.county === county.name);
    const countyGroup = { label: county.name, summary: summarizeCells(countyCells) };
    if (!county.municipalities.length) return [countyGroup];
    return [
      countyGroup,
      ...county.jurisdictions.map((details) => ({
        label: `  ${details.municipality || REST_OF_COUNTY_LABEL}`,
        summary: summarizeCells(countyCells.filter((cell) => cell.details.jurisdiction === details.jurisdiction)),
      })),
    ];
  });
}

async function summaryText(signal) {
  const summary = latestTaxSummary || {};
  const scenario = scenarioSnapshot();
  const scenarioComplete = Boolean(scenario && !scenario.missing.length);
  let cells = [];
  if (scenarioComplete) {
    cells = (await loadTaxBreakdownCells(selectedGeography, signal)).map((cell) => ({
      ...cell,
      scenario: cellScenario(cell, scenario.ratesFor),
    }));
  }
  const all = summarizeCells(cells);
  const unpricedCount = cells.filter((cell) => !cell.scenario).reduce((total, cell) => total + cell.count, 0);

  const lines = [];
  const heading = (title) => lines.push("", "", title.toUpperCase(), "=".repeat(title.length));
  const subheading = (title) => lines.push("", title, "-".repeat(title.length));
  const field = (label, value) => lines.push(`${`${label}:`.padEnd(36)}${value}`);

  lines.push("PARCEL ANALYSIS MD - SPLIT-RATE PROPERTY TAX SUMMARY", "");
  field("Geography", formatGeographyName());
  field("Geography type", summary.geographyTypeLabel || NOT_AVAILABLE_TEXT);
  field("Parcel data loaded", summary.loadedAt || NOT_AVAILABLE_TEXT);
  field("Report generated", new Date().toISOString());
  lines.push("", "County real property tax only. Read CAVEATS before citing these figures.");

  heading("Scenario settings");
  if (!scenario) {
    lines.push("No split-rate scenario is available for this selection.");
  } else {
    field("Rate settings", scenario.scopeLabel);
    lines.push("", ...textTable(
      ["Applies to", "Current rate", "Land rate", "Improvement rate", "Land : improvement"],
      scenario.units.map((unit) => [
        unit.label,
        unit.currentRates.length === 1
          ? formatRatePercentText(unit.currentRates[0])
          : `${formatRatePercentText(unit.currentRates[0])} to ${formatRatePercentText(unit.currentRates.at(-1))}`,
        formatRatePercentText(unit.land),
        formatRatePercentText(unit.improvement),
        !Number.isFinite(unit.land) || !Number.isFinite(unit.improvement) ? NOT_AVAILABLE_TEXT
          : unit.improvement > 0 ? `${Number((unit.land / unit.improvement).toFixed(2))} : 1`
            : unit.land > 0 ? "land only" : NOT_AVAILABLE_TEXT,
      ]),
    ));
    lines.push("", "Rates are percent of assessed value ($ per $100). Current rate is the county rate, or the rate applied inside a municipality where it differs.");
    if (scenario.missing.length) {
      lines.push("", `Hypothetical results are omitted because land and improvement rates have not been entered for: ${scenario.missing.join("; ")}.`);
    }
  }

  heading("Headline");
  if (all) {
    field("Current county property tax", formatTextCurrency(all.currentTax));
    field("Hypothetical split-rate tax", formatTextCurrency(all.hypotheticalTax));
    field("Change", `${formatSignedCurrency(all.change)} (${formatSignedShare(all.change / all.currentTax)})`);
    field("Parcels paying less", `${formatShare(all.payingLess)} (about ${formatCountText(all.payingLess * all.count)})`);
    field("Parcels paying about the same", `${formatShare(all.aboutTheSame)} (about ${formatCountText(all.aboutTheSame * all.count)})`);
    field("Parcels paying more", `${formatShare(all.payingMore)} (about ${formatCountText(all.payingMore * all.count)})`);
    const homes = summarizeCells(cells.filter((cell) => cell.propertyType === "sfh" && cell.occupancy === "H"));
    if (homes) {
      lines.push("", `Owner-occupied single-family homes (${formatCountText(homes.count)}): median bill change ${formatSignedShare(homes.medianChange)}, average change ${formatSignedCurrency(homes.averageChange)} per home, ${formatShare(homes.payingLess)} pay less.`);
    }
    if (unpricedCount) {
      lines.push("", `${formatCountText(unpricedCount)} accounts without a known county tax rate are excluded from the hypothetical results.`);
    }
  } else {
    field("Current county property tax", formatTextCurrency(summary.currentTaxRevenue));
    lines.push("", "Hypothetical results are not available for these scenario settings.");
  }

  heading("Key metrics");
  field("Taxable accounts", formatCountText(summary.parcelCount));
  field("Total land value", formatTextCurrency(summary.landValue));
  field("Total assessed value", formatTextCurrency(summary.totalValue));
  field("Land share of assessed value", Number.isFinite(summary.landValueRatio) ? formatPercent(summary.landValueRatio) : NOT_AVAILABLE_TEXT);
  field("Qualifying single-family homes", formatCountText(summary.sfhCount));
  field("Mean SFH land share", formatShare(summary.meanSfhLandRatio));
  field("Median SFH land share", formatShare(summary.medianSfhLandRatio));

  if (all) {
    heading("Who pays more and who pays less");
    lines.push("Change = hypothetical split-rate bill minus current bill. Pay less / more and median change are estimates (see DEFINITIONS).");
    subheading("By property type");
    lines.push(...breakdownTables(PROPERTY_TYPES.map((type) => ({
      label: type.label,
      summary: summarizeCells(cells.filter((cell) => cell.propertyType === type.key)),
    })), all));
    subheading("By owner occupancy");
    lines.push(...breakdownTables(OCCUPANCY_GROUPS.map((group) => ({
      label: group.label,
      summary: summarizeCells(cells.filter((cell) => cell.occupancy === group.key)),
    })), all));
    subheading("By place (tax jurisdiction)");
    lines.push(...breakdownTables(placeGroups(cells, scenario.model), all));
  }

  heading("Caveats");
  [
    "Covers county real property tax only. State, municipal, and special district taxes are not included.",
    "Includes taxable accounts only: assessed value above $0 and no exemption class.",
    "Bills are assessed value x rate. Homestead Tax Credit caps, Homeowners' Tax Credits, assessment phase-ins, and other credits are not modeled, so actual bills (especially for long-held owner-occupied homes) can be lower, and the change for those owners can differ.",
    "County and municipal rates are the rates configured in this tool. Check them against current published rates before citing results.",
    "Pay less / about the same / pay more shares and median changes are estimated from parcel counts in 5-point land-share bands. Tax totals, changes, shares of tax, and averages are exact sums.",
  ].forEach((text) => lines.push(`- ${text}`));

  heading("Definitions");
  [
    "Current bill: assessed value x current rate.",
    "Hypothetical bill: land value x land rate + improvement value x improvement rate, using the rates for the account's tax jurisdiction.",
    "Change / Change %: hypothetical minus current tax, in dollars and as a percent of current tax.",
    "Share now / Share after: the group's share of all current / hypothetical tax in the selection.",
    `Pay less / Pay more: the bill falls / rises by more than ${formatPercent(ABOUT_THE_SAME_THRESHOLD * 100)}. About the same: within ${formatPercent(ABOUT_THE_SAME_THRESHOLD * 100)} either way.`,
    "Median change: the middle percent change in bills among the group's accounts.",
    "Avg change per parcel: total change divided by the number of accounts.",
    "Land share: land value / total assessed value. Within a tax jurisdiction, a bill's percent change depends only on its land share, so shares and medians are estimated from counts of accounts at each 5-point land-share step (0%, 5%, ..., 95%, 100%), interpolated within each step.",
    "Owner occupancy: SDAT owner-occupancy code. H = owner-occupied principal residence; N = not owner-occupied; D is reported separately because its meaning is not documented here; Not reported = blank.",
    "Qualifying single-family homes: accounts used for the SFH benchmarks (residential land use, structure square footage > 0, single-family building types). Mean / Median SFH land share use these accounts.",
    "Property types (each account counts in the first type it matches, in this order):",
  ].forEach((text) => lines.push(`- ${text}`));
  PROPERTY_TYPES.forEach((type) => lines.push(`    ${type.label}: ${type.definition}`));

  heading("Source");
  lines.push(`Maryland iMAP parcel points (one per tax account): ${PARCEL_POINTS_LAYER_URL}`);
  lines.push(`Base filter: ${TAX_CONFIG.where}`);

  return `${lines.join("\r\n")}\r\n`;
}

async function loadParcelDistricts(counties, signal) {
  const loadDistricts = async (type) => {
    const response = await fetch(geographyQueryUrl(type), {
      signal,
      headers: { Accept: "application/geo+json, application/json" },
    });
    const payload = await response.json();
    if (!response.ok || payload.error || payload.type !== "FeatureCollection") {
      throw new Error(payload.error?.message || `District service returned ${response.status}.`);
    }
    return (payload.features || [])
      .filter((feature) => feature.geometry && feature.properties?.DISTRICT)
      .map((feature) => ({
        value: String(feature.properties.DISTRICT).trim(),
        contains: createPointInGeometryTester(feature.geometry),
      }));
  };
  const councilSources = GEOGRAPHY_CONFIG.countyCouncil.sources.filter((source) => counties.has(source.county));
  const loadCouncilDistricts = async () => (await loadCountyCouncilChoices(signal, councilSources)).map((feature) => ({
    county: feature.properties.COUNTY,
    value: feature.properties.GEOGRAPHY_LABEL.split(" — ").slice(1).join(" — "),
    contains: createPointInGeometryTester(feature.geometry),
  }));
  const names = ["legislative", "congressional", "county council"];
  const results = await Promise.allSettled([
    loadDistricts("assembly"),
    loadDistricts("congressional"),
    councilSources.length ? loadCouncilDistricts() : [],
  ]);
  if (signal.aborted) throw new DOMException("The request was aborted.", "AbortError");
  const [legislative, congressional, council] = results.map((result, index) => {
    if (result.status === "fulfilled") return result.value;
    console.warn(`Could not load ${names[index]} districts for the parcel export:`, result.reason);
    return [];
  });
  return { legislative, congressional, council };
}

function findDistrict(districts, point) {
  return point ? districts.find((district) => district.contains(point))?.value ?? "" : "";
}

function roundCents(value) {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : "";
}

function metadataText() {
  const accessed = latestTaxSummary?.loadedAt || new Date().toISOString();
  const threshold = formatPercent(ABOUT_THE_SAME_THRESHOLD * 100);
  return `Parcel Analysis MD tax analysis export metadata

All exports cover taxable accounts only: ${TAX_CONFIG.where}
Each account is one point in the Maryland iMAP parcel points layer (condominium units are separate accounts).
Tax figures are county real property tax only. Homestead and Homeowners' tax credits, assessment phase-ins, and other credits are not modeled.

SUMMARY STATISTICS (TXT)
Plain-text report with these sections:
- Header: geography, geography type, when parcel data was loaded, and when the report was generated.
- Scenario settings: the rate-setting mode and, for each editable row, current rate, land rate, improvement rate, and land : improvement ratio. Hypothetical sections are omitted when any rate is not entered.
- Headline: current and hypothetical county tax, the change, the share of accounts paying less, about the same, and more, and results for owner-occupied single-family homes.
- Key metrics: taxable accounts, land and assessed value totals, land share, and SFH benchmark values.
- Who pays more and who pays less: by property type, by owner occupancy, and by place (county, then municipalities with a distinct rate and the rest of the county). For each group:
  - Parcels, Current tax, Hypothetical tax, Change, Change % (of current tax).
  - Share now / Share after: the group's share of all current / hypothetical tax in the selection.
  - Pay less / Pay more: bill falls / rises by more than ${threshold}. About the same: within ${threshold}.
  - Median change: middle percent change in bills. Avg change per parcel: total change / accounts.
- Caveats, definitions, and source.
Estimation: tax totals, changes, tax shares, and averages are exact sums. Within a tax jurisdiction, a bill's percent change depends only on the account's land share (land value / total assessed value), so pay less / about the same / pay more shares and medians are estimated from counts of accounts at each 5-point land-share step (0%, 5%, ..., 95%, 100%), interpolated within each step.

Property types (each account counts in the first type it matches, in this order):
${PROPERTY_TYPES.map((type) => `- ${type.label}: ${type.definition}`).join("\n")}

Owner occupancy (SDAT owner-occupancy code, OOI):
- H: owner-occupied principal residence.
- N: not owner-occupied.
- D: reported separately; its meaning is not documented here.
- Not reported: blank code.

SFH benchmarks:
- Qualifying SFH parcel count: accounts with LU = R, SQFTSTRC > 0, and DESCBLDG one of ${SFH_BUILDING_TYPES.join(", ")}. Row/townhouses, condos, and mobile homes are excluded.
- Mean / Median SFH land share: arithmetic mean / median of qualifying SFH land-to-total assessment ratios.

DETAILED PARCEL CSV
Columns:
- ACCTID: tax account identifier.
- ADDRESS, street fields, CITY, ZIPCODE: address attributes from Maryland iMAP.
- DESCLU, LU, DESCBLDG, ACRES, SQFTSTRC, YEARBLT, ZONING, BLDG_UNITS, OOI: selected parcel characteristics.
- PROPERTY_TYPE: report property type (see Property types above).
- OWNER_OCCUPANCY: report owner-occupancy group (see Owner occupancy above).
- NFMLNDVL: land assessment; blank values are exported as 0.
- NFMIMPVL: improvement assessment; blank values are exported as 0.
- NFMTTLVL: total assessment.
- JURSCODE, TOWNCODE, DESCTOWN: source jurisdiction attributes.
- COUNTY: county from JURSCODE.
- TAX_MUNICIPALITY: municipality whose rate differs from the county rate; blank for the rest of the county.
- LEGISLATIVE_DISTRICT: Maryland General Assembly district containing the account point.
- CONGRESSIONAL_DISTRICT: U.S. congressional district containing the account point.
- COUNTY_COUNCIL_DISTRICT: county council or commissioner district containing the account point.
  District columns are blank when the point falls outside every boundary or a boundary service could not be loaded.
- APPLICABLE_TAX_RATE_PERCENT: current county rate, or the municipal rate where it differs.
- PREDICTED_TAX_BILL: NFMTTLVL x applicable rate.
- SPLIT_LAND_RATE_PERCENT / SPLIT_IMPROVEMENT_RATE_PERCENT: scenario rates for the account's tax jurisdiction at export time.
- HYPOTHETICAL_SPLIT_RATE_BILL: land assessment x split land rate + improvement assessment x split improvement rate.
- BILL_CHANGE: HYPOTHETICAL_SPLIT_RATE_BILL - PREDICTED_TAX_BILL.
- BILL_CHANGE_PERCENT: BILL_CHANGE as a percent of PREDICTED_TAX_BILL.
  Split-rate, hypothetical, and change columns are blank when a rate is not entered or not known.
- UNDERUTILIZED_VACANT: 1 when there is no assessed value for improvements, or improvements = $0.
- UNDERUTILIZED_LAND_MAJORITY: 1 when land value is greater than improvements value.
- UNDERUTILIZED_HIGH_VALUE_URBAN: 1 when land value is at least $1M and greater than improvements value, and the account is in an urban area (cluster with population greater than 2,000).
- UNDERUTILIZED_ABOVE_MEAN_SFH_LAND_RATIO: 1 when a non-SFH account's land-to-total assessment ratio is greater than the mean for qualifying SFH accounts in the selection.
- UNDERUTILIZED_ABOVE_MEDIAN_SFH_LAND_RATIO: 1 when a non-SFH account's land-to-total assessment ratio is greater than the median for qualifying SFH accounts in the selection.

Source: Maryland iMAP parcel points: ${PARCEL_POINTS_LAYER_URL}. Accessed ${accessed}.
`;
}

function ensureUrbanFeatures() {
  if (!urbanFeaturesPromise) {
    const params = new URLSearchParams({ where: "1=1", outFields: "*", returnGeometry: "true", outSR: "4326", f: "geojson" });
    urbanFeaturesPromise = fetch("https://mdgeodata.md.gov/imap/rest/services/Boundaries/MD_CensusStatisticalBoundaries/FeatureServer/4/query?" + params)
      .then((response) => response.json())
      .then((payload) => {
        if (payload.error || payload.type !== "FeatureCollection") throw new Error("Urban-area service returned an invalid response.");
        return payload.features || [];
      })
      .catch((error) => {
        urbanFeaturesPromise = null;
        throw error;
      });
  }
  return urbanFeaturesPromise;
}

async function loadTaxRecordsForDownload(signal) {
  if (!selectedGeography) throw new Error("No parcel selection is available to export.");
  setStatus("Loading parcel attributes for export…", "loading");
  const parcelIds = await loadGeographyParcelIds(selectedGeography, signal);
  const idQuery = buildParcelQuery(selectedGeography);
  const records = [];
  const batchSize = 500;
  for (let start = 0; start < parcelIds.length; start += batchSize) {
    const batchParams = new URLSearchParams(idQuery.options.body);
    batchParams.delete("geometry");
    batchParams.delete("geometryType");
    batchParams.delete("inSR");
    batchParams.delete("spatialRel");
    batchParams.delete("where");
    batchParams.set("objectIds", parcelIds.slice(start, start + batchSize).join(","));
    batchParams.set("returnGeometry", "true");
    batchParams.set("outSR", "4326");
    batchParams.set("outFields", PARCEL_OUT_FIELDS);
    batchParams.set("f", "geojson");
    const response = await fetch(idQuery.url, {
      method: "POST",
      body: batchParams,
      signal,
      headers: { Accept: "application/geo+json, application/json" },
    });
    const payload = await response.json();
    if (!response.ok || payload.error || payload.type !== "FeatureCollection") {
      throw new Error(payload.error?.message || `Parcel service returned ${response.status}.`);
    }
    records.push(...(payload.features || []).map((feature) => ({
      properties: feature.properties || {},
      center: geometryCenter(feature.geometry),
    })));
    showParcelLoadProgress("Preparing parcel export…", records.length, parcelIds.length);
  }
  return records;
}

async function detailedParcelCsv(signal) {
  const scenario = scenarioSnapshot();
  const records = await loadTaxRecordsForDownload(signal);
  setStatus("Matching parcels to districts and urban areas…", "loading");
  const counties = new Set(records.map(({ properties }) => taxJurisdictionDetails(properties).county));
  const [urbanFeatures, districts] = await Promise.all([
    ensureUrbanFeatures(),
    loadParcelDistricts(counties, signal),
  ]);
  const meanSfhLandRatio = latestTaxSummary?.meanSfhLandRatio ?? null;
  const medianSfhLandRatio = latestTaxSummary?.medianSfhLandRatio ?? null;
  const headers = [
    "ACCTID", "ADDRESS", "STRTNUM", "STRTDIR", "STRTNAM", "STRTTYP", "STRTSFX", "STRTUNT",
    "CITY", "ZIPCODE", "DESCLU", "LU", "DESCBLDG", "PROPERTY_TYPE", "ACRES", "SQFTSTRC", "YEARBLT",
    "NFMLNDVL", "NFMIMPVL", "NFMTTLVL", "ZONING", "BLDG_UNITS", "OOI", "OWNER_OCCUPANCY",
    "JURSCODE", "TOWNCODE", "DESCTOWN", "COUNTY", "TAX_MUNICIPALITY",
    "LEGISLATIVE_DISTRICT", "CONGRESSIONAL_DISTRICT", "COUNTY_COUNCIL_DISTRICT",
    "APPLICABLE_TAX_RATE_PERCENT", "PREDICTED_TAX_BILL", "SPLIT_LAND_RATE_PERCENT", "SPLIT_IMPROVEMENT_RATE_PERCENT",
    "HYPOTHETICAL_SPLIT_RATE_BILL", "BILL_CHANGE", "BILL_CHANGE_PERCENT",
    "UNDERUTILIZED_VACANT", "UNDERUTILIZED_LAND_MAJORITY",
    "UNDERUTILIZED_HIGH_VALUE_URBAN", "UNDERUTILIZED_ABOVE_MEAN_SFH_LAND_RATIO",
    "UNDERUTILIZED_ABOVE_MEDIAN_SFH_LAND_RATIO",
  ];
  const rows = records.map(({ center, properties }) => {
    const land = Number(properties.NFMLNDVL);
    const total = Number(properties.NFMTTLVL);
    const improvement = properties.NFMIMPVL === null || properties.NFMIMPVL === undefined
      ? 0
      : Number(properties.NFMIMPVL);
    const ratio = Number.isFinite(land) && Number.isFinite(total) && total > 0 ? land / total : null;
    const isUrban = center && urbanFeatures.some((urban) => urban.geometry && pointInGeometry(center, urban.geometry));
    const vacant = properties.NFMIMPVL === null || properties.NFMIMPVL === undefined
      ? Number.isFinite(land) && Number.isFinite(total) && land === total
      : improvement === 0;
    const landMajority = Number.isFinite(land) && Number.isFinite(total) && land > total / 2;
    const highValueUrban = Number.isFinite(land) && land >= 1000000 && landMajority && isUrban;
    const isSfh = isSingleFamilyParcel(properties);
    const aboveMeanSfh = !isSfh && ratio !== null && meanSfhLandRatio !== null && ratio > meanSfhLandRatio;
    const aboveMedianSfh = !isSfh && ratio !== null && medianSfhLandRatio !== null && ratio > medianSfhLandRatio;
    const details = taxJurisdictionDetails(properties);
    const actualRate = details.rate;
    const predictedTax = Number.isFinite(total) && Number.isFinite(actualRate) ? total * actualRate : null;
    const rates = scenario && Number.isFinite(actualRate) ? scenario.ratesFor(details) : null;
    const hypotheticalTax = rates
      ? (Number.isFinite(land) ? land * rates.land : 0) + improvement * rates.improvement
      : null;
    const change = predictedTax !== null && hypotheticalTax !== null ? hypotheticalTax - predictedTax : null;
    const councilDistricts = districts.council.filter((district) => district.county === details.county);
    return [
      properties.ACCTID, properties.ADDRESS, properties.STRTNUM, properties.STRTDIR,
      properties.STRTNAM, properties.STRTTYP, properties.STRTSFX, properties.STRTUNT, properties.CITY, properties.ZIPCODE,
      properties.DESCLU, properties.LU, properties.DESCBLDG, propertyTypeFor(properties).label,
      properties.ACRES, properties.SQFTSTRC, properties.YEARBLT, land, improvement, total,
      properties.ZONING, properties.BLDG_UNITS, properties.OOI, occupancyGroupFor(properties.OOI).label,
      properties.JURSCODE, properties.TOWNCODE, properties.DESCTOWN, details.county, details.municipality ?? "",
      findDistrict(districts.legislative, center), findDistrict(districts.congressional, center),
      findDistrict(councilDistricts, center),
      Number.isFinite(actualRate) ? formatRateInput(actualRate) : "", roundCents(predictedTax),
      rates ? formatRateInput(rates.land) : "", rates ? formatRateInput(rates.improvement) : "",
      roundCents(hypotheticalTax), roundCents(change),
      change !== null && predictedTax > 0 ? Number(((change / predictedTax) * 100).toFixed(2)) : "",
      vacant ? 1 : 0, landMajority ? 1 : 0, highValueUrban ? 1 : 0,
      aboveMeanSfh ? 1 : 0, aboveMedianSfh ? 1 : 0,
    ];
  });
  return rowsToCsv(headers, rows);
}

function setDownloadButtonsDisabled(disabled) {
  [elements.downloadSummary, elements.downloadParcels, elements.downloadMetadata].forEach((button) => {
    button.disabled = disabled;
  });
}

async function runDownload(task, successMessage) {
  if (downloadRequest) return;
  const controller = new AbortController();
  downloadRequest = controller;
  setDownloadButtonsDisabled(true);
  try {
    await task(controller.signal);
    setStatus(successMessage, "success");
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error(error);
      setStatus(`Could not create the download. ${error.message}`, "error");
    }
  } finally {
    if (downloadRequest === controller) {
      downloadRequest = null;
      setDownloadButtonsDisabled(false);
      hideParcelLoadProgress();
    }
  }
}

function formatTaxRate(value) {
  const number = Number(value);
  return Number.isFinite(number)
    ? `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(number * 100)}%`
    : "Not available";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function taxPopupDetails(properties) {
  const totalValue = Number(properties.NFMTTLVL);
  const landValue = Number(properties.NFMLNDVL);
  const improvementValue = Number(properties.NFMIMPVL);
  const currentRate = taxRateForParcel(properties);
  const currentTax = Number.isFinite(totalValue) && Number.isFinite(currentRate)
    ? totalValue * currentRate
    : null;
  const scenarioRates = taxScenarioModel ? scenarioRatesFor(taxJurisdictionDetails(properties)) : null;
  const hypotheticalTax = !taxScenarioModel
    ? currentTax
    : scenarioRates
      ? (Number.isFinite(landValue) ? landValue * scenarioRates.land : 0)
        + (Number.isFinite(improvementValue) ? improvementValue * scenarioRates.improvement : 0)
      : null;

  return {
    currentRate,
    currentTax,
    hypotheticalTax,
  };
}

function popupMarkup(properties) {
  const address = [
    properties.STRTNUM,
    properties.STRTDIR,
    properties.STRTNAM,
    properties.STRTTYP,
    properties.STRTSFX,
    properties.STRTUNT,
  ]
    .filter(Boolean)
    .join(" ");
  const title = displayValue(properties.ADDRESS, address || "Selected parcel");

  const taxDetails = taxPopupDetails(properties);

  return `
    <div class="parcel-popup">
      <h3>${escapeHtml(title)}</h3>
      <dl>
        <dt>Account</dt><dd>${escapeHtml(displayValue(properties.ACCTID))}</dd>
        <dt>City / ZIP</dt><dd>${escapeHtml(displayValue(properties.CITY))} ${escapeHtml(displayValue(properties.ZIPCODE, ""))}</dd>
        <dt>Land use</dt><dd>${escapeHtml(displayValue(properties.DESCLU))}</dd>
        <dt>Land assessment</dt><dd>${escapeHtml(formatCurrency(properties.NFMLNDVL))} ${properties.NFMTTLVL ? `(${((properties.NFMLNDVL / properties.NFMTTLVL) * 100).toFixed(0)}%)` : ""}</dd>
        <dt>Improvement assessment</dt><dd>${escapeHtml(formatCurrency(properties.NFMIMPVL))} ${properties.NFMTTLVL ? `(${((properties.NFMIMPVL / properties.NFMTTLVL) * 100).toFixed(0)}%)` : ""}</dd>
        <dt>Total assessment</dt><dd>${escapeHtml(formatCurrency(properties.NFMTTLVL))} ${properties.NFMTTLVL ? `(100%)` : ""}</dd>
        <dt>Zone</dt><dd>${escapeHtml(displayValue(properties.ZONING))}</dd>
        <dt>Applicable tax rate</dt><dd>${escapeHtml(formatTaxRate(taxDetails.currentRate))}</dd>
        <dt>Predicted tax bill</dt><dd>${escapeHtml(formatCurrency(taxDetails.currentTax))}</dd>
        <dt>Hypothetical split-rate bill</dt><dd>${escapeHtml(formatCurrency(taxDetails.hypotheticalTax))}</dd>
      </dl>
    </div>`;
}

function stackedPopupMarkup(accounts) {
  if (accounts.length === 1) return popupMarkup(accounts[0]);
  const sorted = [...accounts].sort((a, b) =>
    String(a.ADDRESS || "").localeCompare(String(b.ADDRESS || ""), undefined, { numeric: true })
    || String(a.STRTUNT || "").localeCompare(String(b.STRTUNT || ""), undefined, { numeric: true }));
  return `
    <div class="parcel-popup-stack">
      <p class="parcel-popup-count">${sorted.length.toLocaleString()} taxable accounts at this location</p>
      <div class="parcel-popup-list">${sorted.map(popupMarkup).join("")}</div>
    </div>`;
}

function refreshOpenParcelPopup() {
  if (!openParcelPopup) return;
  openParcelPopup.popup.setContent(stackedPopupMarkup(openParcelPopup.accounts));
  openParcelPopup.popup.update();
}

function prepareTaxModelControls() {
  taxScenarioModel = buildTaxScenarioModel(latestTaxSummary?.currentTaxByJurisdiction);
  elements.taxModelControls.hidden = !taxScenarioModel;
  if (taxScenarioModel) {
    elements.taxScopeSelect.replaceChildren(
      ...taxScenarioModel.scopes.map((scope) => new Option(taxScenarioScopeLabel(scope, taxScenarioModel), scope)),
    );
    elements.taxScopeSelect.value = taxScenarioModel.scope;
    elements.taxScopeControl.hidden = taxScenarioModel.scopes.length < 2;
    renderTaxScenario();
  }
  elements.underutilizedControl.hidden = false;
}

function isValidRateText(text) {
  const value = String(text ?? "").trim();
  const decimalPlaces = value.includes(".") ? value.split(".")[1].length : 0;
  return /^(?:\d+\.?\d*|\.\d+)$/.test(value) && decimalPlaces <= 6;
}

function validateTaxRateInput(input) {
  const isValid = isValidRateText(input.value);
  input.setCustomValidity(isValid ? "" : "Enter a non-negative rate with no more than 6 decimal places.");
  return isValid;
}

// Mirrors SFH_WHERE for per-account checks (popups, highlights, exports).
function isSingleFamilyParcel(properties) {
  return String(properties.LU || "").trim().toUpperCase() === "R"
    && Number(properties.SQFTSTRC) > 0
    && SFH_BUILDING_TYPES.includes(properties.DESCBLDG);
}

function isUnderutilized(properties, center) {
  const context = underutilizedContext;
  if (!context) return false;
  const land = Number(properties.NFMLNDVL);
  const total = Number(properties.NFMTTLVL);
  const improvement = Number(properties.NFMIMPVL);
  const ratio = Number.isFinite(land) && Number.isFinite(total) && total > 0 ? land / total : null;
  const landMajority = Number.isFinite(land) && Number.isFinite(total) && land > total / 2;
  switch (context.mode) {
    case "vacant":
      return Number.isFinite(improvement)
        ? improvement === 0
        : Number.isFinite(land) && Number.isFinite(total) && land === total;
    case "land-majority":
      return landMajority;
    case "high-value-urban":
      return landMajority && land >= 1000000 && Boolean(center)
        && context.urbanFeatures.some((urban) => urban.geometry && pointInGeometry(center, urban.geometry));
    case "above-mean-sfh":
      return !isSingleFamilyParcel(properties) && ratio !== null && context.meanSfhLandRatio !== null
        && ratio > context.meanSfhLandRatio;
    case "above-median-sfh":
      return !isSingleFamilyParcel(properties) && ratio !== null && context.medianSfhLandRatio !== null
        && ratio > context.medianSfhLandRatio;
    default:
      return false;
  }
}

async function updateUnderutilizedHighlights(updateId = underutilizedUpdateId) {
  const urbanFeatures = underutilizedMode === "high-value-urban" ? await ensureUrbanFeatures() : [];
  if (updateId !== underutilizedUpdateId) return;
  underutilizedContext = {
    mode: underutilizedMode,
    urbanFeatures,
    meanSfhLandRatio: latestTaxSummary?.meanSfhLandRatio ?? null,
    medianSfhLandRatio: latestTaxSummary?.medianSfhLandRatio ?? null,
  };
  parcelLayer?.restyle();
}

// Split-rate scenario. All inputs are recalculated locally from the per-jurisdiction
// land and improvement totals loaded with current tax, so edits need no server requests.
// Rates are stored per scope as the percent text shown in each input:
//   all          — one rate set for every parcel
//   county       — one rate set per county, applied to its municipalities too
//   jurisdiction — one rate set per county remainder and per distinct-rate municipality

function formatRateInput(rate) {
  return String(Number((rate * 100).toFixed(6)));
}

function parseRatePercent(text) {
  return isValidRateText(text) ? Number(text) / 100 : Number.NaN;
}

function defaultScenarioRate(jurisdictions) {
  return new Set(jurisdictions.map((details) => details.rate)).size === 1
    ? formatRateInput(jurisdictions[0].rate)
    : "";
}

function scenarioRateEntry(rate) {
  return { land: rate, improvement: rate };
}

function defaultTaxScenarioRates(model) {
  const jurisdictions = model.counties.flatMap((county) => county.jurisdictions);
  return {
    all: { all: scenarioRateEntry(defaultScenarioRate(jurisdictions)) },
    county: Object.fromEntries(model.counties.map((county) => [
      county.name,
      scenarioRateEntry(defaultScenarioRate(county.jurisdictions)),
    ])),
    jurisdiction: Object.fromEntries(jurisdictions.map((details) => [
      details.jurisdiction,
      scenarioRateEntry(formatRateInput(details.rate)),
    ])),
  };
}

function buildTaxScenarioModel(byJurisdiction) {
  if (!byJurisdiction?.size) return null;
  const counties = groupJurisdictionsByCounty(byJurisdiction);
  const sum = (field) => counties.reduce((total, county) => total + county[field], 0);
  const scopes = [
    ...(counties.some((county) => county.municipalities.length) ? ["jurisdiction"] : []),
    "county",
    ...(counties.length > 1 ? ["all"] : []),
  ];
  const model = {
    counties,
    currentTax: sum("currentTax"),
    landValue: sum("landValue"),
    improvementValue: sum("improvementValue"),
    scopes,
    scope: scopes[0],
    rows: [],
  };
  model.rates = defaultTaxScenarioRates(model);
  return model;
}

function taxScenarioScopeLabel(scope, model) {
  if (scope === "all") return "One rate set for all counties";
  if (scope === "jurisdiction") return "By county and municipality";
  const label = model.counties.length > 1 ? "By county" : `One rate set for ${model.counties[0].name}`;
  return model.counties.some((county) => county.municipalities.length)
    ? `${label} (municipalities included)`
    : label;
}

function scenarioRateKey(details, scope = taxScenarioModel.scope) {
  if (scope === "all") return "all";
  return scope === "county" ? details.county : details.jurisdiction;
}

function scenarioRatesFor(details, { scope, rates } = taxScenarioModel) {
  const entry = rates[scope][scenarioRateKey(details, scope)];
  const land = parseRatePercent(entry?.land);
  const improvement = parseRatePercent(entry?.improvement);
  return Number.isFinite(land) && Number.isFinite(improvement) ? { land, improvement } : null;
}

function computeTaxScenario() {
  const byCounty = new Map();
  const byJurisdiction = new Map();
  let total = 0;
  taxScenarioModel.counties.forEach((county) => {
    let countyTotal = 0;
    county.jurisdictions.forEach((details) => {
      const rates = scenarioRatesFor(details);
      const tax = rates
        ? details.landValue * rates.land + details.improvementValue * rates.improvement
        : Number.NaN;
      byJurisdiction.set(details.jurisdiction, tax);
      countyTotal += tax;
    });
    byCounty.set(county.name, countyTotal);
    total += countyTotal;
  });
  return { total, byCounty, byJurisdiction };
}

function formatTaxChange(value, current) {
  if (!Number.isFinite(value)) return "Enter rates";
  const change = value - current;
  // Ignore differences from rounding default rates to 6 decimal places.
  if (Math.abs(change) <= Math.max(1, Math.abs(current) * 1e-6)) return "No change";
  const sign = change > 0 ? "+" : "−";
  const percent = current ? ` (${sign}${formatPercent(Math.abs(change / current) * 100)})` : "";
  return `${sign}${formatCompactCurrency(Math.abs(change))}${percent}`;
}

function setScenarioValue(amountElement, changeElement, value, current) {
  amountElement.textContent = Number.isFinite(value) ? formatCompactCurrency(value) : "—";
  changeElement.textContent = formatTaxChange(value, current);
}

function updateTaxScenarioResults() {
  if (!taxScenarioModel) return;
  const results = computeTaxScenario();
  setScenarioValue(
    elements.hypotheticalTaxValue,
    elements.hypotheticalTaxDelta,
    results.total,
    taxScenarioModel.currentTax,
  );
  taxScenarioModel.rows.forEach((row) => setScenarioValue(row.amount, row.change, row.read(results), row.current));
  refreshOpenParcelPopup();
}

function scheduleTaxScenarioUpdate() {
  if (taxScenarioFrame) return;
  taxScenarioFrame = requestAnimationFrame(() => {
    taxScenarioFrame = 0;
    updateTaxScenarioResults();
  });
}

function scenarioRateInputs(label, rateKey) {
  const rates = taxScenarioModel.rates[taxScenarioModel.scope][rateKey];
  const wrapper = document.createElement("div");
  wrapper.className = "tax-scenario-inputs";
  [["land", "Land %"], ["improvement", "Impr. %"]].forEach(([field, caption]) => {
    const fieldLabel = document.createElement("label");
    const text = document.createElement("span");
    text.textContent = caption;
    const input = document.createElement("input");
    Object.assign(input, {
      type: "number",
      min: "0",
      step: "0.000001",
      inputMode: "decimal",
      value: rates[field],
    });
    input.setAttribute("aria-label", `${caption} — ${label}`);
    input.dataset.rateKey = rateKey;
    input.dataset.rateField = field;
    fieldLabel.append(text, input);
    wrapper.append(fieldLabel);
  });
  return wrapper;
}

function scenarioRow({
  tagName = "div",
  modifier,
  label,
  inputLabel = label,
  current,
  read,
  rateKey = null,
  toggleTarget = null,
}) {
  const row = document.createElement(tagName);
  row.className = `tax-model-county-row tax-scenario-row ${modifier}`;
  let name;
  if (toggleTarget) {
    name = document.createElement("button");
    name.type = "button";
    name.className = "tax-county-toggle";
    name.setAttribute("aria-expanded", "true");
    name.setAttribute("aria-controls", toggleTarget);
  } else {
    name = document.createElement("span");
  }
  name.textContent = label;
  const value = document.createElement("span");
  value.className = "tax-scenario-value";
  const amount = document.createElement("strong");
  const change = document.createElement("small");
  change.className = "tax-scenario-delta";
  value.append(amount, change);
  row.append(name, value);
  if (rateKey) row.append(scenarioRateInputs(inputLabel, rateKey));
  taxScenarioModel.rows.push({ amount, change, current, read });
  return row;
}

function renderTaxScenario() {
  const model = taxScenarioModel;
  const { scope } = model;
  const container = elements.taxModelCountyResults;
  resetTaxCountyResults(container);
  model.rows = [];

  elements.taxModelResult.querySelector(".tax-scenario-inputs")?.remove();
  if (scope === "all") elements.taxModelResult.append(scenarioRateInputs("All counties", "all"));

  model.counties.forEach((county, index) => {
    const hasBreakdown = county.municipalities.length > 0;
    const countyEditable = scope === "county" || (scope === "jurisdiction" && !hasBreakdown);
    const breakdownId = `tax-scenario-breakdown-${index}`;
    const countyGroup = document.createElement("section");
    countyGroup.className = "tax-scenario-county";
    countyGroup.append(scenarioRow({
      modifier: "tax-model-county-row--county",
      label: county.name,
      current: county.currentTax,
      read: (results) => results.byCounty.get(county.name),
      rateKey: countyEditable ? scenarioRateKey(county.rest || { county: county.name }) : null,
      toggleTarget: hasBreakdown ? breakdownId : null,
    }));
    if (!hasBreakdown) {
      container.append(countyGroup);
      return;
    }

    const breakdown = document.createElement("ul");
    breakdown.id = breakdownId;
    breakdown.className = "tax-county-breakdown";
    breakdown.setAttribute("aria-label", `${county.name} breakdown by tax rate`);
    county.jurisdictions.forEach((details) => {
      const label = details.municipality || REST_OF_COUNTY_LABEL;
      breakdown.append(scenarioRow({
        tagName: "li",
        modifier: "tax-model-county-row--sub",
        label,
        inputLabel: `${county.name}, ${label}`,
        current: details.currentTax,
        read: (results) => results.byJurisdiction.get(details.jurisdiction),
        rateKey: scope === "jurisdiction" ? details.jurisdiction : null,
      }));
    });
    countyGroup.append(breakdown);
    container.append(countyGroup);
  });
  container.hidden = false;
  updateTaxScenarioResults();
}

function revenueNeutralUnits(model) {
  if (model.scope === "all") return [["all", model]];
  if (model.scope === "county") return model.counties.map((county) => [county.name, county]);
  return model.counties.flatMap((county) => county.jurisdictions.map((details) => [details.jurisdiction, details]));
}

function neutralMode() {
  return document.querySelector('input[name="neutral-mode"]:checked')?.value ?? "ratio";
}

function updateNeutralModeControls() {
  const landOnly = neutralMode() === "land-only";
  elements.neutralRatioGroup.hidden = landOnly;
  elements.neutralLandOnlyNote.hidden = !landOnly;
  elements.neutralRatio.setCustomValidity("");
  elements.neutralHint.textContent = landOnly
    ? "Taxes land only. Sets each editable row's land rate so its revenue matches current tax."
    : "Land : improvement rate ratio. Sets each editable row's rates so its revenue matches current tax.";
}

// Land-only: land rate = current tax ÷ land value, improvements untaxed.
function applyRevenueNeutralLandOnly(model) {
  revenueNeutralUnits(model).forEach(([key, unit]) => {
    if (unit.landValue <= 0) return;
    model.rates[model.scope][key] = {
      land: formatRateInput(unit.currentTax / unit.landValue),
      improvement: "0",
    };
  });
  renderTaxScenario();
  setStatus("Applied revenue-neutral land-only rates (improvements untaxed).", "success");
}

// For land:improvement ratio k, solves improvement rate r so that
// r × (k × land + improvements) equals each editable row's current tax.
function applyRevenueNeutralRatio() {
  const model = taxScenarioModel;
  if (!model) return;
  if (neutralMode() === "land-only") {
    applyRevenueNeutralLandOnly(model);
    return;
  }
  const input = elements.neutralRatio;
  const ratio = Number(input.value);
  if (input.value.trim() === "" || !Number.isFinite(ratio) || ratio < 0) {
    input.setCustomValidity("Enter a non-negative ratio.");
    input.reportValidity();
    return;
  }
  input.setCustomValidity("");
  revenueNeutralUnits(model).forEach(([key, unit]) => {
    const base = ratio * unit.landValue + unit.improvementValue;
    if (base <= 0) return;
    const improvementRate = unit.currentTax / base;
    model.rates[model.scope][key] = {
      land: formatRateInput(improvementRate * ratio),
      improvement: formatRateInput(improvementRate),
    };
  });
  renderTaxScenario();
  setStatus(`Applied revenue-neutral rates with land taxed at ${ratio}× the improvement rate.`, "success");
}

function resetTaxScenario() {
  if (!taxScenarioModel) return;
  taxScenarioModel.rates = defaultTaxScenarioRates(taxScenarioModel);
  renderTaxScenario();
  setStatus("Scenario reset to current rates.", "success");
}

async function loadParcels() {
  if (!selectedGeography) return;
  const geographyAtRequestStart = selectedGeography;

  if (currentRequest) currentRequest.abort();
  if (downloadRequest) {
    downloadRequest.abort();
    downloadRequest = null;
  }
  underutilizedUpdateId += 1;
  underutilizedContext = null;
  const request = new AbortController();
  currentRequest = request;
  if (openParcelPopup) {
    openParcelPopup.popup.remove();
    openParcelPopup = null;
  }
  removeParcelLoadingMarker();
  latestTaxSummary = null;
  currentTaxRate = null;
  taxScenarioModel = null;
  hideParcelLoadProgress();
  elements.underutilizedSelect.disabled = false;
  elements.taxDownloadControls.hidden = true;
  setDownloadButtonsDisabled(false);
  elements.taxModelControls.hidden = true;
  elements.underutilizedControl.hidden = true;
  elements.underutilizedSelect.value = "";
  updateUnderutilizedDescription();
  underutilizedMode = "";
  resetTaxCountyResults(elements.taxModelCountyResults);
  elements.taxModelCountyResults.hidden = true;
  resetTaxCountyResults(elements.taxCurrentCountyResults);
  elements.taxCurrentCountyResults.hidden = true;
  elements.hypotheticalTaxValue.textContent = "—";
  elements.hypotheticalTaxDelta.textContent = "";
  elements.refreshParcels.disabled = true;
  elements.parcelCount.textContent = "—";
  updateAnalysisMetrics();
  const geographyName = formatGeographyName(geographyAtRequestStart);
  setStatus(`Calculating tax metrics for ${geographyName}…`, "loading");
  updateMapStatus("Loading parcels…");
  showParcelLoadProgress("Calculating tax metrics…", 0, null, true);

  try {
    if (parcelLayer) map.removeLayer(parcelLayer);
    parcelLayer = createParcelMapLayer(geographyAtRequestStart).addTo(map);
    const renderPromise = parcelLayer.refresh().catch((error) => {
      console.warn("Could not render parcels:", error);
    });

    const taxSummary = await loadTaxMetrics(
      elements.geographyTypeSelect.value,
      geographyAtRequestStart,
      request.signal,
      (partial) => {
        if (currentRequest === request) updateAnalysisMetrics(partial);
      },
    );
    if (currentRequest !== request || selectedGeography !== geographyAtRequestStart) return;

    currentTaxRate = taxSummary.countyTaxRate;
    taxSummary.loadedAt = new Date().toISOString();
    taxSummary.geographyTypeLabel = GEOGRAPHY_CONFIG[elements.geographyTypeSelect.value]?.label ?? null;
    latestTaxSummary = taxSummary;
    elements.parcelCount.textContent = taxSummary.parcelCount.toLocaleString();
    updateCurrentTaxCountyResults(taxSummary.currentTaxByJurisdiction);
    updateAnalysisMetrics(taxSummary);
    prepareTaxModelControls();
    elements.taxDownloadControls.hidden = false;
    hideParcelLoadProgress();
    updateMapStatus(`${taxSummary.parcelCount.toLocaleString()} taxable accounts in ${geographyName}`);
    setStatus(`${TAX_CONFIG.title} is ready.`, "success");
    await renderPromise;
  } catch (error) {
    if (error.name === "AbortError") return;
    hideParcelLoadProgress();
    console.error(error);
    elements.parcelCount.textContent = "—";
    updateMapStatus("Parcel request failed");
    setStatus(`Could not load parcels. ${error.message}`, "error");
  } finally {
    if (
      currentRequest === request &&
      selectedGeography === geographyAtRequestStart
    ) {
      elements.refreshParcels.disabled = false;
    }
    if (currentRequest === request) currentRequest = null;
  }
}

const welcomePanel = document.querySelector(".welcome-panel");
const welcomePanelResizeHandle = document.querySelector(".welcome-panel-resize-handle");
const acknowledgements = document.querySelector(".acknowledgements");
const stackedLayoutQuery = window.matchMedia("(max-width: 600px)");
const WELCOME_PANEL_MIN_HEIGHT = 220;
const WELCOME_PANEL_GAP = 12;

function getWelcomePanelResizeLimits() {
  const panelTop = welcomePanel.getBoundingClientRect().top;
  const acknowledgementsTop = acknowledgements.getBoundingClientRect().top;
  // In the small layout the tool panel sits below this one, so it becomes the lower boundary.
  if (stackedLayoutQuery.matches && !elements.toolPanel.hidden) {
    const maximum = elements.toolPanel.getBoundingClientRect().top - panelTop - WELCOME_PANEL_GAP;
    return { minimum: Math.min(WELCOME_PANEL_MIN_HEIGHT, maximum), maximum };
  }
  // Keep the panel's bottom edge from rising above where the opened acknowledgements popover sits.
  const openPopoverTop = acknowledgementsTop - 9 - elements.acknowledgementsPopover.offsetHeight;
  const minimum = Math.max(WELCOME_PANEL_MIN_HEIGHT, openPopoverTop - panelTop - WELCOME_PANEL_GAP);
  const maximum = acknowledgementsTop - panelTop - WELCOME_PANEL_GAP;
  return { minimum: Math.min(minimum, maximum), maximum };
}

function applyWelcomePanelBounds() {
  const { minimum, maximum } = getWelcomePanelResizeLimits();
  welcomePanel.style.minHeight = `${minimum}px`;
  welcomePanel.style.maxHeight = `${maximum}px`;
  updateWelcomePanelResizeAria();
}

function updateWelcomePanelResizeAria(height = welcomePanel.getBoundingClientRect().height) {
  const { minimum, maximum } = getWelcomePanelResizeLimits();
  const boundedHeight = Math.max(minimum, Math.min(height, maximum));
  welcomePanelResizeHandle.setAttribute("aria-valuemin", String(Math.round(minimum)));
  welcomePanelResizeHandle.setAttribute("aria-valuemax", String(Math.round(maximum)));
  welcomePanelResizeHandle.setAttribute("aria-valuenow", String(Math.round(boundedHeight)));
}

function setWelcomePanelHeight(height) {
  const { minimum, maximum } = getWelcomePanelResizeLimits();
  const boundedHeight = Math.max(minimum, Math.min(height, maximum));
  welcomePanel.style.height = `${boundedHeight}px`;
  updateWelcomePanelResizeAria(boundedHeight);
}

applyWelcomePanelBounds();
new ResizeObserver(applyWelcomePanelBounds).observe(elements.toolPanel);

welcomePanelResizeHandle.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  event.preventDefault();
  const startY = event.clientY;
  const startHeight = welcomePanel.getBoundingClientRect().height;
  welcomePanelResizeHandle.setPointerCapture(event.pointerId);

  const resize = (pointerEvent) => {
    setWelcomePanelHeight(startHeight + pointerEvent.clientY - startY);
  };
  const stopResize = () => {
    welcomePanelResizeHandle.removeEventListener("pointermove", resize);
    welcomePanelResizeHandle.removeEventListener("pointerup", stopResize);
    welcomePanelResizeHandle.removeEventListener("pointercancel", stopResize);
  };

  welcomePanelResizeHandle.addEventListener("pointermove", resize);
  welcomePanelResizeHandle.addEventListener("pointerup", stopResize);
  welcomePanelResizeHandle.addEventListener("pointercancel", stopResize);
});

welcomePanelResizeHandle.addEventListener("keydown", (event) => {
  const currentHeight = welcomePanel.getBoundingClientRect().height;
  const step = event.shiftKey ? 40 : 16;
  if (event.key === "ArrowUp") setWelcomePanelHeight(currentHeight + step);
  else if (event.key === "ArrowDown") setWelcomePanelHeight(currentHeight - step);
  else return;
  event.preventDefault();
});

window.addEventListener("resize", applyWelcomePanelBounds);

elements.geographyToggle.addEventListener("click", () => {
  const isOpen = !elements.geographyMenu.hidden;
  elements.geographyMenu.hidden = isOpen;
  elements.geographyToggle.setAttribute("aria-expanded", String(!isOpen));
});

function setAcknowledgementsOpen(isOpen) {
  elements.acknowledgements.classList.toggle("is-open", isOpen);
  elements.acknowledgementsTrigger.setAttribute("aria-expanded", String(isOpen));
  elements.acknowledgementsPopover.setAttribute("aria-hidden", String(!isOpen));
  elements.acknowledgementsPopover.toggleAttribute("inert", !isOpen);
  elements.acknowledgementsTrigger.setAttribute(
    "aria-label",
    isOpen ? "Hide data sources" : "Show data sources",
  );
}

elements.acknowledgementsTrigger.addEventListener("click", () => {
  setAcknowledgementsOpen(!elements.acknowledgements.classList.contains("is-open"));
});

document.addEventListener("click", (event) => {
  if (!elements.acknowledgements.contains(event.target)) {
    setAcknowledgementsOpen(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && elements.acknowledgements.classList.contains("is-open")) {
    setAcknowledgementsOpen(false);
    elements.acknowledgementsTrigger.focus();
  }
});

elements.geographyTypeSelect.addEventListener("change", () => {
  selectedGeography = null;
  geographyFeatures = [];
  showSelectedGeography();
  clearParcelResults();
  elements.geographySelection.textContent = "All Maryland";
  elements.selectedGeography.textContent = "All Maryland";
  loadGeographyChoices(elements.geographyTypeSelect.value);
  elements.geographyMenu.classList.toggle("selection-menu--county-districts", elements.geographyTypeSelect.value === "countyCouncil");

  setStatus("Choose a geography to load parcels for tax analysis.");
  updateMapStatus("Choose a geography to load parcels");
});

elements.geographyChoiceSelect.addEventListener("change", () => {
  const config = GEOGRAPHY_CONFIG[elements.geographyTypeSelect.value];
  selectedGeography = geographyFeatures.find(
    (feature) => String(feature.properties[config.valueField]) === elements.geographyChoiceSelect.value,
  ) || null;
  elements.geographySelection.textContent = formatGeographyName();
  elements.selectedGeography.textContent = formatGeographyName();
  elements.geographyMenu.hidden = true;
  elements.geographyToggle.setAttribute("aria-expanded", "false");
  showSelectedGeography();

  elements.parcelCount.textContent = "—";
  updateAnalysisMetrics();
  if (selectedGeography) {
    loadParcels();
  } else {
    clearParcelResults();
    setStatus("Choose a geography to load tax analysis results.");
    updateMapStatus("Choose a geography to load parcels");
  }
});

function updateUnderutilizedDescription() {
  const selectedOption = elements.underutilizedSelect.selectedOptions[0];
  const definition = [...elements.underutilizedControl.querySelectorAll("[data-definition-for]")].find(
    (candidate) => candidate.dataset.definitionFor === selectedOption?.value,
  );
  const description = definition?.textContent.trim() || "";
  elements.underutilizedDescriptionText.textContent = description;
  elements.underutilizedDescription.hidden = !description;
  updateUnderutilizedZoomHint();
}

function updateUnderutilizedZoomHint() {
  const zoom = map.getZoom();
  const belowMinZoom = zoom < VECTOR_MIN_ZOOM;
  const highlightsHidden = belowMinZoom && Boolean(elements.underutilizedSelect.value);
  elements.underutilizedZoomHint.classList.toggle("is-warning", highlightsHidden);
  elements.underutilizedZoomHint.classList.toggle("is-ready", !belowMinZoom);
  elements.underutilizedZoomHintText.textContent = belowMinZoom
    ? `Highlights only appear at zoom ${VECTOR_MIN_ZOOM} or closer. Current zoom: ${zoom}.`
    : `Zoom ${zoom}: underutilized parcels are highlighted on the map.`;
  elements.underutilizedZoomButton.textContent = `Zoom to ${VECTOR_MIN_ZOOM}`;
  elements.underutilizedZoomButton.hidden = !belowMinZoom;
  zoomLevelIndicator.classList.toggle("is-below-highlight-zoom", highlightsHidden);
}

map.on("zoomend", updateUnderutilizedZoomHint);
elements.underutilizedZoomButton.addEventListener("click", () => map.setZoom(VECTOR_MIN_ZOOM));

elements.underutilizedSelect.addEventListener("change", () => {
  updateUnderutilizedDescription();
  underutilizedMode = elements.underutilizedSelect.value;
  const updateId = ++underutilizedUpdateId;

  if (!underutilizedMode || !parcelLayer) {
    underutilizedContext = null;
    parcelLayer?.restyle();
    setStatus("Underutilized parcel highlights cleared.", "success");
    return;
  }

  updateUnderutilizedHighlights(updateId)
    .then(() => {
      if (updateId === underutilizedUpdateId) {
        setStatus(
          map.getZoom() >= VECTOR_MIN_ZOOM
            ? "Underutilized parcel highlights applied."
            : `Underutilized view selected. Zoom to level ${VECTOR_MIN_ZOOM} or closer to see highlighted parcels.`,
          "success",
        );
      }
    })
    .catch((error) => {
      if (updateId !== underutilizedUpdateId) return;
      console.warn("Could not apply underutilized parcel highlight:", error);
      setStatus("Could not load the urban-area boundary.", "error");
    });
});

updateUnderutilizedDescription();

elements.refreshParcels.addEventListener("click", loadParcels);
elements.taxModelControls.addEventListener("submit", (event) => event.preventDefault());
elements.taxModelControls.addEventListener("input", (event) => {
  const input = event.target;
  const { rateKey, rateField } = input.dataset || {};
  if (!rateKey || !taxScenarioModel) return;
  validateTaxRateInput(input);
  taxScenarioModel.rates[taxScenarioModel.scope][rateKey][rateField] = input.value;
  scheduleTaxScenarioUpdate();
});
elements.taxModelControls.addEventListener("click", (event) => {
  const toggle = event.target.closest(".tax-county-toggle");
  if (!toggle) return;
  const isExpanded = toggle.getAttribute("aria-expanded") === "true";
  toggle.setAttribute("aria-expanded", String(!isExpanded));
  document.getElementById(toggle.getAttribute("aria-controls")).hidden = isExpanded;
});
elements.taxScopeSelect.addEventListener("change", () => {
  if (!taxScenarioModel) return;
  taxScenarioModel.scope = elements.taxScopeSelect.value;
  renderTaxScenario();
});
elements.applyNeutralRatio.addEventListener("click", applyRevenueNeutralRatio);
elements.neutralModeInputs.forEach((input) => input.addEventListener("change", updateNeutralModeControls));
elements.neutralRatio.addEventListener("input", () => elements.neutralRatio.setCustomValidity(""));
elements.resetTaxModel.addEventListener("click", resetTaxScenario);
elements.downloadSummary.addEventListener("click", () => {
  runDownload(
    async (signal) => downloadTextFile(downloadBaseName("summary.txt"), await summaryText(signal), "text/plain;charset=utf-8"),
    "Summary statistics downloaded.",
  );
});
elements.downloadParcels.addEventListener("click", () => {
  runDownload(
    async (signal) => downloadTextFile(downloadBaseName("parcels.csv"), await detailedParcelCsv(signal), "text/csv;charset=utf-8"),
    "Detailed parcel data downloaded.",
  );
});
elements.downloadMetadata.addEventListener("click", () => {
  runDownload(
    async () => downloadTextFile(downloadBaseName("metadata.txt"), metadataText(), "text/plain;charset=utf-8"),
    "Export metadata downloaded.",
  );
});

initializeTaxTool();
loadGeographyChoices("assembly");
