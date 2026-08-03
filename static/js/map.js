let map;
let allProperties = [];
let filteredProperties = [];

let propertyIndex = null;
let sidoIndex = null;
let sigunguIndex = null;
let dongIndex = null;

let markerMap = new Map();
let infoMarker = null;
let renderTimer = null;

let allPois = [];
let poiIndexes = new Map();
let poiMarkerMap = new Map();
let poiInfoMarker = null;
let activePoiPopupItems = [];
let activePoiPopupIndex = 0;
let activePoiPopupPosition = null;
const activePoiCategories = new Set();

const INITIAL_CENTER = new naver.maps.LatLng(37.40, 127.15);

const APP_MIN_ZOOM = 10; // 0단계
const APP_START_ZOOM = 11;   // 처음 화면 1단계
const APP_MAX_ZOOM = 18; // 8단계

const SIGUNGU_STAGE_MAX = 2; // 1~2단계
const DONG_STAGE_MAX = 4;    // 3~4단계
// 5~8단계: 개별물건

const MAX_VISIBLE_MARKERS = 700;
const MAX_LIST_ITEMS = 200;
const PROPERTY_CLUSTER_MARKER_WIDTH = 62;
const PROPERTY_CLUSTER_MARKER_HEIGHT = 60;
const PROPERTY_MARKER_WIDTH = 62;
const PROPERTY_MARKER_HEIGHT = 58;
const MAX_VISIBLE_POI_MARKERS = 500;
const MAX_BUS_ROUTES_PER_STOP = 30;

const POI_CATEGORY_CONFIG = {
  "공공기관": {
    label: "공공",
    className: "public",
    color: "#7a6fb5",
    icon: '<path d="M3 9h18M5 9v8m4-8v8m6-8v8m4-8v8M3 20h18M12 3l9 4H3l9-4Z"/>'
  },
  "교육": {
    label: "교육",
    className: "education",
    color: "#44896f",
    icon: '<path d="m3 9 9-5 9 5-9 5-9-5Zm4 3v5c3 2 7 2 10 0v-5m4-3v6"/>'
  },
  "교통": {
    label: "교통",
    className: "transport",
    color: "#397dae",
    icon: '<path d="M6 17h12a2 2 0 0 0 2-2V7c0-3-4-4-8-4S4 4 4 7v8a2 2 0 0 0 2 2Zm-2-7h16M7 20v-3m10 3v-3M8 14h.01M16 14h.01"/>'
  },
  "의료": {
    label: "의료",
    className: "medical",
    color: "#c46978",
    icon: '<path d="M12 21S4 16.5 4 9.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 8 3.5C20 16.5 12 21 12 21Z"/><path d="M8 12h2l1-3 2 6 1-3h2"/>'
  },
  "중개": {
    label: "중개",
    className: "brokerage",
    color: "#b86f0b",
    popupOffset: 54,
    icon: '<path d="m4 10 8-6 8 6v9H4v-9Z"/><path d="M7 11h10v5H7zM9 19v-3m6 3v-3"/>'
  }
};

const POI_VARIANT_CONFIG = {
  police: {
    className: "police",
    color: "#a94732"
  },
  earlyEducation: {
    className: "early-education",
    color: "#a97b16"
  }
};

map = new naver.maps.Map("map", {
  center: INITIAL_CENTER,
  zoom: APP_START_ZOOM,
  minZoom: APP_MIN_ZOOM,
  maxZoom: APP_MAX_ZOOM,
  zoomControl: true,
  zoomControlOptions: {
    position: naver.maps.Position.TOP_RIGHT
  }
});

loadProperties();
loadPois();

async function loadProperties() {
  try {
    const res = await fetch("../../static/data/properties.json");
    const data = await res.json();

    allProperties = data
      .map(item => ({
        ...item,
        id: String(item.id),
        latitude: Number(item.latitude),
        longitude: Number(item.longitude),
        sale_price: Number(item.sale_price),
        deposit: Number(item.deposit),
        monthly_rent: Number(item.monthly_rent),
        maintenance_fee: Number(item.maintenance_fee),
        exclusive_area: Number(item.exclusive_area)
      }))
      .filter(item => !isNaN(item.latitude) && !isNaN(item.longitude));

    filteredProperties = allProperties;

    rebuildIndexes();

    // 처음 화면은 항상 1단계 고정
    map.setCenter(INITIAL_CENTER);
    map.setZoom(APP_START_ZOOM);

    bindEvents();
    renderList([]);
    scheduleRender();

  } catch (err) {
    console.error("매물 데이터 로드 실패:", err);
  }
}

async function loadPois() {
  try {
    const res = await fetch("../../static/data/poi_database.json");
    const data = await res.json();

    allPois = data
      .map(item => ({
        ...item,
        poi_id: String(item.poi_id),
        latitude: Number(item.latitude),
        longitude: Number(item.longitude)
      }))
      .filter(item => (
        POI_CATEGORY_CONFIG[item.category] &&
        Number.isFinite(item.latitude) &&
        Number.isFinite(item.longitude)
      ));

    document.querySelectorAll(".poi-toggle").forEach(button => {
      const category = button.dataset.poiCategory;
      const count = allPois.filter(item => item.category === category).length;
      button.title = `${POI_CATEGORY_CONFIG[category].label} 시설 ${count.toLocaleString()}개`;
    });

    if (activePoiCategories.size) {
      rebuildPoiIndex();
      scheduleRender();
    }
  } catch (err) {
    console.error("POI 데이터 로드 실패:", err);
  }
}

function bindEvents() {
  naver.maps.Event.addListener(map, "idle", scheduleRender);
  naver.maps.Event.addListener(map, "dragstart", closeAllInfoPopups);
  naver.maps.Event.addListener(map, "zoomstart", closeAllInfoPopups);

  document.getElementById("searchBtn").addEventListener("click", applyFilters);

  document.getElementById("searchInput").addEventListener("keydown", e => {
    if (e.key === "Enter") applyFilters();
  });

  document.getElementById("typeFilter").addEventListener("change", applyFilters);
  document.getElementById("priceFilter").addEventListener("change", applyFilters);

  document.querySelectorAll(".poi-toggle").forEach(button => {
    button.addEventListener("click", () => togglePoiCategory(button));
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeAllInfoPopups();
    }
  });
}

function scheduleRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(() => {
    render();
    renderPois();
  }, 180);
}

function applyFilters() {
  const keyword = document.getElementById("searchInput").value.trim();
  const type = document.getElementById("typeFilter").value;
  const maxPrice = document.getElementById("priceFilter").value;

  filteredProperties = allProperties.filter(item => {
    const searchText = `
      ${item.title || ""}
      ${item.description || ""}
      ${item.building_name || ""}
      ${item.address || ""}
      ${item.district || ""}
      ${item.lot_number || ""}
    `;

    const keywordOk = !keyword || searchText.includes(keyword);
    const typeOk = !type || item.property_type === type;
    const priceOk = !maxPrice || item.sale_price <= Number(maxPrice);

    return keywordOk && typeOk && priceOk;
  });

    rebuildIndexes();
    renderList([]);

    // 필터를 바꿔도 지도 줌/위치는 유지
    scheduleRender();
}

/* ===========================
   Supercluster Indexes
=========================== */

function rebuildIndexes() {
  propertyIndex = buildIndex(buildPropertyFeatures(filteredProperties), {
    map: props => ({
      areaSum: props.exclusiveArea || 0,
      priceSum: props.salePrice || 0,
      itemCount: 1
    }),
    reduce: (accumulated, props) => {
      accumulated.areaSum += props.areaSum;
      accumulated.priceSum += props.priceSum;
      accumulated.itemCount += props.itemCount;
    }
  });
  sidoIndex = buildIndex(buildRegionFeatures(filteredProperties, "sido"));
  sigunguIndex = buildIndex(buildRegionFeatures(filteredProperties, "sigungu"));
  dongIndex = buildIndex(buildRegionFeatures(filteredProperties, "dong"));
}

function buildIndex(features, options = {}) {
  const index = new Supercluster({
    radius: 80,
    maxZoom: APP_MAX_ZOOM,
    minPoints: 2,
    ...options
  });

  index.load(features);
  return index;
}

function buildPropertyFeatures(items) {
  return items.map(item => ({
    type: "Feature",
    properties: {
      markerType: "property",
      id: item.id,
      markerKey: `property-${item.id}`,
      exclusiveArea: item.exclusive_area,
      salePrice: item.sale_price,
      item
    },
    geometry: {
      type: "Point",
      coordinates: [item.longitude, item.latitude]
    }
  }));
}

function buildRegionFeatures(items, level) {
  const groups = {};

  items.forEach(item => {
    const name = getRegionName(item.district, level);

    if (!groups[name]) {
      groups[name] = {
        name,
        count: 0,
        priceSum: 0,
        prices: [],
        latSum: 0,
        lngSum: 0,
        level
      };
    }

    groups[name].count += 1;
    groups[name].priceSum += item.sale_price || 0;
    groups[name].prices.push(item.sale_price || 0);   // 추가
    groups[name].latSum += item.latitude;
    groups[name].lngSum += item.longitude;
  });

  return Object.values(groups).map(group => {
    const lat = group.latSum / group.count;
    const lng = group.lngSum / group.count;
    group.prices.sort((a, b) => a - b);

    const n = group.prices.length;

    let medianPrice;

    if (n % 2 === 1) {
        medianPrice = group.prices[Math.floor(n / 2)];
    } else {
        medianPrice =
            (group.prices[n / 2 - 1] + group.prices[n / 2]) / 2;
    }

    return {
      type: "Feature",
      properties: {
          markerType: "region",
          markerKey: `${level}-${group.name}`,
          level,
          name: group.name,
          count: group.count,
          medianPrice
      },
      geometry: {
        type: "Point",
        coordinates: [lng, lat]
      }
    };
  });
}

/* ===========================
   POI Index
=========================== */

function getPoiVariant(item) {
  if (
    item.category === "공공기관" &&
    /경찰서|경찰청|파출소|지구대/.test(
      `${item.name || ""} ${item.subcategory || ""}`
    )
  ) {
    return "police";
  }

  if (
    item.category === "교육" &&
    (
      item.source_type === "kindergarten" ||
      /유치원|어린이집|보육/.test(
        `${item.name || ""} ${item.subcategory || ""}`
      )
    )
  ) {
    return "earlyEducation";
  }

  return null;
}

function getPoiMarkerConfig(category, variant) {
  const categoryConfig = POI_CATEGORY_CONFIG[category];
  const variantConfig = POI_VARIANT_CONFIG[variant];

  return variantConfig
    ? { ...categoryConfig, ...variantConfig }
    : categoryConfig;
}

function togglePoiCategory(button) {
  const category = button.dataset.poiCategory;
  const willActivate = !activePoiCategories.has(category);

  if (willActivate) {
    activePoiCategories.add(category);
  } else {
    activePoiCategories.delete(category);
  }

  button.setAttribute("aria-pressed", String(willActivate));
  closePoiInfoPopup();
  rebuildPoiIndex();
  scheduleRender();
}

function rebuildPoiIndex() {
  clearPoiMarkers();
  poiIndexes = new Map();

  if (!allPois.length || !activePoiCategories.size) {
    return;
  }

  activePoiCategories.forEach(category => {
    const coordinateGroups = new Map();

    allPois.forEach(item => {
      if (item.category !== category) return;

      const coordinateKey = `${item.latitude}|${item.longitude}`;

      if (!coordinateGroups.has(coordinateKey)) {
        coordinateGroups.set(coordinateKey, {
          coordinateKey,
          latitude: item.latitude,
          longitude: item.longitude,
          items: []
        });
      }

      coordinateGroups.get(coordinateKey).items.push(item);
    });

    const features = Array.from(coordinateGroups.values()).map(group => ({
      type: "Feature",
      properties: {
        markerType: "poi",
        markerKey: `poi-${category}-${group.coordinateKey}`,
        coordinateKey: group.coordinateKey,
        category,
        variant: getPoiVariant(group.items[0]),
        items: group.items
      },
      geometry: {
        type: "Point",
        coordinates: [group.longitude, group.latitude]
      }
    }));

    const index = new Supercluster({
      radius: 56,
      maxZoom: APP_MAX_ZOOM,
      minPoints: 2,
      map: props => ({
        policeCount: props.variant === "police" ? 1 : 0,
        earlyEducationCount: props.variant === "earlyEducation" ? 1 : 0
      }),
      reduce: (accumulated, props) => {
        accumulated.policeCount += props.policeCount;
        accumulated.earlyEducationCount += props.earlyEducationCount;
      }
    });

    index.load(features);
    poiIndexes.set(category, index);
  });
}

/* ===========================
   Render
=========================== */

function render() {
  if (!propertyIndex || !sidoIndex || !sigunguIndex || !dongIndex) return;

  const bounds = map.getBounds();
  const zoom = map.getZoom();
  const stage = getAppZoomStage(zoom);
  const bbox = getBbox(bounds);

  if (stage === 0) {
    renderRegionFromIndex(sidoIndex, bbox, zoom, "sido");
    return;
  }

  if (stage <= SIGUNGU_STAGE_MAX) {
    renderRegionFromIndex(sigunguIndex, bbox, zoom, "sigungu");
    return;
  }

  if (stage <= DONG_STAGE_MAX) {
    renderRegionFromIndex(dongIndex, bbox, zoom, "dong");
    return;
  }

  renderPropertiesFromIndex(bbox);
}

function renderPois() {
  const stage = getAppZoomStage(map.getZoom());

  if (
    !poiIndexes.size ||
    stage <= DONG_STAGE_MAX
  ) {
    clearPoiMarkers();
    return;
  }

  const bbox = getBbox(map.getBounds());
  const zoom = map.getZoom();
  const visibleFeatures = [];

  for (const [category, index] of poiIndexes.entries()) {
    const remaining = MAX_VISIBLE_POI_MARKERS - visibleFeatures.length;

    if (remaining <= 0) break;

    index
      .getClusters(bbox, zoom)
      .slice(0, remaining)
      .forEach(feature => {
        visibleFeatures.push({ category, index, feature });
      });
  }

  const nextKeys = new Set();

  visibleFeatures.forEach(({ category, index, feature }) => {
    const [lng, lat] = feature.geometry.coordinates;
    const props = feature.properties;
    const key = props.cluster
      ? `poi-cluster-${category}-${props.cluster_id}`
      : props.markerKey;

    nextKeys.add(key);

    if (!poiMarkerMap.has(key)) {
      const marker = props.cluster
        ? createPoiClusterMarker(feature, lat, lng, index, category)
        : createPoiMarker(feature, lat, lng);

      poiMarkerMap.set(key, marker);
    } else {
      poiMarkerMap.get(key).setPosition(new naver.maps.LatLng(lat, lng));
    }
  });

  removeUnusedPoiMarkers(nextKeys);
}

function renderPoiMarkerContent(category, config, title, count = 0) {
  const badge = count > 1
    ? `<span class="poi-marker-badge">${count > 99 ? "99+" : count.toLocaleString()}</span>`
    : "";

  if (category === "중개") {
    return `
      <div class="brokerage-marker" title="${escapeHtml(title)}">
        <svg class="brokerage-marker-shape" viewBox="0 0 42 48" aria-hidden="true">
          <path class="brokerage-marker-house"
                d="M21 2 39 14v21c0 2.2-1.8 4-4 4h-7l-7 8-7-8H7c-2.2 0-4-1.8-4-4V14L21 2Z"></path>
          <path class="brokerage-marker-roof"
                d="M21 2 39 14v5L21 8 3 19v-5L21 2Z"></path>
        </svg>
        <span class="brokerage-marker-sign">중개</span>
        ${badge}
      </div>
    `;
  }

  return `
    <div class="poi-marker ${config.className}" title="${escapeHtml(title)}">
      <svg class="poi-marker-icon" viewBox="0 0 24 24" aria-hidden="true">
        ${config.icon}
      </svg>
      ${badge}
    </div>
  `;
}

function getPoiMarkerAnchor(category) {
  return category === "중개"
    ? new naver.maps.Point(21, 47)
    : new naver.maps.Point(15, 15);
}

function createPoiClusterMarker(feature, lat, lng, index, category) {
  const props = feature.properties;
  const clusterId = props.cluster_id;
  const count = Number(props.point_count || 0);
  let variant = null;

  if (Number(props.policeCount || 0) === count) {
    variant = "police";
  } else if (Number(props.earlyEducationCount || 0) === count) {
    variant = "earlyEducation";
  }

  const config = getPoiMarkerConfig(category, variant);
  const marker = new naver.maps.Marker({
    position: new naver.maps.LatLng(lat, lng),
    map,
    zIndex: 180,
    icon: {
      content: renderPoiMarkerContent(
        category,
        config,
        `${config.label} 시설 ${count.toLocaleString()}곳`,
        count
      ),
      anchor: getPoiMarkerAnchor(category)
    }
  });

  naver.maps.Event.addListener(marker, "click", () => {
    const position = marker.getPosition();

    if (map.getZoom() < APP_MAX_ZOOM) {
      const nextZoom = Math.min(
        index.getClusterExpansionZoom(clusterId),
        APP_MAX_ZOOM
      );

      moveMapTo(position, nextZoom);
      return;
    }

    const items = getPoiItemsFromCluster(index, clusterId, props.point_count);
    openPoiInfoPopup(items, position);
  });

  return marker;
}

function createPoiMarker(feature, lat, lng) {
  const items = feature.properties.items || [];
  const categories = [...new Set(items.map(item => item.category))];
  const category = categories[0];
  const config = categories.length === 1
    ? getPoiMarkerConfig(category, feature.properties.variant)
    : {
        label: "주변 시설",
        className: "mixed",
        icon: '<circle cx="7" cy="12" r="2"/><circle cx="17" cy="7" r="2"/><circle cx="16" cy="17" r="2"/><path d="m9 11 6-3m-6 5 5 3"/>'
      };
  const marker = new naver.maps.Marker({
    position: new naver.maps.LatLng(lat, lng),
    map,
    zIndex: 190,
    icon: {
      content: renderPoiMarkerContent(
        category,
        config,
        items[0]?.name || config.label,
        items.length
      ),
      anchor: getPoiMarkerAnchor(category)
    }
  });

  naver.maps.Event.addListener(marker, "click", () => {
    openPoiInfoPopup(items, marker.getPosition());
  });

  return marker;
}

function getPoiItemsFromCluster(index, clusterId, pointCount) {
  return index
    .getLeaves(clusterId, pointCount, 0)
    .flatMap(leaf => leaf.properties.items || []);
}

function renderRegionFromIndex(index, bbox, zoom, level) {
  const features = index.getClusters(bbox, zoom);
  const nextKeys = new Set();

  features.forEach(feature => {
    const [lng, lat] = feature.geometry.coordinates;
    const props = feature.properties;

    let regionFeature = feature;

    if (props.cluster) {
      regionFeature = makeMergedRegionFeature(index, feature, level);
    }

    const key = regionFeature.properties.markerKey;
    nextKeys.add(key);

    if (!markerMap.has(key)) {
      const marker = createRegionMarker(regionFeature, lat, lng);
      markerMap.set(key, marker);
    } else {
      markerMap.get(key).setPosition(new naver.maps.LatLng(lat, lng));
    }
  });

  removeUnusedMarkers(nextKeys);
}

function renderPropertiesFromIndex(bbox) {
  const zoom = map.getZoom();

  // 현재 줌보다 한 단계 더 세밀하게 조회한다. 개별 매물은 최대한 많이
  // 보여주면서도, 밀집 지역은 Supercluster로 묶어 마커 DOM 수를 제한한다.
  const clusterZoom = Math.min(zoom + 1, APP_MAX_ZOOM);
  const clusters = propertyIndex
    .getClusters(bbox, clusterZoom)
    .slice(0, MAX_VISIBLE_MARKERS);
  const nextKeys = new Set();

  clusters.forEach(feature => {
    const [lng, lat] = feature.geometry.coordinates;
    const props = feature.properties;

    if (props.cluster) {
      const key = `property-cluster-${props.cluster_id}`;
      nextKeys.add(key);

      if (!markerMap.has(key)) {
        const marker = createPropertyClusterMarker(feature, lat, lng);
        markerMap.set(key, marker);
      } else {
        markerMap.get(key).setPosition(new naver.maps.LatLng(lat, lng));
      }

      return;
    }

    const item = props.item;
    const key = props.markerKey;
    nextKeys.add(key);

    if (!markerMap.has(key)) {
      const marker = createPropertyMarker(item);
      markerMap.set(key, marker);
    } else {
      markerMap.get(key).setPosition(
        new naver.maps.LatLng(item.latitude, item.longitude)
      );
    }
  });

  removeUnusedMarkers(nextKeys);
}

function createPropertyClusterMarker(feature, lat, lng) {
  const props = feature.properties;
  const clusterId = feature.properties.cluster_id;
  const itemCount = props.itemCount || props.point_count || 1;
  const averageArea = props.areaSum / itemCount;
  const averagePrice = props.priceSum / itemCount;

  const marker = new naver.maps.Marker({
    position: new naver.maps.LatLng(lat, lng),
    map,
    icon: {
      content: `
        <div class="cluster-marker">
          <svg class="cluster-marker-shape" viewBox="0 0 62 60" aria-hidden="true">
            <path d="M2 20Q1 18 3 17L28 2Q31 0 34 2L59 17Q61 18 60 20T57 22H56V56Q56 58 54 58H8Q6 58 6 56V22H5Q3 22 2 20Z"></path>
            <path class="cluster-marker-roof-highlight" d="M4 17.5 28.5 2.7Q31 1.2 33.5 2.7L58 17.5Q59.5 18.5 58.5 20H3.5Q2.5 18.5 4 17.5Z"></path>
          </svg>
          <div class="cluster-count">${formatAreaPyeong(averageArea)}</div>
          <div class="cluster-label">${formatPriceToEok(averagePrice)}</div>
          <div class="cluster-size">(${itemCount.toLocaleString()})</div>
        </div>
      `,
      anchor: new naver.maps.Point(
        PROPERTY_CLUSTER_MARKER_WIDTH / 2,
        PROPERTY_CLUSTER_MARKER_HEIGHT / 2
      )
    }
  });

  naver.maps.Event.addListener(marker, "click", () => {
    const items = propertyIndex
      .getLeaves(clusterId, props.point_count, 0)
      .map(leaf => leaf.properties.item)
      .filter(Boolean);

    renderList(items);

    const nextZoom = Math.min(
      propertyIndex.getClusterExpansionZoom(clusterId),
      APP_MAX_ZOOM
    );

    moveMapTo(marker.getPosition(), nextZoom);
  });

  return marker;
}

function makeMergedRegionFeature(index, cluster, level) {
  const leaves = index.getLeaves(
    cluster.properties.cluster_id,
    cluster.properties.point_count,
    0
  );

  let count = 0;
  let priceSum = 0;

  leaves.forEach(leaf => {
    count += leaf.properties.count || 0;
    priceSum += (leaf.properties.avgPrice || 0) * (leaf.properties.count || 0);
  });

  const avgPrice = count ? priceSum / count : 0;
  const [lng, lat] = cluster.geometry.coordinates;

  return {
    type: "Feature",
    properties: {
      markerType: "region",
      markerKey: `${level}-cluster-${cluster.properties.cluster_id}`,
      level,
      name: level === "sido" ? "주변시도" : level === "sigungu" ? "주변지역" : "주변동",
      count,
      avgPrice
    },
    geometry: {
      type: "Point",
      coordinates: [lng, lat]
    }
  };
}

/* ===========================
   Markers
=========================== */

function createRegionMarker(feature, lat, lng) {
  const props = feature.properties;
  const [featureLng, featureLat] = feature.geometry.coordinates;

  const marker = new naver.maps.Marker({
    position: new naver.maps.LatLng(lat ?? featureLat, lng ?? featureLng),
    map,
    icon: {
      content: `
        <div class="region-marker ${props.level}">
          <div class="region-name">${props.name}</div>
          <div class="region-price">
              <span class="deal-type">매</span>
              <span class="deal-price">${formatPriceToEok(props.medianPrice)}</span>
          </div>
          <div class="region-count">(${Number(props.count || 0).toLocaleString()})</div>
        </div>
      `,
      anchor: new naver.maps.Point(55, 42)
    }
  });

  naver.maps.Event.addListener(marker, "click", () => {
    renderList([]);

    let nextZoom;

    if (props.level === "sido") {
      nextZoom = APP_START_ZOOM; // 1단계
    } else if (props.level === "sigungu") {
      nextZoom = APP_START_ZOOM + 2; // 3단계
    } else {
      nextZoom = APP_START_ZOOM + 4; // 5단계
    }

    moveMapTo(marker.getPosition(), nextZoom);
  });

  return marker;
}

function createPropertyMarker(item) {
  const marker = new naver.maps.Marker({
    position: new naver.maps.LatLng(item.latitude, item.longitude),
    map,
    icon: {
      content: `
        <div class="property-marker">
          <svg class="property-marker-shape" viewBox="0 0 62 58" aria-hidden="true">
            <path d="M2 20Q1 18 3 17L28 2Q31 0 34 2L59 17Q61 18 60 20T57 22H56V54Q56 56 54 56H8Q6 56 6 54V22H5Q3 22 2 20Z"></path>
            <path class="property-marker-roof-highlight" d="M4 17.5 28.5 2.7Q31 1.2 33.5 2.7L58 17.5Q59.5 18.5 58.5 20H3.5Q2.5 18.5 4 17.5Z"></path>
          </svg>
          <div class="property-area">${formatAreaPyeong(item.exclusive_area)}</div>
          <div class="property-marker-price">
              <span class="deal-type">매</span>
              <span class="deal-price">${formatPriceToEok(item.sale_price)}</span>
          </div>
        </div>
      `,
      anchor: new naver.maps.Point(
        PROPERTY_MARKER_WIDTH / 2,
        PROPERTY_MARKER_HEIGHT / 2
      )
    }
  });

  naver.maps.Event.addListener(marker, "click", () => {
    renderList([item]);
    openInfoWindow(item, marker);
  });

  return marker;
}

/* ===========================
   List
=========================== */

function renderList(items) {
  const list = document.getElementById("propertyList");
  const count = document.getElementById("resultCount");

  count.textContent = items.length.toLocaleString();
  list.innerHTML = "";

  if (items.length > MAX_LIST_ITEMS) {
    const notice = document.createElement("div");
    notice.className = "notice";
    notice.textContent = `현재 화면에 ${items.length.toLocaleString()}개 매물이 있습니다. 확대하면 더 정확히 볼 수 있습니다.`;
    list.appendChild(notice);
  }

  items.slice(0, MAX_LIST_ITEMS).forEach(item => {
    const card = document.createElement("div");
    card.className = "property-card";

    card.innerHTML = `
      <img src="${item.thumbnail_url || ""}" onerror="this.style.display='none'">
      <div class="property-info">
        <div class="property-title">${item.title || item.building_name || "매물"}</div>
        <div class="property-price">${formatPrice(item.sale_price)}</div>
        <div class="property-meta">
          ${item.property_type || ""} · ${item.exclusive_area || "-"}㎡ · ${item.floor || "-"}층<br>
          ${item.address || ""}
        </div>
      </div>
    `;

    card.addEventListener("click", () => {
      const stage = getAppZoomStage(map.getZoom());

      if (stage <= DONG_STAGE_MAX) {
        const pos = new naver.maps.LatLng(item.latitude, item.longitude);

        moveMapTo(pos, APP_MAX_ZOOM);

        setTimeout(() => {
          clearTimeout(renderTimer);
          render();
          showPropertyInfo(item);
        }, 550);
        return;
      }

      showPropertyInfo(item);
    });

    list.appendChild(card);
  });
}

/* ===========================
   Property Info Popup
=========================== */

function openInfoWindow(item, marker) {
  closePoiInfoPopup();

  const html = `
    <div style="
      width:270px;
      transform:translate(-50%, calc(-100% - ${PROPERTY_MARKER_HEIGHT / 2}px));
      background:white;
      border-radius:16px;
      box-shadow:0 4px 18px rgba(0,0,0,0.25);
      overflow:hidden;
      font-family:Arial, 'Noto Sans KR', sans-serif;
    ">
      <img src="${item.thumbnail_url || ""}"
           style="width:100%; height:135px; object-fit:cover; background:#eee;"
           onerror="this.style.display='none'">

      <div style="padding:13px;">
        <div style="font-weight:bold; font-size:15px; margin-bottom:6px;">
          ${item.title || item.building_name || "매물"}
        </div>

        <div style="color:#1E88FF; font-weight:bold; font-size:17px; margin-bottom:6px;">
          ${formatPrice(item.sale_price)}
        </div>

        <div style="font-size:13px; color:#555; line-height:1.5;">
          ${item.property_type || ""} · ${item.exclusive_area || "-"}㎡ · ${item.floor || "-"}층<br>
          ${item.building_name || ""}<br>
          ${item.address || ""}
        </div>
      </div>
    </div>
  `;

  closeInfoWindow();

  infoMarker = new naver.maps.Marker({
    position: marker.getPosition(),
    map,
    zIndex: 1000,
    icon: {
      content: html,
      anchor: new naver.maps.Point(0, 0)
    }
  });
}

function showPropertyInfo(item) {
  const key = `property-${item.id}`;
  let marker = markerMap.get(key);

  if (!marker) {
    marker = createPropertyMarker(item);
    markerMap.set(key, marker);
  }

  openInfoWindow(item, marker);
}

function closeInfoWindow() {
  if (!infoMarker) return;

  infoMarker.setMap(null);
  infoMarker = null;
}

function openPoiInfoPopup(items, position) {
  if (!items.length) return;

  closeInfoWindow();
  activePoiPopupItems = items;
  activePoiPopupIndex = 0;
  activePoiPopupPosition = position;
  renderPoiInfoPopup();
}

function renderPoiInfoPopup() {
  const item = activePoiPopupItems[activePoiPopupIndex];

  if (!item || !activePoiPopupPosition) return;

  if (poiInfoMarker) {
    poiInfoMarker.setMap(null);
  }

  const config = POI_CATEGORY_CONFIG[item.category] || {
    label: item.category || "주변 시설",
    color: "#52627a"
  };
  const address = item.road_address || [
    item.province,
    item.city,
    item.town
  ].filter(Boolean).join(" ");
  const phoneNumber = String(item.phone_number || "").trim();
  const phone = phoneNumber
    ? `
        <div class="poi-info-phone">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6.6 3.5 9 8.3 6.9 10c1.2 2.7 3.4 4.9 6.1 6.1l1.7-2.1 4.8 2.4-.7 3.1c-.2.8-.9 1.3-1.7 1.3C9.5 20.3 3.7 14.5 3.2 6.9c0-.8.5-1.5 1.3-1.7l2.1-.7Z"/>
          </svg>
          ${escapeHtml(phoneNumber)}
        </div>
      `
    : "";
  const brokerageInfo = item.category === "중개"
    ? `
        <div class="poi-info-brokerage">
          <div class="poi-info-brokerage-row">
            <span>영업상태</span>
            <strong class="poi-info-status${item.business_status === "영업중" ? " is-open" : ""}">
              ${escapeHtml(item.business_status || "정보 없음")}
            </strong>
          </div>
          <div class="poi-info-brokerage-row">
            <span>중개업자</span>
            <strong>${escapeHtml(item.representative_name || "정보 없음")}</strong>
          </div>
          <div class="poi-info-brokerage-row is-wide">
            <span>등록번호</span>
            <strong>${escapeHtml(item.registration_number || "정보 없음")}</strong>
          </div>
        </div>
      `
    : "";
  const rawBusRoutes = Array.isArray(item.bus_routes)
    ? item.bus_routes.filter(Boolean)
    : [];
  const busRoutes = rawBusRoutes.length <= MAX_BUS_ROUTES_PER_STOP
    ? rawBusRoutes
    : [];
  const busRouteInfo = busRoutes.length
    ? `
        <div class="poi-info-routes">
          <div class="poi-info-routes-label">
            운행 버스 ${busRoutes.length.toLocaleString()}개
          </div>
          <div class="poi-info-route-list">
            ${busRoutes.map(route => (
              `<span class="poi-info-route">${escapeHtml(route)}</span>`
            )).join("")}
          </div>
        </div>
      `
    : "";
  const hasMultipleItems = activePoiPopupItems.length > 1;
  const navigation = hasMultipleItems
    ? `
        <div class="poi-info-nav">
          <button type="button"
                  aria-label="이전 시설"
                  onmousedown="event.stopPropagation()"
                  onclick="event.stopPropagation(); changePoiPopupPage(-1)">‹</button>
          <span class="poi-info-page">
            ${activePoiPopupIndex + 1} / ${activePoiPopupItems.length}
          </span>
          <button type="button"
                  aria-label="다음 시설"
                  onmousedown="event.stopPropagation()"
                  onclick="event.stopPropagation(); changePoiPopupPage(1)">›</button>
        </div>
      `
    : "";
  const html = `
    <div class="poi-info-popup"
         style="--poi-color:${config.color};--poi-popup-offset:${config.popupOffset || 22}px">
      <div class="poi-info-accent"></div>
      <div class="poi-info-body">
        <div class="poi-info-category">
          ${escapeHtml(config.label)} · ${escapeHtml(item.subcategory || "시설")}
        </div>
        <div class="poi-info-name">${escapeHtml(item.name || "이름 없는 시설")}</div>
        <div class="poi-info-address">${escapeHtml(address || "주소 정보 없음")}</div>
        ${brokerageInfo}
        ${phone}
        ${busRouteInfo}
        ${navigation}
      </div>
    </div>
  `;

  poiInfoMarker = new naver.maps.Marker({
    position: activePoiPopupPosition,
    map,
    zIndex: 1100,
    icon: {
      content: html,
      anchor: new naver.maps.Point(0, 0)
    }
  });
}

function changePoiPopupPage(direction) {
  const itemCount = activePoiPopupItems.length;

  if (itemCount < 2) return;

  activePoiPopupIndex = (
    activePoiPopupIndex + direction + itemCount
  ) % itemCount;

  renderPoiInfoPopup();
}

function closePoiInfoPopup() {
  if (poiInfoMarker) {
    poiInfoMarker.setMap(null);
    poiInfoMarker = null;
  }

  activePoiPopupItems = [];
  activePoiPopupIndex = 0;
  activePoiPopupPosition = null;
}

function closeAllInfoPopups() {
  closeInfoWindow();
  closePoiInfoPopup();
}

/* ===========================
   Helpers
=========================== */

function getAppZoomStage(zoom) {
  return zoom - APP_START_ZOOM + 1;
}

function moveMapTo(position, zoom) {
  map.morph(position, zoom, {
    duration: 500,
    easing: "easeOutCubic"
  });
}

function getBbox(bounds) {
  const sw = bounds.getSW();
  const ne = bounds.getNE();

  return [
    sw.lng(),
    sw.lat(),
    ne.lng(),
    ne.lat()
  ];
}

function getVisiblePropertiesByIndex(bbox) {
  return propertyIndex
    .getClusters(bbox, APP_MAX_ZOOM + 1)
    .map(feature => feature.properties.item)
    .filter(Boolean);
}

function removeUnusedMarkers(nextKeys) {
  for (const [key, marker] of markerMap.entries()) {
    if (!nextKeys.has(key)) {
      marker.setMap(null);
      markerMap.delete(key);
    }
  }
}

function removeUnusedPoiMarkers(nextKeys) {
  for (const [key, marker] of poiMarkerMap.entries()) {
    if (!nextKeys.has(key)) {
      marker.setMap(null);
      poiMarkerMap.delete(key);
    }
  }
}

function clearPoiMarkers() {
  for (const marker of poiMarkerMap.values()) {
    marker.setMap(null);
  }

  poiMarkerMap.clear();
}

function fitMapToData(items) {
  if (!items.length) return;

  const bounds = new naver.maps.LatLngBounds();

  items.forEach(item => {
    bounds.extend(new naver.maps.LatLng(item.latitude, item.longitude));
  });

  map.fitBounds(bounds);
}

function getRegionName(district, level) {
  if (!district) return "기타";

  const parts = district.trim().split(/\s+/);

  if (level === "sido") {
  const sido = parts[0];

  if (sido === "서울특별시") return "서울시";
  if (sido === "경기도") return "경기도";

  return sido;
  }

  if (level === "sigungu") {
    const sido = parts[0];
    const si = parts.find(p => p.endsWith("시"));
    const gu = parts.find(p => p.endsWith("구"));

    if (sido === "서울특별시") {
      return `서울시 ${gu || ""}`.trim();
    }

    if (si && gu) return `${si} ${gu}`;
    if (si) return si;
    if (gu) return gu;

    return district;
  }

  if (level === "dong") {
    const dong = parts.find(p => p.endsWith("동"));
    if (dong) return dong;

    const eup = parts.find(p => p.endsWith("읍"));
    if (eup) return eup;

    const myeon = parts.find(p => p.endsWith("면"));
    if (myeon) return myeon;

    return parts[parts.length - 1];
  }

  return district;
}

function formatPrice(price) {
  if (!price || isNaN(price)) return "-";

  const eok = Math.floor(price / 100000000);
  const man = Math.floor((price % 100000000) / 10000);

  if (eok > 0 && man > 0) {
    return `${eok}억 ${man.toLocaleString()}만`;
  }

  if (eok > 0) {
    return `${eok}억`;
  }

  return `${man.toLocaleString()}만`;
}

function formatPriceToEok(price) {
  if (!price || isNaN(price)) return "-";

  const eok = price / 100000000;

  if (eok >= 10) {
    return `${Number(eok.toFixed(1)).toString()}억`;
  }

  return `${Number(eok.toFixed(1)).toString()}억`;
}

function formatAreaPyeong(area) {
  if (!area || isNaN(area)) return "-평";

  const pyeong = area / 3.3058;
  return `${Math.round(pyeong)}평`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
