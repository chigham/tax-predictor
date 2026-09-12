const PARCEL_LAYER_URL =
  "https://mdgeodata.md.gov/imap/rest/services/PlanningCadastre/MD_ParcelBoundaries/MapServer/0";
const PARCEL_MAP_SERVICE_URL = PARCEL_LAYER_URL.replace(/\/0$/, "");
const STATE_CENTER = [39.2, -76.7];
const STATE_ZOOM = 8;
const MAX_PARCELS_PER_REQUEST = 1000;
const PARCEL_OUT_FIELDS =
  "OBJECTID,ACCTID,ADDRESS,STRTNUM,STRTDIR,STRTNAM,STRTTYP,STRTSFX,STRTUNT,CITY,ZIPCODE,DESCLU,LU,ACRES,SQFTSTRC,YEARBLT,NFMTTLVL,NFMLNDVL,NFMIMPVL,ZONING,BLDG_UNITS,OOI,JURSCODE,TOWNCODE,DESCTOWN";
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
  "Prince George's County": {"base": 0.01, "municipalities":{"Berwyn Heights": 0.00867, "Bladensburg": 0.00875, "Bowie": 0.00878, "Brentwood": 0.00919, "Capital Heights": 0.00908, "Cheverly": 0.00902, "College Park": 0.00968, "Colmar Manor": 0.00903, "Cottage City": 0.00929, "District Heights": 0.00923, "Eagle Harbor": 0.00999, "Edmonston": 0.00908, "Fairmount Heights": 0.00937, "Forest Heights": 0.00893, "Glenarden": 0.00892, "Greenbelt": 0.00875, "Hyattsville": 0.00884, "Landover Hills": 0.00907, "Laurel": 0.00867, "Morningside": 0.00909, "Mount Rainier": 0.00879, "New Carrollton": 0.00886, "North Brentwood": 0.0098, "Riverdale Park": 0.00882, "Seat Pleasant": 0.00885, "University Park": 0.00881, "Upper Marlboro": 0.0093}},  // varies by municipality
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

const TOOL_CONFIG = {
  adu: {
    kicker: "Residential opportunity",
    title: "ADU feasibility",
    description:
      "Load developed residential and town-house parcels in the current view as a starting point for ADU research.",
    // LU identifies the broad Maryland land-use class; SQFTSTRC is a practical
    // proxy for a developed parcel in this statewide layer.
    where:
      "ACCTID IS NOT NULL AND ACCTID NOT IN ('ROW', 'UNK', 'GCE') AND LU IN ('R', 'TH') AND SQFTSTRC > 0",
    color: "#146b57",
    fillColor: "#8ed1b4",
    metrics: [],
  },
  tax: {
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
        label: "Land",
        format: (summary) => summary.landValue === null ? "—" : formatCompactCurrency(summary.landValue),
      },
      {
        label: "Overall",
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
    ],
  },
};

const map = L.map("map", {
  zoomControl: false,
  preferCanvas: true,
}).setView(STATE_CENTER, STATE_ZOOM);

L.control
  .zoom({ position: "bottomright" })
  .addTo(map);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

const elements = {
  welcomePanel: document.querySelector(".welcome-panel"),
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
  zoomLevel: document.querySelector("#zoom-level"),
  analysisMetrics: document.querySelector("#analysis-metrics"),
  taxModelControls: document.querySelector("#tax-model-controls"),
  landTaxRate: document.querySelector("#land-tax-rate"),
  improvementTaxRate: document.querySelector("#improvement-tax-rate"),
  calculateTaxModel: document.querySelector("#calculate-tax-model"),
  calculateTaxModelLabel: document.querySelector("#calculate-tax-model-label"),
  taxModelResult: document.querySelector("#tax-model-result"),
  hypotheticalTaxValue: document.querySelector("#hypothetical-tax-value"),
  taxCurrentCountyResults: document.querySelector("#tax-current-county-results"),
  taxModelCountyResults: document.querySelector("#tax-model-county-results"),
  taxDownloadControls: document.querySelector("#tax-download-controls"),
  downloadSummary: document.querySelector("#download-summary"),
  downloadParcels: document.querySelector("#download-parcels"),
  downloadMetadata: document.querySelector("#download-metadata"),
  mapStatus: document.querySelector("#map-status-text"),
  closeTool: document.querySelector("#close-tool"),
  refreshParcels: document.querySelector("#refresh-parcels"),
  geographyToggle: document.querySelector("#geography-toggle"),
  geographyMenu: document.querySelector("#geography-menu"),
  geographySelection: document.querySelector("#geography-selection"),
  geographyTypeSelect: document.querySelector("#geography-type-select"),
  geographyChoiceLabel: document.querySelector("#geography-choice-label"),
  geographyChoiceSelect: document.querySelector("#geography-choice-select"),
  analysisToggle: document.querySelector("#analysis-toggle"),
  analysisMenu: document.querySelector("#analysis-menu"),
  analysisSelection: document.querySelector("#analysis-selection"),
  analysisSelect: document.querySelector("#analysis-select"),
  underutilizedControl: document.querySelector("#underutilized-control"),
  underutilizedSelect: document.querySelector("#underutilized-select"),
  selectedGeography: document.querySelector("#selected-geography"),
  acknowledgements: document.querySelector(".acknowledgements"),
  acknowledgementsTrigger: document.querySelector(".acknowledgements-trigger"),
  acknowledgementsPopover: document.querySelector("#acknowledgements-popover"),
};

let activeTool = null;
let parcelLayer = null;
let geographyLayer = null;
let geographyFeatures = [];
let selectedGeography = null;
let geographyLoadRequest = null;
let currentRequest = null;
let currentTaxRate = null;
let taxScenario = null;
let taxScenarioSummary = null;
let taxScenarioRequest = null;
let downloadRequest = null;
let openParcelPopup = null;
let loadedTaxParcels = null;
let loadedParcelIds = [];
let latestTaxSummary = null;
let serverRenderedParcelLayer = false;
let underutilizedMode = "";
let underutilizedUpdateId = 0;
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

function updateZoomMetric() {
  elements.zoomLevel.textContent = map.getZoom();
}

function summarizeParcels(geojson, taxRate = currentTaxRate) {
  const summary = (geojson?.features || []).reduce(
    (totals, feature) => {
      const properties = feature.properties || {};
      const landValue = Number(properties.NFMLNDVL);
      const totalValue = Number(properties.NFMTTLVL);
      if (Number.isFinite(landValue)) totals.landValue += landValue;
      if (Number.isFinite(totalValue)) totals.totalValue += totalValue;
      return totals;
    },
    { landValue: 0, totalValue: 0 },
  );
  summary.landValueRatio = summary.totalValue > 0
    ? (summary.landValue / summary.totalValue) * 100
    : null;
  summary.currentTaxRevenue = Number.isFinite(taxRate) && Number.isFinite(summary.totalValue)
    ? summary.totalValue * taxRate
    : null;
  return summary;
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

function updateAnalysisMetrics(toolKey, summary = null) {
  const metrics = TOOL_CONFIG[toolKey]?.metrics || [];

  elements.analysisMetrics.replaceChildren(
    ...metrics.map((metric) => {
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
  if (taxScenarioRequest) {
    taxScenarioRequest.abort();
    taxScenarioRequest = null;
  }
  if (downloadRequest) {
    downloadRequest.abort();
    downloadRequest = null;
  }
  underutilizedUpdateId += 1;
  if (parcelLayer) {
    map.removeLayer(parcelLayer);
    parcelLayer = null;
  }
  if (openParcelPopup) {
    openParcelPopup.popup.remove();
    openParcelPopup = null;
  }
  removeParcelLoadingMarker();
  serverRenderedParcelLayer = false;
  loadedTaxParcels = null;
  loadedParcelIds = [];
  latestTaxSummary = null;
  taxScenario = null;
  taxScenarioSummary = null;
  hideParcelLoadProgress();
  elements.calculateTaxModel.disabled = false;
  elements.calculateTaxModel.classList.remove("is-loading");
  elements.calculateTaxModelLabel.textContent = "Calculate scenario";
  elements.underutilizedSelect.disabled = false;
  underutilizedMode = "";
  elements.underutilizedSelect.value = "";
  elements.underutilizedControl.hidden = true;
  currentTaxRate = null;
  elements.taxModelControls.hidden = true;
  elements.taxModelResult.hidden = true;
  elements.hypotheticalTaxValue.textContent = "—";
  resetTaxCountyResults(elements.taxModelCountyResults, "Hypothetical tax by county");
  elements.taxModelCountyResults.hidden = true;
  resetTaxCountyResults(elements.taxCurrentCountyResults, "Current tax by county");
  elements.taxCurrentCountyResults.hidden = true;
  elements.taxDownloadControls.hidden = true;
  setDownloadButtonsDisabled(false);
  elements.parcelCount.textContent = "—";
  updateAnalysisMetrics(activeTool);
  elements.refreshParcels.disabled = true;
}

function showTool(toolKey) {
  const config = TOOL_CONFIG[toolKey];
  if (!config) return;

  activeTool = toolKey;
  elements.toolPanel.hidden = false;
  elements.toolKicker.textContent = config.kicker;
  elements.toolTitle.textContent = config.title;
  elements.toolDescription.textContent = config.description;
  elements.selectedGeography.textContent = selectedGeography
    ? formatGeographyName(selectedGeography)
    : "All Maryland";
  elements.parcelCount.textContent = "—";
  elements.taxModelControls.hidden = true;
  elements.underutilizedControl.hidden = true;
  elements.underutilizedSelect.value = "";
  underutilizedMode = "";
  elements.taxModelResult.hidden = true;
  updateAnalysisMetrics(toolKey);
  updateZoomMetric();
  if (selectedGeography) {
    loadParcels();
  } else {
    clearParcelResults();
    setStatus(`${config.title} selected. Choose a geography to load parcels.`);
    updateMapStatus("Choose a geography to load parcels");
  }
}

function closeTool() {
  activeTool = null;
  clearParcelResults();
  elements.toolPanel.hidden = true;
  updateAnalysisMetrics(null);
  elements.analysisSelect.value = "";
  elements.analysisSelection.textContent = "Choose an analysis";
  elements.parcelCount.textContent = "—";
  updateMapStatus(selectedGeography ? `${formatGeographyName()} selected` : "Select a filter to begin");
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

async function loadCountyCouncilChoices(signal) {
  const config = GEOGRAPHY_CONFIG.countyCouncil;
  const responses = await Promise.all(
    config.sources.map(async (source) => {
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
      (payload.features || [])
        .filter((feature) => feature.geometry && feature.properties?.[config.valueField])
        .forEach((feature) => {
          const value = String(feature.properties[config.valueField]);
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
        });

      geographyFeatures = [...featuresByValue.values()]
        .sort((a, b) => String(a.properties[config.valueField]).localeCompare(String(b.properties[config.valueField])));
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

function taxRateForLocation(county, municipality) {
  const countyRates = COUNTY_TAX_RATES[county];
  if (!countyRates) return null;
  const municipalityName = normalizeMunicipalityName(municipality);
  const municipalityEntry = Object.entries(countyRates.municipalities || {})
    .find(([name]) => normalizeMunicipalityName(name) === municipalityName);
  return municipalityEntry?.[1] ?? countyRates.base;
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
  const municipality = properties.TOWNCODE
    ? municipalityNameFromParcelDescription(properties.DESCTOWN)
    : null;
  const rate = taxRateForLocation(county, municipality);
  const countyRate = COUNTY_TAX_RATES[county]?.base ?? null;
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

function summarizeTaxParcels(geojson) {
  const summary = summarizeParcels(geojson, null);

  let taxRevenue = 0;
  let ratedParcels = 0;
  const byCounty = new Map();
  const byJurisdiction = new Map();
  geojson.features.forEach((feature) => {
    const properties = feature.properties || {};
    const details = taxJurisdictionDetails(properties);
    const { county, rate, jurisdiction } = details;
    const totalValue = Number(properties.NFMTTLVL);
    if (Number.isFinite(rate) && Number.isFinite(totalValue)) {
      const countyRevenue = totalValue * rate;
      taxRevenue += countyRevenue;
      byCounty.set(county, (byCounty.get(county) || 0) + countyRevenue);
      const existing = byJurisdiction.get(jurisdiction) || {
        ...details,
        parcelCount: 0,
        totalValue: 0,
        currentTax: 0,
      };
      existing.parcelCount += 1;
      existing.totalValue += totalValue;
      existing.currentTax += countyRevenue;
      byJurisdiction.set(jurisdiction, existing);
      ratedParcels += 1;
    }
  });
  summary.currentTaxRevenue = ratedParcels ? taxRevenue : null;
  summary.currentTaxByCounty = byCounty;
  summary.currentTaxByJurisdiction = byJurisdiction;
  return summary;
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

let countyBoundaryFeaturesPromise = null;

async function loadCountyBoundaryFeatures() {
  if (!countyBoundaryFeaturesPromise) {
    const params = new URLSearchParams({ where: "1=1", outFields: "COUNTY", returnGeometry: "true", outSR: "4326", f: "geojson" });
    countyBoundaryFeaturesPromise = fetch(`${COUNTY_BOUNDARY_SERVICE_URL}/query?${params.toString()}`, {
      headers: { Accept: "application/geo+json, application/json" },
    }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok || payload.error || payload.type !== "FeatureCollection") {
        throw new Error(payload.error?.message || `County service returned ${response.status}.`);
      }
      const counties = new Map();
      (payload.features || []).filter((feature) => feature.geometry && feature.properties?.COUNTY).forEach((feature) => {
        const county = countyKeyFromStateName(feature.properties.COUNTY);
        const polygons = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.type === "MultiPolygon" ? feature.geometry.coordinates : [];
        if (!county || !polygons.length) return;
        const existing = counties.get(county);
        if (existing) existing.geometry.coordinates.push(...polygons);
        else counties.set(county, { type: "Feature", properties: { COUNTY: county }, geometry: { type: "MultiPolygon", coordinates: [...polygons] } });
      });
      return [...counties.values()];
    }).catch((error) => { countyBoundaryFeaturesPromise = null; throw error; });
  }
  return countyBoundaryFeaturesPromise;
}

async function groupParcelsByCounty(features) {
  const counties = await loadCountyBoundaryFeatures();
  const groupedParcels = new Map();
  features.forEach((feature) => {
    const center = geometryCenter(feature.geometry);
    const countyFeature = center && counties.find((county) => pointInGeometry(center, county.geometry));
    const county = countyFeature?.properties?.COUNTY || "Unknown county";
    if (!groupedParcels.has(county)) groupedParcels.set(county, []);
    groupedParcels.get(county).push(feature);
  });
  return groupedParcels;
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

function filterParcelsToGeography(geojson, geography = selectedGeography) {
  if (!geography) return geojson;

  return {
    ...geojson,
    features: geojson.features.filter((feature) => {
      const center = geometryCenter(feature.geometry);
      return center && pointInGeometry(center, geography.geometry);
    }),
  };
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

function shouldUseServerRenderedParcels(geographyType, geography) {
  if (geographyType === "county" || geographyType === "congressional") return true;
  if (geographyType !== "municipality" || !geography) return false;
  return String(geography.properties?.MUN_NAME || "").trim().toLowerCase() === "baltimore city";
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

function serverParcelExportRequest(toolKey, geography) {
  const bounds = map.getBounds();
  const southwest = webMercatorPoint([bounds.getWest(), bounds.getSouth()]);
  const northeast = webMercatorPoint([bounds.getEast(), bounds.getNorth()]);
  const size = map.getSize();
  const width = Math.min(Math.max(Math.ceil(size.x), 512), 2048);
  const height = Math.min(Math.max(Math.ceil(size.y), 512), 2048);
  const params = new URLSearchParams({
    bbox: `${southwest[0]},${southwest[1]},${northeast[0]},${northeast[1]}`,
    bboxSR: "3857",
    imageSR: "3857",
    size: `${width},${height}`,
    format: "png32",
    transparent: "true",
    dpi: "96",
    layers: "show:0",
    layerDefs: JSON.stringify({ 0: TOOL_CONFIG[toolKey].where }),
    f: "image",
  });
  const geometry = geographyGeometryForExport(geography);
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

async function loadParcelAtPoint(toolKey, latlng, signal) {
  const params = new URLSearchParams({
    where: TOOL_CONFIG[toolKey].where,
    geometry: `${latlng.lng},${latlng.lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: PARCEL_OUT_FIELDS,
    returnGeometry: "false",
    resultRecordCount: "1",
    f: "geojson",
  });
  const response = await fetch(`${PARCEL_LAYER_URL}/query?${params.toString()}`, {
    signal,
    headers: { Accept: "application/geo+json, application/json" },
  });
  const payload = await response.json();
  if (!response.ok || payload.error || payload.type !== "FeatureCollection") {
    throw new Error(payload.error?.message || `Parcel service returned ${response.status}.`);
  }
  return payload.features?.[0] || null;
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

function createServerRenderedParcelLayer(toolKey, geography) {
  const layer = L.layerGroup();
  let refreshTimer = null;
  let refreshRequest = null;
  let parcelClickRequest = null;
  let pendingRefreshResolve = null;
  let imageOverlay = null;

  const handleMapClick = async (event) => {
    if (geography && !pointInGeometry([event.latlng.lng, event.latlng.lat], geography.geometry)) {
      removeParcelLoadingMarker();
      return;
    }
    if (parcelClickRequest) parcelClickRequest.abort();
    showParcelLoadingMarker(event.latlng);
    const request = new AbortController();
    parcelClickRequest = request;

    try {
      const feature = await loadParcelAtPoint(toolKey, event.latlng, request.signal);
      if (!feature || parcelClickRequest !== request || !map.hasLayer(layer)) return;
      const popup = L.popup({ className: "parcel-tooltip", maxWidth: 280 })
        .setLatLng(event.latlng)
        .setContent(popupMarkup(feature.properties || {}, toolKey));
      openParcelPopup = { popup, properties: feature.properties || {}, toolKey };
      popup.once("remove", () => {
        if (openParcelPopup?.popup === popup) openParcelPopup = null;
      });
      popup.openOn(map);
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
      const bounds = map.getBounds();
      try {
        const exportRequest = serverParcelExportRequest(toolKey, geography);
        const response = await fetch(exportRequest.url, {
          ...exportRequest.options,
          signal: request.signal,
          headers: { Accept: "image/png" },
        });
        if (!response.ok) throw new Error(`Parcel map service returned ${response.status}.`);
        const imageUrl = URL.createObjectURL(await response.blob());
        if (refreshRequest !== request || !map.hasLayer(layer)) {
          URL.revokeObjectURL(imageUrl);
          resolve();
          return;
        }
        if (imageOverlay) layer.removeLayer(imageOverlay);
        imageOverlay = L.imageOverlay(imageUrl, bounds, {
          opacity: 0.78,
          interactive: false,
        }).addTo(layer);
        imageOverlay.once("remove", () => URL.revokeObjectURL(imageUrl));
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
    if (imageOverlay) {
      layer.removeLayer(imageOverlay);
      imageOverlay = null;
    }
  });
  return layer;
}

function buildParcelQuery(toolKey, geography = selectedGeography) {
  const extent = getMapExtent();
  const config = TOOL_CONFIG[toolKey];
  const geographyGeometry = geographyGeometryForQuery(geography);
  const params = new URLSearchParams({
    where: config.where,
    geometry: geographyGeometry
      ? JSON.stringify(geographyGeometry)
      : `${extent.xmin},${extent.ymin},${extent.xmax},${extent.ymax}`,
    geometryType: geographyGeometry ? "esriGeometryPolygon" : "esriGeometryEnvelope",
    inSR: geographyGeometry ? "3857" : "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: PARCEL_OUT_FIELDS,
    returnGeometry: "true",
    outSR: "4326",
    resultRecordCount: String(MAX_PARCELS_PER_REQUEST),
    f: "geojson",
  });

  if (geographyGeometry) {
    return {
      url: `${PARCEL_LAYER_URL}/query`,
      options: {
        method: "POST",
        body: params,
      },
    };
  }

  return {
    url: `${PARCEL_LAYER_URL}/query?${params.toString()}`,
    options: {},
  };
}

async function loadGeographyParcelIds(toolKey, geography, signal) {
  const idQuery = buildParcelQuery(toolKey, geography);
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

async function loadGeographyParcels(toolKey, geography, signal, objectIds = null, onProgress = null) {
  const idQuery = buildParcelQuery(toolKey, geography);
  const parcelIds = objectIds || await loadGeographyParcelIds(toolKey, geography, signal);
  const features = [];
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
    batchParams.set("f", "geojson");

    const batchResponse = await fetch(idQuery.url, {
      method: "POST",
      body: batchParams,
      signal,
      headers: { Accept: "application/geo+json, application/json" },
    });
    const batchPayload = await batchResponse.json();

    if (!batchResponse.ok || batchPayload.error) {
      throw new Error(batchPayload.error?.message || `Parcel service returned ${batchResponse.status}.`);
    }
    if (batchPayload.type !== "FeatureCollection") {
      throw new Error("The parcel service did not return GeoJSON.");
    }
    features.push(...(batchPayload.features || []));
    onProgress?.(features.length, parcelIds.length);
  }

  return {
    type: "FeatureCollection",
    features,
  };
}

function parcelAggregateRequest(toolKey, geography, statistic) {
  const query = buildParcelQuery(toolKey, geography);
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

async function loadParcelStatistic(toolKey, geography, field, signal, statisticType = "sum", multiplier = 1) {
  const statisticName = field === "NFMLNDVL" ? "landValue" : "totalValue";
  const query = parcelAggregateRequest(toolKey, geography, {
    statisticType,
    onStatisticField: field,
    outStatisticFieldName: statisticName,
  });
  const response = await fetch(query.url, {
    ...query.options,
    signal,
    headers: { Accept: "application/json" },
  });
  const payload = await response.json();

  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message || `Parcel service returned ${response.status}.`);
  }
  const value = payload.features?.[0]?.attributes?.[statisticName];
  return value === null || value === undefined ? null : Number(value) * multiplier;
}

function parcelGroupedStatisticsRequest(toolKey, geography, statistics) {
  const query = buildParcelQuery(toolKey, geography);
  const params = query.options.body
    ? new URLSearchParams(query.options.body)
    : new URL(query.url).searchParams;
  params.delete("outFields");
  params.delete("outSR");
  params.delete("resultRecordCount");
  params.set("returnGeometry", "false");
  params.set("outFields", "JURSCODE,TOWNCODE,DESCTOWN");
  params.set("groupByFieldsForStatistics", "JURSCODE,TOWNCODE,DESCTOWN");
  params.set("outStatistics", JSON.stringify(statistics));
  params.set("f", "json");
  if (query.options.body) return { url: query.url, options: { method: "POST", body: params } };
  return { url: `${query.url.split("?")[0]}?${params.toString()}`, options: {} };
}

async function loadCurrentTaxRevenue(geography, signal) {
  const query = parcelGroupedStatisticsRequest("tax", geography, [
    { statisticType: "avg", onStatisticField: "NFMTTLVL", outStatisticFieldName: "averageTotal" },
    { statisticType: "count", onStatisticField: "NFMTTLVL", outStatisticFieldName: "totalCount" },
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
        currentTax: 0,
      };
      existing.parcelCount += count;
      existing.totalValue += total;
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

function updateCurrentTaxCountyResults(byCounty) {
  const isMultiCountyGeography = ["assembly", "congressional"].includes(elements.geographyTypeSelect.value);
  resetTaxCountyResults(elements.taxCurrentCountyResults, "Current tax by county");
  if (!isMultiCountyGeography || !byCounty?.size) {
    elements.taxCurrentCountyResults.hidden = true;
    return;
  }

  [...byCounty.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([county, revenue]) => {
      const row = document.createElement("div");
      row.className = "tax-model-county-row";
      row.innerHTML = `<span>${escapeHtml(county)}</span><strong>${escapeHtml(formatCompactCurrency(revenue))}</strong>`;
      elements.taxCurrentCountyResults.append(row);
    });
  elements.taxCurrentCountyResults.hidden = false;
}

function resetTaxCountyResults(container, heading) {
  container.replaceChildren(
    Object.assign(document.createElement("p"), {
      className: "tax-model-breakdown-heading",
      textContent: heading,
    }),
  );
}

async function loadTaxMetrics(
  geographyType,
  geography,
  parcelCount,
  signal,
  updateStatus,
  useAverageAggregates = false,
) {
  const summary = {
    landValue: null,
    totalValue: null,
    landValueRatio: null,
    currentTaxRevenue: null,
  };

  summary.countyTaxRate = await resolveCountyTaxRate(geographyType, geography, signal);

  try {
    updateStatus("Calculating total land value…");
    summary.landValue = await loadParcelStatistic(
      "tax",
      geography,
      "NFMLNDVL",
      signal,
      useAverageAggregates ? "avg" : "sum",
      useAverageAggregates ? parcelCount : 1,
    );
    updateAnalysisMetrics("tax", summary);
  } catch (error) {
    if (error.name === "AbortError") throw error;
    console.warn("Could not calculate total land value:", error);
  }

  try {
    updateStatus("Calculating total overall value…");
    // The statewide layer can overflow its integer accumulator when summing
    // full values directly. Average × matching parcel count is equivalent here
    // because the tax filter requires NFMTTLVL > 0 for every matching parcel.
    summary.totalValue = await loadParcelStatistic(
      "tax",
      geography,
      "NFMTTLVL",
      signal,
      useAverageAggregates ? "avg" : "sum",
      useAverageAggregates ? parcelCount : 1,
    );
    updateAnalysisMetrics("tax", summary);
    updateStatus("Calculating land-to-total ratio…");
    await new Promise((resolve) => setTimeout(resolve, 0));
    if (Number.isFinite(summary.landValue) && summary.totalValue > 0) {
      summary.landValueRatio = (summary.landValue / summary.totalValue) * 100;
    }
    updateStatus("Calculating current tax…");
    const currentTax = await loadCurrentTaxRevenue(geography, signal);
    summary.currentTaxRevenue = currentTax.revenue;
    summary.currentTaxByCounty = currentTax.byCounty;
    summary.currentTaxByJurisdiction = currentTax.byJurisdiction;
    updateCurrentTaxCountyResults(summary.currentTaxByCounty);
    updateAnalysisMetrics("tax", summary);
  } catch (error) {
    if (error.name === "AbortError") throw error;
    console.warn("Could not calculate total overall value:", error);
  }

  return summary;
}

function createParcelStyle(toolKey) {
  const config = TOOL_CONFIG[toolKey];
  return {
    color: config.color,
    weight: 1,
    opacity: 0.8,
    fillColor: config.fillColor,
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

function currentScenarioRates() {
  return taxScenario || {
    landRate: Number(elements.landTaxRate.value) / 100,
    improvementRate: Number(elements.improvementTaxRate.value) / 100,
  };
}

async function summaryScenarioForDownload(signal) {
  const rates = currentScenarioRates();
  if (taxScenarioSummary) return { rates, summary: taxScenarioSummary };

  setStatus("Calculating the default split-rate scenario for export…", "loading");
  let breakdown;
  let revenue;
  if (serverRenderedParcelLayer) {
    const [landValue, improvementValue, groupedTax] = await Promise.all([
      loadParcelValueTotal("tax", selectedGeography, "NFMLNDVL", signal),
      loadParcelValueTotal("tax", selectedGeography, "NFMIMPVL", signal),
      loadGroupedHypotheticalTax(selectedGeography, rates.landRate, rates.improvementRate, signal),
    ]);
    revenue = rates.landRate * landValue + rates.improvementRate * improvementValue;
    breakdown = groupedTax;
  } else if (loadedTaxParcels?.features) {
    breakdown = groupHypotheticalTaxFeatures(
      loadedTaxParcels.features,
      rates.landRate,
      rates.improvementRate,
    );
    revenue = [...breakdown.byCounty.values()].reduce((total, value) => total + value, 0);
  } else {
    throw new Error("No loaded tax parcel selection is available for the summary export.");
  }

  return {
    rates,
    summary: {
      revenue,
      byCounty: breakdown.byCounty,
      byJurisdiction: breakdown.byJurisdiction,
    },
  };
}

async function summaryCsv(signal) {
  const headers = [
    "section", "metric", "value", "breakdown_level", "county", "municipality", "jurisdiction",
    "tax_rate_percent", "parcel_count", "total_assessed_value", "current_tax_total",
    "split_land_rate_percent", "split_improvement_rate_percent", "hypothetical_tax_total",
  ];
  const rows = [];
  const summary = latestTaxSummary || {};
  const scenario = await summaryScenarioForDownload(signal);
  const rates = scenario.rates;
  const scenarioSummary = scenario.summary;
  const addMetric = (metric, value) => rows.push(["summary", metric, value ?? "", "", "", "", "", "", "", "", "", "", "", ""]);
  addMetric("Selected geography", formatGeographyName());
  addMetric("Analysis", TOOL_CONFIG.tax.title);
  addMetric("Parcels loaded", elements.parcelCount.textContent);
  addMetric("Total land value", summary.landValue);
  addMetric("Total overall value", summary.totalValue);
  addMetric("Land / total percent", summary.landValueRatio);
  addMetric("Total current tax", summary.currentTaxRevenue);
  addMetric("Split land rate percent", rates.landRate * 100);
  addMetric("Split improvement rate percent", rates.improvementRate * 100);
  addMetric("Hypothetical split-rate tax", scenarioSummary.revenue);

  const appendBreakdowns = (section, byCounty, byJurisdiction, hypothetical = false) => {
    [...(byCounty || new Map()).entries()].sort(([a], [b]) => a.localeCompare(b)).forEach(([county, value]) => {
      rows.push([section, "County total", "", "county", county, "", county, "", "", "", hypothetical ? "" : value, "", "", hypothetical ? value : ""]);
    });
    [...(byJurisdiction || new Map()).values()].sort((a, b) => a.jurisdiction.localeCompare(b.jurisdiction)).forEach((item) => {
      rows.push([
        section,
        hypothetical ? "Hypothetical jurisdiction total" : "Current jurisdiction total",
        "",
        "jurisdiction",
        item.county,
        item.municipality || "",
        item.jurisdiction,
        Number.isFinite(item.rate) ? item.rate * 100 : "",
        item.parcelCount,
        hypothetical ? "" : item.totalValue,
        hypothetical ? "" : item.currentTax,
        hypothetical ? rates.landRate * 100 : "",
        hypothetical ? rates.improvementRate * 100 : "",
        hypothetical ? item.hypotheticalTax : "",
      ]);
    });
  };
  appendBreakdowns("current_tax", summary.currentTaxByCounty, summary.currentTaxByJurisdiction);
  appendBreakdowns("hypothetical_tax", scenarioSummary.byCounty, scenarioSummary.byJurisdiction, true);
  return rowsToCsv(headers, rows);
}

function metadataText() {
  const citationTime = new Date().toISOString();
  return `Parcel Analysis MD tax analysis export metadata

SUMMARY STATISTICS CSV
Columns:
- section: summary, current_tax, or hypothetical_tax.
- metric: summary metric or breakdown description.
- value: scalar summary value.
- breakdown_level: blank, county, or jurisdiction.
- county / municipality / jurisdiction: normalized tax geography. A municipality appears only when its rate differs from the county rate.
- tax_rate_percent: applicable current tax rate for a jurisdiction.
- parcel_count: number of matching parcels in the jurisdiction.
- total_assessed_value: total NFMTTLVL for current-tax jurisdiction rows.
- current_tax_total: predicted current tax total for current-tax jurisdiction rows.
- split_land_rate_percent / split_improvement_rate_percent: scenario rates used for hypothetical rows.
- hypothetical_tax_total: split-rate revenue for hypothetical jurisdiction rows.

DETAILED PARCEL CSV
Columns:
- OBJECTID, ACCTID: parcel identifiers.
- ADDRESS, street fields, CITY, ZIPCODE: address attributes from Maryland iMAP.
- DESCLU, LU, ACRES, SQFTSTRC, YEARBLT, ZONING, BLDG_UNITS, OOI: selected parcel characteristics.
- NFMLNDVL: land assessment.
- NFMIMPVL: improvement assessment; null values are exported as 0.
- NFMTTLVL: total assessment.
- DISTRICT: selected General Assembly or congressional district value when applicable.
- JURSCODE, TOWNCODE, DESCTOWN: source jurisdiction attributes.
- APPLICABLE_TAX_RATE_PERCENT: actual applicable county or distinct municipal rate.
- PREDICTED_TAX_BILL: NFMTTLVL multiplied by the applicable rate.
- SPLIT_LAND_RATE_PERCENT / SPLIT_IMPROVEMENT_RATE_PERCENT: selected scenario input rates.
- HYPOTHETICAL_SPLIT_RATE_BILL: land assessment times split land rate plus improvements times split improvement rate.
- UNDERUTILIZED_VACANT, UNDERUTILIZED_LAND_MAJORITY, UNDERUTILIZED_HIGH_VALUE_URBAN, UNDERUTILIZED_BELOW_AVERAGE_SFH: 0/1 indicators using the app's underutilization rules.

Source: Maryland iMAP parcel layer: ${PARCEL_LAYER_URL}. Accessed ${citationTime}.
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
  if (loadedTaxParcels?.features?.length) {
    return loadedTaxParcels.features.map((feature) => ({
      properties: feature.properties || {},
      center: geometryCenter(feature.geometry),
    }));
  }
  if (!loadedParcelIds.length || !selectedGeography) throw new Error("No parcel selection is available to export.");
  setStatus("Loading parcel attributes for export…", "loading");
  const idQuery = buildParcelQuery("tax", selectedGeography);
  const records = [];
  const batchSize = 500;
  for (let start = 0; start < loadedParcelIds.length; start += batchSize) {
    const batchParams = new URLSearchParams(idQuery.options.body);
    batchParams.delete("geometry");
    batchParams.delete("geometryType");
    batchParams.delete("inSR");
    batchParams.delete("spatialRel");
    batchParams.delete("where");
    batchParams.set("objectIds", loadedParcelIds.slice(start, start + batchSize).join(","));
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
    showParcelLoadProgress("Preparing parcel export…", records.length, loadedParcelIds.length);
  }
  return records;
}

async function detailedParcelCsv(signal) {
  const records = await loadTaxRecordsForDownload(signal);
  const urbanFeatures = await ensureUrbanFeatures();
  const valid = records.map((record) => {
    const properties = record.properties;
    const land = Number(properties.NFMLNDVL);
    const total = Number(properties.NFMTTLVL);
    const improvement = properties.NFMIMPVL === null || properties.NFMIMPVL === undefined
      ? 0
      : Number(properties.NFMIMPVL);
    const ratio = Number.isFinite(land) && Number.isFinite(total) && total > 0 ? land / total : null;
    return { center: record.center, properties, land, total, improvement, ratio };
  });
  const sfh = valid.filter((item) => isSingleFamilyParcel(item.properties) && item.ratio !== null);
  const averageSfhRatio = sfh.length ? sfh.reduce((sum, item) => sum + item.ratio, 0) / sfh.length : null;
  const geographyType = elements.geographyTypeSelect.value;
  const selectedDistrict = ["assembly", "congressional"].includes(geographyType)
    ? selectedGeography?.properties?.DISTRICT || ""
    : "";
  const rates = currentScenarioRates();
  const headers = [
    "OBJECTID", "ACCTID", "ADDRESS", "STRTNUM", "STRTDIR", "STRTNAM", "STRTTYP", "STRTSFX", "STRTUNT",
    "CITY", "ZIPCODE", "DESCLU", "LU", "ACRES", "SQFTSTRC", "YEARBLT", "NFMLNDVL", "NFMIMPVL", "NFMTTLVL",
    "ZONING", "BLDG_UNITS", "OOI", "DISTRICT", "JURSCODE", "TOWNCODE", "DESCTOWN",
    "APPLICABLE_TAX_RATE_PERCENT", "PREDICTED_TAX_BILL", "SPLIT_LAND_RATE_PERCENT", "SPLIT_IMPROVEMENT_RATE_PERCENT",
    "HYPOTHETICAL_SPLIT_RATE_BILL", "UNDERUTILIZED_VACANT", "UNDERUTILIZED_LAND_MAJORITY",
    "UNDERUTILIZED_HIGH_VALUE_URBAN", "UNDERUTILIZED_BELOW_AVERAGE_SFH",
  ];
  const rows = valid.map(({ center, properties, land, total, improvement, ratio }) => {
    const isUrban = center && urbanFeatures.some((urban) => urban.geometry && pointInGeometry(center, urban.geometry));
    const vacant = properties.NFMIMPVL === null || properties.NFMIMPVL === undefined
      ? Number.isFinite(land) && Number.isFinite(total) && land === total
      : improvement === 0;
    const landMajority = Number.isFinite(land) && Number.isFinite(total) && land >= total / 2;
    const highValueUrban = Number.isFinite(land) && land >= 1000000 && landMajority && isUrban;
    const belowAverageSfh = !isSingleFamilyParcel(properties)
      && ratio !== null && averageSfhRatio !== null && ratio > averageSfhRatio;
    const actualRate = taxRateForParcel(properties);
    const predictedTax = Number.isFinite(total) && Number.isFinite(actualRate) ? total * actualRate : null;
    const hypotheticalTax = (Number.isFinite(land) ? land * rates.landRate : 0) + improvement * rates.improvementRate;
    return [
      properties.OBJECTID ?? feature.id ?? "", properties.ACCTID, properties.ADDRESS, properties.STRTNUM, properties.STRTDIR,
      properties.STRTNAM, properties.STRTTYP, properties.STRTSFX, properties.STRTUNT, properties.CITY, properties.ZIPCODE,
      properties.DESCLU, properties.LU, properties.ACRES, properties.SQFTSTRC, properties.YEARBLT, land, improvement,
      total, properties.ZONING, properties.BLDG_UNITS, properties.OOI, selectedDistrict, properties.JURSCODE, properties.TOWNCODE,
      properties.DESCTOWN, Number.isFinite(actualRate) ? actualRate * 100 : "", predictedTax, rates.landRate * 100,
      rates.improvementRate * 100, hypotheticalTax, vacant ? 1 : 0, landMajority ? 1 : 0, highValueUrban ? 1 : 0,
      belowAverageSfh ? 1 : 0,
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
  const hypotheticalParts = [
    Number.isFinite(landValue) ? landValue * taxScenario?.landRate : null,
    Number.isFinite(improvementValue) ? improvementValue * taxScenario?.improvementRate : null,
  ].filter(Number.isFinite);
  const hypotheticalTax = taxScenario
    ? (hypotheticalParts.length ? hypotheticalParts.reduce((total, value) => total + value, 0) : null)
    : currentTax;

  return {
    currentRate,
    currentTax,
    hypotheticalTax,
  };
}

function popupMarkup(properties, toolKey = activeTool) {
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

  const taxDetails = toolKey === "tax" ? taxPopupDetails(properties) : null;

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
        ${taxDetails ? `
        <dt>Applicable tax rate</dt><dd>${escapeHtml(formatTaxRate(taxDetails.currentRate))}</dd>
        <dt>Predicted tax bill</dt><dd>${escapeHtml(formatCurrency(taxDetails.currentTax))}</dd>
        <dt>Hypothetical split-rate bill</dt><dd>${escapeHtml(formatCurrency(taxDetails.hypotheticalTax))}</dd>` : ""}
      </dl>
    </div>`;
}

function refreshOpenParcelPopup() {
  if (openParcelPopup) {
    openParcelPopup.popup.setContent(popupMarkup(openParcelPopup.properties, openParcelPopup.toolKey));
    openParcelPopup.popup.update();
  }
  if (!parcelLayer || typeof parcelLayer.eachLayer !== "function") return;
  parcelLayer.eachLayer((layer) => {
    if (typeof layer.isPopupOpen === "function" && layer.isPopupOpen()) {
      layer.setPopupContent(popupMarkup(layer.feature?.properties || {}, activeTool));
    }
  });
}

async function renderParcels(geojson, toolKey, geography = null, summary = null, countOverride = null) {
  if (parcelLayer) {
    map.removeLayer(parcelLayer);
  }

  serverRenderedParcelLayer = shouldUseServerRenderedParcels(
    elements.geographyTypeSelect.value,
    geography,
  );
  if (serverRenderedParcelLayer) {
    parcelLayer = createServerRenderedParcelLayer(toolKey, geography).addTo(map);
    await parcelLayer.refresh();
  } else {
    parcelLayer = L.geoJSON(geojson, {
      style: (feature) => {
        const style = createParcelStyle(toolKey);
        if (toolKey === "tax" && underutilizedMode && feature.properties?.underutilizedMatch) {
          style.color = "#e56b2f";
          style.fillColor = "#f4a261";
          style.weight = 2.5;
          style.fillOpacity = 0.58;
        }
        return style;
      },
      onEachFeature: (feature, layer) => {
        layer.bindPopup(popupMarkup(feature.properties || {}, toolKey), {
          className: "parcel-tooltip",
          maxWidth: 280,
        });
        layer.on({
          click: () => layer.setPopupContent(popupMarkup(feature.properties || {}, toolKey)),
          mouseover: (event) => event.target.setStyle({ weight: 2, fillOpacity: 0.48 }),
          mouseout: (event) => parcelLayer.resetStyle(event.target),
        });
      },
    }).addTo(map);
  }

  const count = countOverride ?? geojson.features?.length ?? 0;
  elements.parcelCount.textContent = count.toLocaleString();
  // Recalculate from the rendered features so the final values honor the
  // center-in-boundary check used by selected-geography results.
  const analysisSummary = summary || (toolKey === "tax"
    ? summarizeTaxParcels(geojson)
    : summarizeParcels(geojson));
  updateAnalysisMetrics(toolKey, analysisSummary);
  updateMapStatus(
    geography
      ? `${count.toLocaleString()} parcels shown for ${formatGeographyName(geography)}`
      : `${count.toLocaleString()} parcels shown in view`,
  );
  return count;
}

function prepareTaxModelControls() {
  if (activeTool !== "tax" || !loadedTaxParcels) return;
  const defaultRate = (Number.isFinite(currentTaxRate) ? currentTaxRate : 0.01) * 100;
  elements.landTaxRate.value = defaultRate.toFixed(4);
  elements.improvementTaxRate.value = defaultRate.toFixed(4);
  elements.taxModelResult.hidden = true;
  elements.hypotheticalTaxValue.textContent = "—";
  elements.taxModelControls.hidden = false;
  elements.underutilizedControl.hidden = serverRenderedParcelLayer;
}

function validateTaxRateInput(input) {
  const value = input.value.trim();
  const decimalPlaces = value.includes(".") ? value.split(".")[1].length : 0;
  const isNumeric = /^(?:\d+\.?\d*|\.\d+)$/.test(value);
  const isValid = isNumeric && decimalPlaces <= 6 && Number(value) >= 0;
  input.setCustomValidity(isValid ? "" : "Enter a non-negative rate with no more than 6 decimal places.");
  return isValid;
}

function isSingleFamilyParcel(properties) {
  const description = String(properties.DESCLU || "").toLowerCase();
  if (/single[- ]family|single family detached|detached dwelling|sfh/.test(description)) return true;
  const landUse = String(properties.LU || "").trim().toUpperCase();
  const units = Number(properties.BLDG_UNITS);
  return landUse === "R"  // Residential
    && Number(properties.SQFTSTRC) > 0
    && (!Number.isFinite(units) || units <= 1)  // Single-family
    && !/townhouse|town house|attached|multifamily|multi-family|apartment/.test(description);
}

async function updateUnderutilizedHighlights(updateId = underutilizedUpdateId) {
  if (!loadedTaxParcels || !parcelLayer) return;
  if (underutilizedMode === "high-value-urban" && !urbanFeaturesPromise) {
    const params = new URLSearchParams({ where: "1=1", outFields: "*", returnGeometry: "true", outSR: "4326", f: "geojson" });
    urbanFeaturesPromise = fetch("https://mdgeodata.md.gov/imap/rest/services/Boundaries/MD_CensusStatisticalBoundaries/FeatureServer/4/query?" + params)
      .then((response) => response.json())
      .then((payload) => {
        if (payload.error || payload.type !== "FeatureCollection") throw new Error("Urban-area service returned an invalid response.");
        return payload.features || [];
      }).catch((error) => { urbanFeaturesPromise = null; throw error; });
  }
  const urbanFeatures = underutilizedMode === "high-value-urban" ? await urbanFeaturesPromise : [];
  if (updateId !== underutilizedUpdateId) return;
  const features = loadedTaxParcels.features;
  const valid = features.map((feature) => {
    const properties = feature.properties || {};
    const land = Number(properties.NFMLNDVL);
    const total = Number(properties.NFMTTLVL);
    const improvement = Number(properties.NFMIMPVL);
    const ratio = Number.isFinite(land) && Number.isFinite(total) && total > 0 ? land / total : null;
    return { feature, properties, land, total, improvement, ratio };
  });
  const sfh = valid.filter((item) => isSingleFamilyParcel(item.properties) && item.ratio !== null);
  const averageSfhRatio = sfh.length ? sfh.reduce((sum, item) => sum + item.ratio, 0) / sfh.length : null;
  valid.forEach((item) => {
    const { properties, land, total, improvement, ratio } = item;
    const vacant = Number.isFinite(improvement) ? improvement === 0 : Number.isFinite(land) && Number.isFinite(total) && land === total;
    const center = geometryCenter(item.feature.geometry);
    const isUrban = center && urbanFeatures.some((urban) => urban.geometry && pointInGeometry(center, urban.geometry));
    properties.underutilizedMatch = underutilizedMode === "vacant"
      ? vacant
      : underutilizedMode === "land-majority"
        ? Number.isFinite(land) && Number.isFinite(total) && land >= total / 2
        : underutilizedMode === "high-value-urban"
          ? Number.isFinite(land) && land >= 1000000 && Number.isFinite(total) && land >= total / 2 && isUrban
          : underutilizedMode === "below-average-sfh"
            ? !isSingleFamilyParcel(properties) && ratio !== null && averageSfhRatio !== null && ratio > averageSfhRatio
            : false;
  });
  parcelLayer.setStyle((feature) => {
    const style = createParcelStyle("tax");
    if (underutilizedMode && feature.properties?.underutilizedMatch) {
      style.color = "#e56b2f"; style.fillColor = "#f4a261"; style.weight = 2.5; style.fillOpacity = 0.58;
    }
    return style;
  });
}

async function loadParcelValueTotal(toolKey, geography, field, signal) {
  const query = parcelAggregateRequest(toolKey, geography, [
    { statisticType: "avg", onStatisticField: field, outStatisticFieldName: "averageValue" },
    { statisticType: "count", onStatisticField: field, outStatisticFieldName: "valueCount" },
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
  const attributes = payload.features?.[0]?.attributes || {};
  const average = Number(attributes.averageValue);
  const count = Number(attributes.valueCount);
  return Number.isFinite(average) && Number.isFinite(count) ? average * count : 0;
}

async function loadGroupedHypotheticalTax(geography, landRate, improvementRate, signal) {
  const query = parcelGroupedStatisticsRequest("tax", geography, [
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

  const byCounty = new Map();
  const byJurisdiction = new Map();
  payload.features?.forEach((feature) => {
    const attributes = feature.attributes || {};
    const details = taxJurisdictionDetails(attributes);
    const { county, jurisdiction } = details;
    const land = Number(attributes.averageLand) * Number(attributes.landCount);
    const improvement = Number(attributes.averageImprovement) * Number(attributes.improvementCount);
    const parcelCount = Number(attributes.landCount);
    const revenue = (Number.isFinite(land) ? land * landRate : 0)
      + (Number.isFinite(improvement) ? improvement * improvementRate : 0);
    byCounty.set(county, (byCounty.get(county) || 0) + revenue);
    const existing = byJurisdiction.get(jurisdiction) || {
      ...details,
      parcelCount: 0,
      landValue: 0,
      improvementValue: 0,
      hypotheticalTax: 0,
    };
    existing.parcelCount += Number.isFinite(parcelCount) ? parcelCount : 0;
    existing.landValue += Number.isFinite(land) ? land : 0;
    existing.improvementValue += Number.isFinite(improvement) ? improvement : 0;
    existing.hypotheticalTax += revenue;
    byJurisdiction.set(jurisdiction, existing);
  });
  return { byCounty, byJurisdiction };
}

function groupHypotheticalTaxFeatures(features, landRate, improvementRate) {
  const byCounty = new Map();
  const byJurisdiction = new Map();
  features.forEach((feature) => {
    const properties = feature.properties || {};
    const details = taxJurisdictionDetails(properties);
    const landValue = Number(properties.NFMLNDVL);
    const improvementValue = Number(properties.NFMIMPVL) || 0;
    const revenue = (Number.isFinite(landValue) ? landValue * landRate : 0)
      + improvementValue * improvementRate;
    byCounty.set(details.county, (byCounty.get(details.county) || 0) + revenue);
    const existing = byJurisdiction.get(details.jurisdiction) || {
      ...details,
      parcelCount: 0,
      landValue: 0,
      improvementValue: 0,
      hypotheticalTax: 0,
    };
    existing.parcelCount += 1;
    existing.landValue += Number.isFinite(landValue) ? landValue : 0;
    existing.improvementValue += improvementValue;
    existing.hypotheticalTax += revenue;
    byJurisdiction.set(details.jurisdiction, existing);
  });
  return { byCounty, byJurisdiction };
}

// Is this optimized?
async function calculateHypotheticalTax(event) {
  event.preventDefault();
  if (!loadedTaxParcels || taxScenarioRequest) return;

  const hasValidRates = [elements.landTaxRate, elements.improvementTaxRate]
    .every(validateTaxRateInput);
  if (!hasValidRates) {
    setStatus("Enter non-negative rates with no more than 6 decimal places.", "error");
    return;
  }

  const landRate = Number(elements.landTaxRate.value) / 100;
  const improvementRate = Number(elements.improvementTaxRate.value) / 100;
  if (!Number.isFinite(landRate) || landRate < 0 || !Number.isFinite(improvementRate) || improvementRate < 0) {
    setStatus("Enter valid non-negative tax rates.", "error");
    return;
  }

  const controller = new AbortController();
  taxScenarioRequest = controller;
  elements.calculateTaxModel.disabled = true;
  elements.calculateTaxModel.classList.add("is-loading");
  elements.calculateTaxModelLabel.textContent = "Calculating…";
  elements.landTaxRate.disabled = true;
  elements.improvementTaxRate.disabled = true;
  setStatus("Calculating split-rate scenario…", "loading");

  try {
    let hypotheticalRevenue;
    let hypotheticalBreakdown;
    if (serverRenderedParcelLayer) {
      const [landValue, improvementValue] = await Promise.all([
        loadParcelValueTotal("tax", selectedGeography, "NFMLNDVL", controller.signal),
        loadParcelValueTotal("tax", selectedGeography, "NFMIMPVL", controller.signal),
      ]);
      hypotheticalRevenue = landRate * landValue + improvementRate * improvementValue;
    } else {
      hypotheticalRevenue = loadedTaxParcels.features.reduce((total, feature) => {
        const properties = feature.properties || {};
        const landValue = Number(properties.NFMLNDVL);
        const improvementValue = Number(properties.NFMIMPVL);
        return total
          + (Number.isFinite(landValue) ? landRate * landValue : 0)
          + (Number.isFinite(improvementValue) ? improvementRate * improvementValue : 0);
      }, 0);
    }

    elements.hypotheticalTaxValue.textContent = formatCompactCurrency(hypotheticalRevenue);
    const geographyType = elements.geographyTypeSelect.value;
    if (geographyType === "assembly" || geographyType === "congressional") {
      elements.taxModelResult.hidden = true;
      resetTaxCountyResults(elements.taxModelCountyResults, "Hypothetical tax by county");
      elements.taxModelCountyResults.hidden = false;
      if (serverRenderedParcelLayer) {
        hypotheticalBreakdown = await loadGroupedHypotheticalTax(
          selectedGeography,
          landRate,
          improvementRate,
          controller.signal,
        );
      } else {
        let groupedParcels;
        try {
          groupedParcels = await groupParcelsByCounty(loadedTaxParcels.features);
        } catch (error) {
          console.warn("Could not assign parcels to counties:", error);
          groupedParcels = new Map([["Unknown county", loadedTaxParcels.features]]);
        }
        hypotheticalBreakdown = groupHypotheticalTaxFeatures(
          groupedParcels.size
            ? [...groupedParcels.values()].flat()
            : loadedTaxParcels.features,
          landRate,
          improvementRate,
        );
      }

      [...hypotheticalBreakdown.byCounty.entries()].sort(([a], [b]) => a.localeCompare(b)).forEach(([county, revenue], index) => {
        const row = document.createElement("div");
        row.className = "tax-model-county-row";
        row.innerHTML = `<span>${escapeHtml(county)}</span><strong>Calculating…</strong>`;
        elements.taxModelCountyResults.append(row);
        setTimeout(() => {
          row.querySelector("strong").textContent = formatCompactCurrency(revenue);
        }, index * 120);
      });
    } else {
      elements.taxModelResult.hidden = false;
      hypotheticalBreakdown = groupHypotheticalTaxFeatures(loadedTaxParcels.features, landRate, improvementRate);
    }
    taxScenario = { landRate, improvementRate };
    taxScenarioSummary = {
      revenue: hypotheticalRevenue,
      byCounty: hypotheticalBreakdown?.byCounty || new Map(),
      byJurisdiction: hypotheticalBreakdown?.byJurisdiction || new Map(),
    };
    refreshOpenParcelPopup();
    setStatus("Hypothetical tax calculated from the loaded parcels.", "success");
  } catch (error) {
    if (error.name === "AbortError") return;
    console.error(error);
    setStatus(`Could not calculate the scenario. ${error.message}`, "error");
  } finally {
    if (taxScenarioRequest === controller) {
      taxScenarioRequest = null;
      elements.calculateTaxModel.disabled = false;
      elements.calculateTaxModel.classList.remove("is-loading");
      elements.calculateTaxModelLabel.textContent = "Calculate scenario";
      elements.landTaxRate.disabled = false;
      elements.improvementTaxRate.disabled = false;
    }
  }
}

async function loadParcels() {
  if (!activeTool || !selectedGeography) return;
  const toolAtRequestStart = activeTool;
  const geographyAtRequestStart = selectedGeography;
  const config = TOOL_CONFIG[toolAtRequestStart];

  if (currentRequest) currentRequest.abort();
  if (taxScenarioRequest) {
    taxScenarioRequest.abort();
    taxScenarioRequest = null;
  }
  if (downloadRequest) {
    downloadRequest.abort();
    downloadRequest = null;
  }
  underutilizedUpdateId += 1;
  const request = new AbortController();
  currentRequest = request;
  if (openParcelPopup) {
    openParcelPopup.popup.remove();
    openParcelPopup = null;
  }
  removeParcelLoadingMarker();
  loadedTaxParcels = null;
  loadedParcelIds = [];
  latestTaxSummary = null;
  currentTaxRate = null;
  taxScenario = null;
  taxScenarioSummary = null;
  hideParcelLoadProgress();
  elements.calculateTaxModel.disabled = false;
  elements.calculateTaxModel.classList.remove("is-loading");
  elements.calculateTaxModelLabel.textContent = "Calculate scenario";
  elements.landTaxRate.disabled = false;
  elements.improvementTaxRate.disabled = false;
  elements.underutilizedSelect.disabled = false;
  elements.taxDownloadControls.hidden = true;
  setDownloadButtonsDisabled(false);
  elements.taxModelControls.hidden = true;
  elements.underutilizedControl.hidden = true;
  elements.underutilizedSelect.value = "";
  underutilizedMode = "";
  elements.taxModelResult.hidden = true;
  resetTaxCountyResults(elements.taxModelCountyResults, "Hypothetical tax by county");
  elements.taxModelCountyResults.hidden = true;
  resetTaxCountyResults(elements.taxCurrentCountyResults, "Current tax by county");
  elements.taxCurrentCountyResults.hidden = true;
  elements.hypotheticalTaxValue.textContent = "—";
  elements.refreshParcels.disabled = true;
  updateAnalysisMetrics(toolAtRequestStart);
  setStatus(
    geographyAtRequestStart
      ? `Counting parcels for ${formatGeographyName(geographyAtRequestStart)}…`
      : "Querying parcels in the current map view…",
    "loading",
  );
  updateMapStatus(
    geographyAtRequestStart ? "Counting matching parcels…" : "Loading parcel boundaries…",
  );
  showParcelLoadProgress(
    geographyAtRequestStart ? "Counting parcels…" : "Loading parcel shapes…",
    0,
    null,
    true,
  );

  try {
    let payload;
    let queryWasTruncated = false;
    let taxSummary = null;
    let objectIds = null;
    let taxMetricsPromise = null;
    if (geographyAtRequestStart) {
      objectIds = await loadGeographyParcelIds(
        toolAtRequestStart,
        geographyAtRequestStart,
        request.signal,
      );
      elements.parcelCount.textContent = objectIds.length.toLocaleString();
      loadedParcelIds = objectIds;
      showParcelLoadProgress("Loading parcel shapes…", 0, objectIds.length);

      if (toolAtRequestStart === "tax") {
        taxMetricsPromise = loadTaxMetrics(
          elements.geographyTypeSelect.value,
          geographyAtRequestStart,
          objectIds.length,
          request.signal,
          (message) => {
            setStatus(message, "loading");
            updateMapStatus(message);
          },
          shouldUseServerRenderedParcels(elements.geographyTypeSelect.value, geographyAtRequestStart),
        );
        if (!shouldUseServerRenderedParcels(elements.geographyTypeSelect.value, geographyAtRequestStart)) {
          showParcelLoadProgress("Calculating parcel metrics…", 0, null, true);
          taxSummary = await taxMetricsPromise;
          currentTaxRate = taxSummary.countyTaxRate;
          latestTaxSummary = taxSummary;
        }
      }

      setStatus("Loading parcel boundaries…", "loading");
      updateMapStatus("Loading parcel boundaries…");
      if (shouldUseServerRenderedParcels(elements.geographyTypeSelect.value, geographyAtRequestStart)) {
        showParcelLoadProgress("Rendering parcel imagery…", 0, null, true);
        payload = { type: "FeatureCollection", features: [] };
      } else {
        payload = await loadGeographyParcels(
          toolAtRequestStart,
          geographyAtRequestStart,
          request.signal,
          objectIds,
          (loaded, total) => showParcelLoadProgress("Loading parcel shapes…", loaded, total),
        );
      }
    } else {
      const query = buildParcelQuery(toolAtRequestStart, geographyAtRequestStart);
      const response = await fetch(query.url, {
        ...query.options,
        signal: request.signal,
        headers: { Accept: "application/geo+json, application/json" },
      });
      payload = await response.json();

      if (!response.ok || payload.error) {
        throw new Error(payload.error?.message || `Parcel service returned ${response.status}.`);
      }
      if (payload.type !== "FeatureCollection") {
        throw new Error("The parcel service did not return GeoJSON.");
      }
      queryWasTruncated = Boolean(payload.exceededTransferLimit);
    }

    if (
      activeTool === toolAtRequestStart &&
      selectedGeography === geographyAtRequestStart
    ) {
      const filteredPayload = filterParcelsToGeography(payload, geographyAtRequestStart);
      if (toolAtRequestStart === "tax") {
        loadedTaxParcels = filteredPayload;
      }
      const usesServerRendering = geographyAtRequestStart && shouldUseServerRenderedParcels(
        elements.geographyTypeSelect.value,
        geographyAtRequestStart,
      );
      if (
        toolAtRequestStart === "tax" &&
        !usesServerRendering &&
        taxSummary &&
        (!Number.isFinite(taxSummary.landValue) || !Number.isFinite(taxSummary.totalValue))
      ) {
        taxSummary = {
          ...summarizeTaxParcels(filteredPayload),
          countyTaxRate: taxSummary.countyTaxRate,
        };
      }
      await renderParcels(
        filteredPayload,
        toolAtRequestStart,
        geographyAtRequestStart,
        usesServerRendering && toolAtRequestStart === "tax"
          ? { landValue: null, totalValue: null, landValueRatio: null, currentTaxRevenue: null }
          : taxSummary,
        usesServerRendering ? objectIds.length : null,
      );
      hideParcelLoadProgress();
      if (taxMetricsPromise) {
        taxSummary = await taxMetricsPromise;
        if (
          !usesServerRendering &&
          (!Number.isFinite(taxSummary.landValue) || !Number.isFinite(taxSummary.totalValue))
        ) {
          taxSummary = {
            ...summarizeTaxParcels(filteredPayload),
            countyTaxRate: taxSummary.countyTaxRate,
          };
        }
        currentTaxRate = taxSummary.countyTaxRate;
        updateCurrentTaxCountyResults(taxSummary.currentTaxByCounty);
        updateAnalysisMetrics("tax", taxSummary);
        latestTaxSummary = taxSummary;
      }
      if (toolAtRequestStart === "tax") {
        prepareTaxModelControls();
        latestTaxSummary = taxSummary;
        elements.taxDownloadControls.hidden = false;
      }
      const limitNotice = queryWasTruncated
        ? " The service limited this map-view result; zoom in for a complete view."
        : "";
      setStatus(`${config.title} is ready.${limitNotice}`, "success");
    }
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
      activeTool === toolAtRequestStart &&
      selectedGeography === geographyAtRequestStart
    ) {
      elements.refreshParcels.disabled = false;
    }
    if (currentRequest === request) currentRequest = null;
  }
}

function toggleMenu(menu, button, otherMenu, otherButton) {
  const isOpen = !menu.hidden;
  menu.hidden = isOpen;
  button.setAttribute("aria-expanded", String(!isOpen));
  if (otherMenu && otherButton) {
    otherMenu.hidden = true;
    otherButton.setAttribute("aria-expanded", "false");
  }
}

elements.geographyToggle.addEventListener("click", () => {
  toggleMenu(
    elements.geographyMenu,
    elements.geographyToggle,
    elements.analysisMenu,
    elements.analysisToggle,
  );
});

elements.analysisToggle.addEventListener("click", () => {
  toggleMenu(
    elements.analysisMenu,
    elements.analysisToggle,
    elements.geographyMenu,
    elements.geographyToggle,
  );
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

  if (activeTool) {
    const config = TOOL_CONFIG[activeTool];
    setStatus(`${config.title} selected. Choose a geography to load parcels.`);
    updateMapStatus("Choose a geography to load parcels");
  } else {
    updateMapStatus("Choose a geography to begin");
  }
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

  if (activeTool) {
    elements.parcelCount.textContent = "—";
    updateAnalysisMetrics(activeTool);
    if (selectedGeography) {
      loadParcels();
    } else {
      clearParcelResults();
      const config = TOOL_CONFIG[activeTool];
      setStatus(`${config.title} selected. Choose a geography to load parcels.`);
      updateMapStatus("Choose a geography to load parcels");
    }
  } else {
    updateMapStatus(selectedGeography ? `${formatGeographyName()} selected` : "All Maryland selected");
  }
});

elements.analysisSelect.addEventListener("change", () => {
  const toolKey = elements.analysisSelect.value;
  if (!toolKey) {
    closeTool();
    return;
  }
  elements.analysisSelection.textContent = TOOL_CONFIG[toolKey].title;
  elements.analysisMenu.hidden = true;
  elements.analysisToggle.setAttribute("aria-expanded", "false");
  showTool(toolKey);
});

elements.underutilizedSelect.addEventListener("change", () => {
  underutilizedMode = elements.underutilizedSelect.value;
  const updateId = ++underutilizedUpdateId;

  if (!underutilizedMode || !loadedTaxParcels || !parcelLayer) {
    if (parcelLayer && typeof parcelLayer.setStyle === "function") {
      parcelLayer.setStyle(() => createParcelStyle("tax"));
    }
    setStatus("Underutilized parcel highlights cleared.", "success");
    return;
  }

  updateUnderutilizedHighlights(updateId)
    .then(() => {
      if (updateId === underutilizedUpdateId) {
        setStatus("Underutilized parcel highlights applied.", "success");
      }
    })
    .catch((error) => {
      if (updateId !== underutilizedUpdateId) return;
      console.warn("Could not apply underutilized parcel highlight:", error);
      setStatus("Could not load the urban-area boundary.", "error");
    });
});

elements.closeTool.addEventListener("click", closeTool);
elements.refreshParcels.addEventListener("click", loadParcels);
elements.landTaxRate.addEventListener("input", () => validateTaxRateInput(elements.landTaxRate));
elements.improvementTaxRate.addEventListener("input", () => validateTaxRateInput(elements.improvementTaxRate));
elements.taxModelControls.addEventListener("submit", calculateHypotheticalTax);
elements.downloadSummary.addEventListener("click", () => {
  runDownload(
    async (signal) => downloadTextFile(downloadBaseName("summary.csv"), await summaryCsv(signal), "text/csv;charset=utf-8"),
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
map.on("zoomend", updateZoomMetric);

loadGeographyChoices("assembly");
