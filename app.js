const PARCEL_LAYER_URL =
  "https://mdgeodata.md.gov/imap/rest/services/PlanningCadastre/MD_ParcelBoundaries/MapServer/0";
const STATE_CENTER = [39.2, -76.7];
const STATE_ZOOM = 8;
const MAX_PARCELS_PER_REQUEST = 1000;

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
    serviceUrl: "https://mdgeodata.md.gov/imap/rest/services/Boundaries/MD_PoliticalBoundaries/FeatureServer/1",
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
  selectedGeography: document.querySelector("#selected-geography"),
};

let activeTool = null;
let parcelLayer = null;
let geographyLayer = null;
let geographyFeatures = [];
let selectedGeography = null;
let geographyLoadRequest = null;
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

function clearParcelResults() {
  if (currentRequest) {
    currentRequest.abort();
    currentRequest = null;
  }
  if (parcelLayer) {
    map.removeLayer(parcelLayer);
    parcelLayer = null;
  }
  elements.parcelCount.textContent = "—";
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

async function loadGeographyChoices(type) {
  const config = GEOGRAPHY_CONFIG[type];
  if (geographyLoadRequest) geographyLoadRequest.abort();
  const request = new AbortController();
  geographyLoadRequest = request;
  elements.geographyChoiceLabel.textContent = `Choose a ${config.choiceLabel.toLowerCase()}`;
  elements.geographyChoiceSelect.disabled = true;
  elements.geographyChoiceSelect.replaceChildren(new Option("Loading choices…", ""));

  try {
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
    if (geographyLoadRequest !== request) return;

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

async function loadGeographyParcels(toolKey, geography, signal) {
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

  const objectIds = idPayload.objectIds || [];
  const features = [];
  const batchSize = 500;

  for (let start = 0; start < objectIds.length; start += batchSize) {
    const batchParams = new URLSearchParams(idQuery.options.body);
    batchParams.delete("geometry");
    batchParams.delete("geometryType");
    batchParams.delete("inSR");
    batchParams.delete("spatialRel");
    batchParams.delete("where");
    batchParams.set("objectIds", objectIds.slice(start, start + batchSize).join(","));
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
  updateMapStatus(
    geography
      ? `${count.toLocaleString()} parcels shown for ${formatGeographyName(geography)}`
      : `${count.toLocaleString()} parcels shown in view`,
  );
  return count;
}

async function loadParcels() {
  if (!activeTool || !selectedGeography) return;
  const toolAtRequestStart = activeTool;
  const geographyAtRequestStart = selectedGeography;
  const config = TOOL_CONFIG[toolAtRequestStart];

  if (currentRequest) currentRequest.abort();
  const request = new AbortController();
  currentRequest = request;
  elements.refreshParcels.disabled = true;
  setStatus(
    geographyAtRequestStart
      ? `Querying parcels for ${formatGeographyName(geographyAtRequestStart)}…`
      : "Querying parcels in the current map view…",
    "loading",
  );
  updateMapStatus("Loading parcel boundaries…");

  try {
    let payload;
    let queryWasTruncated = false;
    if (geographyAtRequestStart) {
      payload = await loadGeographyParcels(
        toolAtRequestStart,
        geographyAtRequestStart,
        request.signal,
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
      renderParcels(filteredPayload, toolAtRequestStart, geographyAtRequestStart);
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

elements.closeTool.addEventListener("click", closeTool);
elements.refreshParcels.addEventListener("click", loadParcels);
map.on("zoomend", updateZoomMetric);

loadGeographyChoices("assembly");
