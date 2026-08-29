const PARCEL_LAYER_URL =
  "https://gis.princegeorgescountymd.gov/arcgis/rest/services/Property/Property_Flattened/MapServer/0";
const COUNTY_CENTER = [38.83, -76.85];
const COUNTY_ZOOM = 10;
const MAX_PARCELS_PER_REQUEST = 1000;

const TOOL_CONFIG = {
  adu: {
    kicker: "Residential opportunity",
    title: "ADU feasibility",
    description:
      "Load residential, developed parcels in the current view as a starting point for ADU research.",
    where: "RESIDENTIAL_IND IN ('D', 'H') AND DEVELOPED = 'Y'",
    color: "#146b57",
    fillColor: "#8ed1b4",
  },
  tax: {
    kicker: "Assessment signals",
    title: "Tax model analyzer",
    description:
      "Load parcels with current assessments so future tax-model assumptions can be compared.",
    where: "CURR_ASSESS > 0",
    color: "#9b721e",
    fillColor: "#e5be72",
  },
};

const map = L.map("map", {
  zoomControl: false,
  preferCanvas: true,
}).setView(COUNTY_CENTER, COUNTY_ZOOM);

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
  mapStatus: document.querySelector("#map-status-text"),
  closeTool: document.querySelector("#close-tool"),
  refreshParcels: document.querySelector("#refresh-parcels"),
};

let activeTool = null;
let parcelLayer = null;
let currentRequest = null;

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

function showTool(toolKey) {
  const config = TOOL_CONFIG[toolKey];
  if (!config) return;

  activeTool = toolKey;
  elements.welcomePanel.hidden = true;
  elements.toolPanel.hidden = false;
  elements.toolKicker.textContent = config.kicker;
  elements.toolTitle.textContent = config.title;
  elements.toolDescription.textContent = config.description;
  elements.parcelCount.textContent = "—";
  updateZoomMetric();
  loadParcels();
}

function closeTool() {
  activeTool = null;
  if (currentRequest) currentRequest.abort();
  if (parcelLayer) {
    map.removeLayer(parcelLayer);
    parcelLayer = null;
  }
  elements.toolPanel.hidden = true;
  elements.welcomePanel.hidden = false;
  elements.parcelCount.textContent = "—";
  updateMapStatus("Select a tool to load parcels");
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

function buildParcelQuery(toolKey) {
  const extent = getMapExtent();
  const config = TOOL_CONFIG[toolKey];
  const params = new URLSearchParams({
    where: config.where,
    geometry: `${extent.xmin},${extent.ymin},${extent.xmax},${extent.ymax}`,
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields:
      "OBJECTID,ACCOUNT,OWNER_NAME,PROPERTY_DESC,HOUSE_NUMBER,STREET_NAME,STREET_TYPE,CITY,ZIP5,RESIDENTIAL_IND,DEVELOPED,DWELLING_TYPE,DWELLING_UNITS,STRUCTURE_SQ_FT,YEAR_BUILT,SALES_PRICE,CURR_ASSESS,FCV_LAND,FCV_IMPS,ZONE_CODE1,FLOOD_PLAIN",
    returnGeometry: "true",
    outSR: "4326",
    resultRecordCount: String(MAX_PARCELS_PER_REQUEST),
    f: "geojson",
  });

  return `${PARCEL_LAYER_URL}/query?${params.toString()}`;
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
  const address = [properties.HOUSE_NUMBER, properties.STREET_NAME, properties.STREET_TYPE]
    .filter(Boolean)
    .join(" ");
  const title = address || displayValue(properties.PROPERTY_DESC, "Selected parcel");

  return `
    <div class="parcel-popup">
      <h3>${escapeHtml(title)}</h3>
      <dl>
        <dt>Account</dt><dd>${escapeHtml(displayValue(properties.ACCOUNT))}</dd>
        <dt>City / ZIP</dt><dd>${escapeHtml(displayValue(properties.CITY))} ${escapeHtml(displayValue(properties.ZIP5, ""))}</dd>
        <dt>Land assessment</dt><dd>${escapeHtml(formatCurrency(properties.FCV_LAND))}</dd>
        <dt>Total assessment</dt><dd>${escapeHtml(formatCurrency(properties.CURR_ASSESS))}</dd>
        <dt>Zone</dt><dd>${escapeHtml(displayValue(properties.ZONE_CODE1))}</dd>
      </dl>
    </div>`;
}

function renderParcels(geojson, toolKey) {
  if (parcelLayer) {
    map.removeLayer(parcelLayer);
  }

  parcelLayer = L.geoJSON(geojson, {
    style: createParcelStyle(toolKey),
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
  updateMapStatus(`${count.toLocaleString()} parcels shown in view`);
  return count;
}

async function loadParcels() {
  if (!activeTool) return;
  const toolAtRequestStart = activeTool;
  const config = TOOL_CONFIG[toolAtRequestStart];

  if (currentRequest) currentRequest.abort();
  currentRequest = new AbortController();
  elements.refreshParcels.disabled = true;
  setStatus("Querying parcels in the current map view…", "loading");
  updateMapStatus("Loading parcel boundaries…");

  try {
    const response = await fetch(buildParcelQuery(toolAtRequestStart), {
      signal: currentRequest.signal,
      headers: { Accept: "application/geo+json, application/json" },
    });
    const payload = await response.json();

    if (!response.ok || payload.error) {
      throw new Error(payload.error?.message || `Parcel service returned ${response.status}.`);
    }
    if (payload.type !== "FeatureCollection") {
      throw new Error("The parcel service did not return GeoJSON.");
    }

    if (activeTool === toolAtRequestStart) {
      const count = renderParcels(payload, toolAtRequestStart);
      const limitNotice = count >= MAX_PARCELS_PER_REQUEST ? " Zoom in to see more precise results." : "";
      setStatus(`${config.title} is ready.${limitNotice}`, "success");
    }
  } catch (error) {
    if (error.name === "AbortError") return;
    console.error(error);
    elements.parcelCount.textContent = "—";
    updateMapStatus("Parcel request failed");
    setStatus(`Could not load parcels. ${error.message}`, "error");
  } finally {
    if (activeTool === toolAtRequestStart) {
      elements.refreshParcels.disabled = false;
    }
    currentRequest = null;
  }
}

document.querySelectorAll("[data-tool]").forEach((button) => {
  button.addEventListener("click", () => showTool(button.dataset.tool));
});

elements.closeTool.addEventListener("click", closeTool);
elements.refreshParcels.addEventListener("click", loadParcels);
map.on("zoomend", updateZoomMetric);
