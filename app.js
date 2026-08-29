const PARCEL_LAYER_URL =
  "https://mdgeodata.md.gov/imap/rest/services/PlanningCadastre/MD_ParcelBoundaries/MapServer/0";
const DISTRICT_LAYER_URL =
  "https://mdgeodata.md.gov/imap/rest/services/Boundaries/MD_ElectionBoundaries/FeatureServer/1";
const STATE_CENTER = [39.2, -76.7];
const STATE_ZOOM = 8;
const MAX_PARCELS_PER_REQUEST = 1000;

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
      "Load Maryland parcels with a positive appraised full value so future tax-model assumptions can be compared.",
    where:
      "ACCTID IS NOT NULL AND ACCTID NOT IN ('ROW', 'UNK', 'GCE') AND NFMTTLVL > 0",
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
  districtSelect: document.querySelector("#district-select"),
  analysisToggle: document.querySelector("#analysis-toggle"),
  analysisMenu: document.querySelector("#analysis-menu"),
  analysisSelection: document.querySelector("#analysis-selection"),
  analysisSelect: document.querySelector("#analysis-select"),
  selectedGeography: document.querySelector("#selected-geography"),
};

let activeTool = null;
let parcelLayer = null;
let districtLayer = null;
let districtFeatures = [];
let selectedDistrict = null;
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
  elements.toolPanel.hidden = false;
  elements.toolKicker.textContent = config.kicker;
  elements.toolTitle.textContent = config.title;
  elements.toolDescription.textContent = config.description;
  elements.selectedGeography.textContent = selectedDistrict
    ? `MD - ${selectedDistrict.properties.DISTRICT}`
    : "All Maryland";
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
  elements.analysisSelect.value = "";
  elements.analysisSelection.textContent = "Choose an analysis";
  elements.parcelCount.textContent = "—";
  updateMapStatus(selectedDistrict ? `${formatDistrictName()} selected` : "Select a filter to begin");
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

function formatDistrictName(district = selectedDistrict) {
  return district ? `MD - ${district.properties.DISTRICT}` : "All Maryland";
}

function districtQueryUrl() {
  const params = new URLSearchParams({
    where: "1=1",
    outFields: "DISTRICT",
    returnGeometry: "true",
    outSR: "4326",
    f: "geojson",
  });
  return `${DISTRICT_LAYER_URL}/query?${params.toString()}`;
}

async function loadDistricts() {
  try {
    const response = await fetch(districtQueryUrl(), {
      headers: { Accept: "application/geo+json, application/json" },
    });
    const payload = await response.json();

    if (!response.ok || payload.error) {
      throw new Error(payload.error?.message || `District service returned ${response.status}.`);
    }
    if (payload.type !== "FeatureCollection") {
      throw new Error("The district service did not return GeoJSON.");
    }

    districtFeatures = (payload.features || [])
      .filter((feature) => feature.properties?.DISTRICT)
      .sort((a, b) => a.properties.DISTRICT.localeCompare(b.properties.DISTRICT));

    elements.districtSelect.replaceChildren(new Option("All Maryland", ""));
    districtFeatures.forEach((feature) => {
      const district = feature.properties.DISTRICT;
      elements.districtSelect.add(new Option(`MD - ${district}`, district));
    });
    elements.districtSelect.disabled = false;
  } catch (error) {
    console.error(error);
    elements.districtSelect.replaceChildren(new Option("Districts unavailable", ""));
    elements.districtSelect.disabled = true;
    updateMapStatus("Could not load General Assembly districts");
  }
}

function createDistrictStyle() {
  return {
    color: "#0f4d40",
    weight: 2,
    opacity: 0.9,
    fillColor: "#8ed1b4",
    fillOpacity: 0.1,
    interactive: false,
  };
}

function showSelectedDistrict() {
  if (districtLayer) {
    map.removeLayer(districtLayer);
    districtLayer = null;
  }
  if (!selectedDistrict) {
    map.setView(STATE_CENTER, STATE_ZOOM);
    return;
  }

  districtLayer = L.geoJSON(selectedDistrict, { style: createDistrictStyle() }).addTo(map);
  districtLayer.bringToFront();
  map.fitBounds(districtLayer.getBounds(), { padding: [42, 42] });
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

function filterParcelsToDistrict(geojson, district = selectedDistrict) {
  if (!district) return geojson;

  return {
    ...geojson,
    features: geojson.features.filter((feature) => {
      const center = geometryCenter(feature.geometry);
      return center && pointInGeometry(center, district.geometry);
    }),
  };
}

function districtGeometryForQuery(district = selectedDistrict) {
  if (!district) return null;

  const geometry = district.geometry;
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return {
    rings: polygons.flatMap((polygon) => polygon.map((ring) => ring.map(webMercatorPoint))),
    spatialReference: { wkid: 3857 },
  };
}

function buildParcelQuery(toolKey, district = selectedDistrict) {
  const extent = getMapExtent();
  const config = TOOL_CONFIG[toolKey];
  const districtGeometry = districtGeometryForQuery(district);
  const params = new URLSearchParams({
    where: config.where,
    geometry: districtGeometry
      ? JSON.stringify(districtGeometry)
      : `${extent.xmin},${extent.ymin},${extent.xmax},${extent.ymax}`,
    geometryType: districtGeometry ? "esriGeometryPolygon" : "esriGeometryEnvelope",
    inSR: districtGeometry ? "3857" : "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields:
      "OBJECTID,ACCTID,ADDRESS,STRTNUM,STRTDIR,STRTNAM,STRTTYP,STRTSFX,STRTUNT,CITY,ZIPCODE,DESCLU,LU,ACRES,SQFTSTRC,YEARBLT,NFMTTLVL,NFMLNDVL,NFMIMPVL,ZONING,BLDG_UNITS,OOI",
    returnGeometry: "true",
    outSR: "4326",
    resultRecordCount: String(MAX_PARCELS_PER_REQUEST),
    f: "geojson",
  });

  if (districtGeometry) {
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

async function loadDistrictParcels(toolKey, district, signal) {
  const idQuery = buildParcelQuery(toolKey, district);
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
        <dt>Land assessment</dt><dd>${escapeHtml(formatCurrency(properties.NFMLNDVL))}</dd>
        <dt>Total assessment</dt><dd>${escapeHtml(formatCurrency(properties.NFMTTLVL))}</dd>
        <dt>Zone</dt><dd>${escapeHtml(displayValue(properties.ZONING))}</dd>
      </dl>
    </div>`;
}

function renderParcels(geojson, toolKey, district = null) {
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
    district
      ? `${count.toLocaleString()} parcels shown for ${formatDistrictName(district)}`
      : `${count.toLocaleString()} parcels shown in view`,
  );
  return count;
}

async function loadParcels() {
  if (!activeTool) return;
  const toolAtRequestStart = activeTool;
  const districtAtRequestStart = selectedDistrict;
  const config = TOOL_CONFIG[toolAtRequestStart];

  if (currentRequest) currentRequest.abort();
  currentRequest = new AbortController();
  elements.refreshParcels.disabled = true;
  setStatus(
    districtAtRequestStart
      ? `Querying parcels for ${formatDistrictName(districtAtRequestStart)}…`
      : "Querying parcels in the current map view…",
    "loading",
  );
  updateMapStatus("Loading parcel boundaries…");

  try {
    let payload;
    let queryWasTruncated = false;
    if (districtAtRequestStart) {
      payload = await loadDistrictParcels(
        toolAtRequestStart,
        districtAtRequestStart,
        currentRequest.signal,
      );
    } else {
      const query = buildParcelQuery(toolAtRequestStart, districtAtRequestStart);
      const response = await fetch(query.url, {
        ...query.options,
        signal: currentRequest.signal,
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

    if (activeTool === toolAtRequestStart) {
      const filteredPayload = filterParcelsToDistrict(payload, districtAtRequestStart);
      renderParcels(filteredPayload, toolAtRequestStart, districtAtRequestStart);
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
    if (activeTool === toolAtRequestStart) {
      elements.refreshParcels.disabled = false;
    }
    currentRequest = null;
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

elements.districtSelect.addEventListener("change", () => {
  selectedDistrict = districtFeatures.find(
    (feature) => feature.properties.DISTRICT === elements.districtSelect.value,
  ) || null;
  elements.geographySelection.textContent = formatDistrictName();
  elements.selectedGeography.textContent = formatDistrictName();
  elements.geographyMenu.hidden = true;
  elements.geographyToggle.setAttribute("aria-expanded", "false");
  showSelectedDistrict();

  if (activeTool) {
    elements.parcelCount.textContent = "—";
    loadParcels();
  } else {
    updateMapStatus(selectedDistrict ? `${formatDistrictName()} selected` : "All Maryland selected");
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

loadDistricts();
