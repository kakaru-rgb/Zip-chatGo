let map;
let allProperties = [];
let filteredProperties = [];

let propertyIndex = null;
let sidoIndex = null;
let sigunguIndex = null;
let dongIndex = null;

let markerMap = new Map();
let infoWindow;
let renderTimer = null;

const INITIAL_CENTER = new naver.maps.LatLng(37.40, 127.15);

const APP_MIN_ZOOM = 10; // 0단계
const APP_START_ZOOM = 11;   // 처음 화면 1단계
const APP_MAX_ZOOM = 18; // 8단계

const SIGUNGU_STAGE_MAX = 2; // 1~2단계
const DONG_STAGE_MAX = 4;    // 3~4단계
// 5~8단계: 개별물건

const MAX_VISIBLE_MARKERS = 700;
const MAX_LIST_ITEMS = 200;

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

infoWindow = new naver.maps.InfoWindow({
  borderWidth: 0,
  backgroundColor: "transparent",
  anchorSize: new naver.maps.Size(12, 12)
});

loadProperties();

async function loadProperties() {
  try {
    const res = await fetch("../../static/js/properties.json");
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

function bindEvents() {
  naver.maps.Event.addListener(map, "idle", scheduleRender);

  document.getElementById("searchBtn").addEventListener("click", applyFilters);

  document.getElementById("searchInput").addEventListener("keydown", e => {
    if (e.key === "Enter") applyFilters();
  });

  document.getElementById("typeFilter").addEventListener("change", applyFilters);
  document.getElementById("priceFilter").addEventListener("change", applyFilters);
}

function scheduleRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(render, 180);
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
          <div class="cluster-count">${formatAreaPyeong(averageArea)}</div>
          <div class="cluster-label">${formatPriceToEok(averagePrice)}</div>
          <div class="cluster-size">(${itemCount.toLocaleString()})</div>
        </div>
      `,
      anchor: new naver.maps.Point(35, 35)
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
          <div class="property-area">${formatAreaPyeong(item.exclusive_area)}</div>
          <div class="property-marker-price">
              <span class="deal-type">매</span>
              <span class="deal-price">${formatPriceToEok(item.sale_price)}</span>
          </div>
        </div>
      `,
      anchor: new naver.maps.Point(36, 34)
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
      const pos = new naver.maps.LatLng(item.latitude, item.longitude);

      moveMapTo(pos, APP_MIN_ZOOM + 6); // 7단계

      setTimeout(() => {
        const key = `property-${item.id}`;
        let marker = markerMap.get(key);

        if (!marker) {
          marker = createPropertyMarker(item);
          markerMap.set(key, marker);
        }

        openInfoWindow(item, marker);
      }, 550);
    });

    list.appendChild(card);
  });
}

/* ===========================
   InfoWindow
=========================== */

function openInfoWindow(item, marker) {
  const html = `
    <div style="
      width:270px;
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

  infoWindow.setContent(html);
  infoWindow.open(map, marker);
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
