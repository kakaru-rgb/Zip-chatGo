const cameraToggle = document.getElementById("cameraToggle");
const cameraPreview = document.getElementById("cameraPreview");
const cameraPanel = document.querySelector(".camera-panel");
const mapRecenter = document.getElementById("mapRecenter");
const propertyInfo = document.getElementById("propertyInfo");

let cameraStream;
let activeHome = 0;
let liveMap;

cameraToggle?.addEventListener("click", async () => {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
    cameraPreview.srcObject = null;
    cameraPanel.classList.remove("connected");
    cameraToggle.textContent = "연결";
    return;
  }

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    cameraPreview.srcObject = cameraStream;
    cameraPanel.classList.add("connected");
    cameraToggle.textContent = "해제";
  } catch (error) {
    cameraToggle.textContent = "권한 필요";
    setTimeout(() => { cameraToggle.textContent = "연결"; }, 2200);
  }
});

const recommendedHomes = [
  { name: "성수 리버뷰 84㎡", price: "매매 12.8억", lat: 37.5446, lng: 127.0556, pick: true },
  { name: "서울숲 더시티 59㎡", price: "전세 7.2억", lat: 37.5483, lng: 127.0447 },
  { name: "뚝섬 파크힐 74㎡", price: "매매 10.4억", lat: 37.5385, lng: 127.0584 }
];

if (window.L && document.getElementById("liveMap")) {
  liveMap = L.map("liveMap", { zoomControl: false }).setView([37.5446, 127.0556], 15);
  L.control.zoom({ position: "bottomright" }).addTo(liveMap);
  // L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", 
  L.tileLayer("https://",
    { maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(liveMap);

  const focusHome = (home, index, animate = true) => {
    activeHome = index;
    propertyInfo.textContent = `AI가 선택한 추천 매물 · ${home.name} · ${home.price}`;
    liveMap.setView([home.lat, home.lng], home.pick ? 16 : 15.5, { animate, duration: 1.4 });
  };

  recommendedHomes.forEach((home, index) => {
    const marker = L.marker([home.lat, home.lng], {
      icon: L.divIcon({
        className: "ai-home-marker",
        html: `<button type="button" class="map-home-pin${home.pick ? " ai-pick" : ""}">${home.pick ? "<span>AI PICK</span>" : ""}<strong>${home.price}</strong><small>${home.name}</small></button>`,
        iconSize: [112, 58],
        iconAnchor: [56, 58]
      })
    }).addTo(liveMap);

    marker.on("click", () => focusHome(home, index));
  });

  mapRecenter?.addEventListener("click", () => focusHome(recommendedHomes[activeHome], activeHome));
  setInterval(() => {
    const next = (activeHome + 1) % recommendedHomes.length;
    focusHome(recommendedHomes[next], next);
  }, 9000);
}

window.addEventListener("beforeunload", () => cameraStream?.getTracks().forEach((track) => track.stop()));
