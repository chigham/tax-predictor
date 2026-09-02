const PARCEL_LAYER_URL =
  "https://mdgeodata.md.gov/imap/rest/services/PlanningCadastre/MD_ParcelBoundaries/MapServer/0";
const STATE_CENTER = [39.2, -76.7];
const STATE_ZOOM = 8;
const MAX_PARCELS_PER_REQUEST = 1000;
const COUNTY_TAX_RATES = {
  "Allegany County": 0.01,
  "Anne Arundel County": 0.01,
  "Baltimore City": 0.01,
  "Baltimore County": 0.01,
  "Calvert County": 0.01,
  "Caroline County": 0.01,
  "Carroll County": 0.01,
  "Cecil County": 0.01,
  "Charles County": 0.01,
  "Dorchester County": 0.01,
  "Frederick County": 0.01,
  "Garrett County": 0.01,
  "Harford County": 0.01,
  "Howard County": 0.01,
  "Kent County": 0.01,
  "Montgomery County": 0.01,
  "Prince George's County": 0.01,
  "Queen Anne's County": 0.01,
  "Somerset County": 0.01,
  "St. Mary's County": 0.01,
  "Talbot County": 0.01,
  "Washington County": 0.01,
  "Wicomico County": 0.01,
  "Worcester County": 0.01,
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
        queryUrl: "https://hcgeoserver.howardcountymd.gov:8443/geoserver/general/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=general%3ACouncil_Districts&outputFormat=application%2Fjson&maxFeatures=50",
        format: "geojson",
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
      "Load Maryland parcels with a positive appraised full value and no exemption class.",
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
  parcelCount: document.querySelector("#parcel-count"),
  zoomLevel: document.querySelector("#zoom-level"),
  analysisMetrics: document.querySelector("#analysis-metrics"),
  taxModelControls: document.querySelector("#tax-model-controls"),
  landTaxRate: document.querySelector("#land-tax-rate"),
  improvementTaxRate: document.querySelector("#improvement-tax-rate"),
  taxModelResult: document.querySelector("#tax-model-result"),
  hypotheticalTaxValue: document.querySelector("#hypothetical-tax-value"),
  taxModelCountyResults: document.querySelector("#tax-model-county-results"),
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
};

let activeTool = null;
let parcelLayer = null;
let geographyLayer = null;
let geographyFeatures = [];
let selectedGeography = null;
let geographyLoadRequest = null;
let currentRequest = null;
let currentTaxRate = null;
let loadedTaxParcels = null;
let underutilizedMode = "";
let urbanFeaturesPromise = null;

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
  if (absolute >= 1e9) return `$${(number / 1e9).toFixed(1)}B`;
  if (absolute >= 1e6) return `$${(number / 1e6).toFixed(1)}M`;
  if (absolute >= 1e3) return `$${(number / 1e3).toFixed(1)}K`;
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
  if (parcelLayer) {
    map.removeLayer(parcelLayer);
    parcelLayer = null;
  }
  loadedTaxParcels = null;
  underutilizedMode = "";
  elements.underutilizedSelect.value = "";
  elements.underutilizedControl.hidden = true;
  currentTaxRate = null;
  elements.taxModelControls.hidden = true;
  elements.taxModelResult.hidden = true;
  elements.hypotheticalTaxValue.textContent = "—";
  elements.taxModelCountyResults.replaceChildren();
  elements.taxModelCountyResults.hidden = true;
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

        const response = await fetch(countyCouncilQueryUrl(source), {
          signal,
          headers: { Accept: "application/geo+json, application/json" },
        });
        const payload = await response.json();
        if (!response.ok || payload.error || payload.type !== "FeatureCollection") {
          throw new Error(payload.error?.message || `Service returned ${response.status}.`);
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

  return countyKey ? COUNTY_TAX_RATES[countyKey] ?? null : null;
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
    outFields:
      "OBJECTID,ACCTID,ADDRESS,STRTNUM,STRTDIR,STRTNAM,STRTTYP,STRTSFX,STRTUNT,CITY,ZIPCODE,DESCLU,LU,ACRES,SQFTSTRC,YEARBLT,NFMTTLVL,NFMLNDVL,NFMIMPVL,ZONING,BLDG_UNITS,OOI",
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

async function loadGeographyParcels(toolKey, geography, signal, objectIds = null) {
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
  params.set("outStatistics", JSON.stringify([statistic]));
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

async function loadTaxMetrics(geographyType, geography, parcelCount, signal, updateStatus) {
  const summary = {
    landValue: null,
    totalValue: null,
    landValueRatio: null,
    currentTaxRevenue: null,
  };

  summary.countyTaxRate = await resolveCountyTaxRate(geographyType, geography, signal);

  try {
    updateStatus("Calculating total land value…");
    summary.landValue = await loadParcelStatistic("tax", geography, "NFMLNDVL", signal);
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
      "avg",
      parcelCount,
    );
    updateAnalysisMetrics("tax", summary);
    updateStatus("Calculating land-to-total ratio…");
    await new Promise((resolve) => setTimeout(resolve, 0));
    if (Number.isFinite(summary.landValue) && summary.totalValue > 0) {
      summary.landValueRatio = (summary.landValue / summary.totalValue) * 100;
    }
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
      </dl>
    </div>`;
}

function renderParcels(geojson, toolKey, geography = null) {
  if (parcelLayer) {
    map.removeLayer(parcelLayer);
  }

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
      layer.bindPopup(popupMarkup(feature.properties || {}), {
        className: "parcel-tooltip",
        maxWidth: 280,
      });
      layer.on({
        mouseover: (event) => event.target.setStyle({ weight: 2, fillOpacity: 0.48 }),
        mouseout: (event) => parcelLayer.resetStyle(event.target),
      });
    },
  }).addTo(map);

  const count = geojson.features?.length || 0;
  elements.parcelCount.textContent = count.toLocaleString();
  // Recalculate from the rendered features so the final values honor the
  // center-in-boundary check used by selected-geography results.
  updateAnalysisMetrics(toolKey, summarizeParcels(geojson));
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
  elements.landTaxRate.value = defaultRate.toFixed(2);
  elements.improvementTaxRate.value = defaultRate.toFixed(2);
  elements.taxModelResult.hidden = true;
  elements.hypotheticalTaxValue.textContent = "—";
  elements.taxModelControls.hidden = false;
  elements.underutilizedControl.hidden = false;
}

function isSingleFamilyParcel(properties) {
  const text = `${properties.DESCLU || ""} ${properties.LU || ""}`.toLowerCase();
  return /single[- ]family|sfh/.test(text);
}

async function updateUnderutilizedHighlights() {
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
            ? !isSingleFamilyParcel(properties) && ratio !== null && averageSfhRatio !== null && ratio < averageSfhRatio
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

// Is this optimized?
async function calculateHypotheticalTax(event) {
  event.preventDefault();
  if (!loadedTaxParcels) return;

  const landRate = Number(elements.landTaxRate.value) / 100;
  const improvementRate = Number(elements.improvementTaxRate.value) / 100;
  if (!Number.isFinite(landRate) || landRate < 0 || !Number.isFinite(improvementRate) || improvementRate < 0) {
    setStatus("Enter valid non-negative tax rates.", "error");
    return;
  }

  const hypotheticalRevenue = loadedTaxParcels.features.reduce((total, feature) => {
    const properties = feature.properties || {};
    const landValue = Number(properties.NFMLNDVL);
    const improvementValue = Number(properties.NFMIMPVL);
    return total
      + (Number.isFinite(landValue) ? landRate * landValue : 0)
      + (Number.isFinite(improvementValue) ? improvementRate * improvementValue : 0);
  }, 0);

  elements.hypotheticalTaxValue.textContent = formatCompactCurrency(hypotheticalRevenue);
  const geographyType = elements.geographyTypeSelect.value;
  if (geographyType === "assembly" || geographyType === "congressional") {
    elements.taxModelResult.hidden = true;
    elements.taxModelCountyResults.replaceChildren();
    elements.taxModelCountyResults.hidden = false;
    let groupedParcels;
    try {
      groupedParcels = await groupParcelsByCounty(loadedTaxParcels.features);
    } catch (error) {
      console.warn("Could not assign parcels to counties:", error);
      groupedParcels = new Map([["Unknown county", loadedTaxParcels.features]]);
    }

    [...groupedParcels.entries()].sort(([a], [b]) => a.localeCompare(b)).forEach(([county, parcels], index) => {
      const row = document.createElement("div");
      row.className = "tax-model-county-row";
      row.innerHTML = `<span>${escapeHtml(county)}</span><strong>Calculating…</strong>`;
      elements.taxModelCountyResults.append(row);
      setTimeout(() => {
        const revenue = parcels.reduce((total, feature) => {
          const properties = feature.properties || {};
          const landValue = Number(properties.NFMLNDVL);
          const improvementValue = Number(properties.NFMIMPVL);
          return total
            + (Number.isFinite(landValue) ? landRate * landValue : 0)
            + (Number.isFinite(improvementValue) ? improvementRate * improvementValue : 0);
        }, 0);
        row.querySelector("strong").textContent = formatCompactCurrency(revenue);
      }, index * 120);
    });
  } else {
    elements.taxModelResult.hidden = false;
  }
  setStatus("Hypothetical tax calculated from the loaded parcels.", "success");
}

async function loadParcels() {
  if (!activeTool || !selectedGeography) return;
  const toolAtRequestStart = activeTool;
  const geographyAtRequestStart = selectedGeography;
  const config = TOOL_CONFIG[toolAtRequestStart];

  if (currentRequest) currentRequest.abort();
  const request = new AbortController();
  currentRequest = request;
  loadedTaxParcels = null;
  currentTaxRate = null;
  elements.taxModelControls.hidden = true;
  elements.taxModelResult.hidden = true;
  elements.taxModelCountyResults.replaceChildren();
  elements.taxModelCountyResults.hidden = true;
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

  try {
    let payload;
    let queryWasTruncated = false;
    if (geographyAtRequestStart) {
      const objectIds = await loadGeographyParcelIds(
        toolAtRequestStart,
        geographyAtRequestStart,
        request.signal,
      );
      elements.parcelCount.textContent = objectIds.length.toLocaleString();

      if (toolAtRequestStart === "tax") {
        const taxSummary = await loadTaxMetrics(
          elements.geographyTypeSelect.value,
          geographyAtRequestStart,
          objectIds.length,
          request.signal,
          (message) => {
            setStatus(message, "loading");
            updateMapStatus(message);
          },
        );
        currentTaxRate = taxSummary.countyTaxRate;
      }

      setStatus("Loading parcel boundaries…", "loading");
      updateMapStatus("Loading parcel boundaries…");
      payload = await loadGeographyParcels(
        toolAtRequestStart,
        geographyAtRequestStart,
        request.signal,
        objectIds,
      );
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
      renderParcels(filteredPayload, toolAtRequestStart, geographyAtRequestStart);
      if (toolAtRequestStart === "tax") {
        prepareTaxModelControls();
      }
      const limitNotice = queryWasTruncated
        ? " The service limited this map-view result; zoom in for a complete view."
        : "";
      setStatus(`${config.title} is ready.${limitNotice}`, "success");
    }
  } catch (error) {
    if (error.name === "AbortError") return;
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
  updateUnderutilizedHighlights().catch((error) => {
    console.warn("Could not apply underutilized parcel highlight:", error);
    setStatus("Could not load the urban-area boundary.", "error");
  });
});

elements.closeTool.addEventListener("click", closeTool);
elements.refreshParcels.addEventListener("click", loadParcels);
elements.taxModelControls.addEventListener("submit", calculateHypotheticalTax);
map.on("zoomend", updateZoomMetric);

loadGeographyChoices("assembly");
