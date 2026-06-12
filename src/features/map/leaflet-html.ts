// Gera um documento HTML completo com Leaflet (mapa interativo): pins por tipo,
// popups com foto/relato/data e uma polyline ligando os pontos em ordem
// cronológica (a "timeline" do casal). Usado via iframe (web) e WebView (nativo).

export interface MapPoint {
  title: string;
  type: string;
  lat: number;
  lng: number;
  /** ISO date (created_at) — define a ordem da linha do tempo. */
  date: string;
  description: string;
  photo: string | null;
}

// Emoji + cor da borda do pin por tipo de memória.
const PIN_STYLE: Record<string, { emoji: string; color: string }> = {
  special: { emoji: '💖', color: '#C85A7C' },
  place: { emoji: '📍', color: '#477d50' },
  restaurant: { emoji: '🍽️', color: '#b06a4e' },
  movie: { emoji: '🎬', color: '#6a55b0' },
  shopping: { emoji: '🛍️', color: '#b08a2e' },
  date: { emoji: '🌹', color: '#b03b57' },
  passeio: { emoji: '🗺️', color: '#3b91a0' },
  travel: { emoji: '✈️', color: '#4a7bb0' },
  other: { emoji: '✨', color: '#C85A7C' },
};

/** Escapa o JSON para embutir com segurança dentro de uma <script>. */
function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function buildMapHtml(points: MapPoint[]): string {
  const pinStyleJson = safeJson(PIN_STYLE);
  const pointsJson = safeJson(points);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    body { background: #faf7f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .pin {
      background: #fff; width: 34px; height: 34px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 17px; box-shadow: 0 3px 10px rgba(0,0,0,0.28);
    }
    .leaflet-popup-content-wrapper { border-radius: 14px; }
    .leaflet-popup-content { margin: 12px 14px; width: 220px !important; }
    .pop-title { font-size: 15px; font-weight: 700; color: #2c2622; margin: 0 0 6px; }
    .pop-img { width: 100%; height: 120px; object-fit: cover; border-radius: 10px; margin-bottom: 8px; }
    .pop-date { font-size: 11px; color: #C85A7C; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; margin: 0 0 4px; }
    .pop-desc { font-size: 12.5px; color: #6b5a60; line-height: 1.45; margin: 0; }
    .leaflet-bar a { color: #2c2622; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var PIN_STYLE = ${pinStyleJson};
    var POINTS = ${pointsJson};

    var map = L.map('map', { zoomControl: true, scrollWheelZoom: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    function fmtDate(iso) {
      if (!iso) return '';
      try {
        return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
      } catch (e) { return ''; }
    }

    function pinIcon(type) {
      var s = PIN_STYLE[type] || PIN_STYLE.other;
      return L.divIcon({
        html: '<div class="pin" style="border: 3px solid ' + s.color + '">' + s.emoji + '</div>',
        className: '', iconSize: [34, 34], iconAnchor: [17, 17], popupAnchor: [0, -18]
      });
    }

    var latlngs = [];
    var sorted = POINTS.slice().sort(function (a, b) { return new Date(a.date) - new Date(b.date); });

    sorted.forEach(function (p) {
      var marker = L.marker([p.lat, p.lng], { icon: pinIcon(p.type) }).addTo(map);
      var html = '<p class="pop-title">' + p.title + '</p>';
      if (p.photo) html += '<img class="pop-img" src="' + p.photo + '" onerror="this.style.display=\\'none\\'" />';
      if (p.date) html += '<p class="pop-date">' + fmtDate(p.date) + '</p>';
      if (p.description) html += '<p class="pop-desc">' + p.description + '</p>';
      marker.bindPopup(html, { maxWidth: 240 });
      latlngs.push([p.lat, p.lng]);
    });

    // Linha do tempo conectando os pontos em ordem cronológica.
    if (latlngs.length > 1) {
      L.polyline(latlngs, { color: '#C85A7C', weight: 3, opacity: 0.65, dashArray: '8, 6' }).addTo(map);
    }

    if (latlngs.length === 1) {
      map.setView(latlngs[0], 13);
    } else if (latlngs.length > 1) {
      map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40] });
    } else {
      map.setView([-23.55, -46.63], 11); // São Paulo como fallback
    }
  </script>
</body>
</html>`;
}
