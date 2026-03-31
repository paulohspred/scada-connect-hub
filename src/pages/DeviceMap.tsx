import { DashboardLayout } from "@/components/DashboardLayout";
import { useDevices } from "@/hooks/useData";
import { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ── Status config ───────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  online: "#22c55e",
  offline: "#ef4444",
  pending: "#f59e0b",
  approved: "#ff6a00",
};

type FilterStatus = "all" | "online" | "offline" | "pending" | "approved";

const LEGEND = [
  { label: "Online", color: "#22c55e" },
  { label: "Offline", color: "#ef4444" },
  { label: "Pendente", color: "#f59e0b" },
  { label: "Aprovado", color: "#ff6a00" },
];

const DeviceMap = () => {
  const { data: devices = [] } = useDevices();
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");

  // Filtered devices for map
  const visibleDevices = useMemo(() =>
    devices.filter((d) => {
      if (!d.lat || !d.lng || (d.lat === 0 && d.lng === 0)) return false;
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      return true;
    }),
    [devices, statusFilter]
  );

  // ── Init map — only once ────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: false })
      .setView([-15.78, -47.93], 4); // View centrada no Brasil

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    layerGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      // ✅ Proper cleanup — prevents memory leak on component unmount
      layerGroupRef.current?.clearLayers();
      layerGroupRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Update markers when devices or filters change ───────────────────────
  useEffect(() => {
    const group = layerGroupRef.current;
    if (!group) return;

    // ✅ Clear only our managed layers (layer group), not tile layers
    group.clearLayers();

    visibleDevices.forEach((device) => {
      const fillColor = STATUS_COLORS[device.status] || "#71717a";
      const isOnline = device.status === "online";

      // Main marker — pulsing for online
      const marker = L.circleMarker([device.lat!, device.lng!], {
        radius: isOnline ? 9 : 7,
        fillColor,
        fillOpacity: 0.9,
        color: "#fff",
        weight: isOnline ? 2 : 1,
        opacity: isOnline ? 0.8 : 0.4,
        className: isOnline ? "leaflet-online-pulse" : "",
      });

      const bytesRx = device.bytes_rx ? `${(device.bytes_rx / 1024).toFixed(1)} KB` : "—";
      const bytesTx = device.bytes_tx ? `${(device.bytes_tx / 1024).toFixed(1)} KB` : "—";

      marker.bindPopup(`
        <div style="font-size:12px;line-height:1.6;min-width:160px">
          <p style="font-weight:700;margin-bottom:4px">${device.name || "Sem nome"}</p>
          <p style="color:#9ca3af;font-size:10px;margin-bottom:6px">${device.identifier}</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:11px">
            <span style="color:#6b7280">Status</span><span style="color:${fillColor};font-weight:600">${device.status.toUpperCase()}</span>
            <span style="color:#6b7280">IP</span><span>${device.last_ip || "—"}</span>
            <span style="color:#6b7280">Porta</span><span>${device.scada_port || "—"}</span>
            <span style="color:#6b7280">Sinal</span><span>${device.signal_dbm ?? "—"} dBm</span>
            <span style="color:#6b7280">TX</span><span style="color:#818cf8">${bytesTx}</span>
            <span style="color:#6b7280">RX</span><span style="color:#34d399">${bytesRx}</span>
          </div>
        </div>
      `, { maxWidth: 220 }).addTo(group);
    });

    // If we have visible devices, fit the map to show all of them
    if (visibleDevices.length > 0) {
      const bounds = L.latLngBounds(visibleDevices.map((d) => [d.lat!, d.lng!]));
      if (visibleDevices.length === 1) {
        mapRef.current?.setView(bounds.getCenter(), 12, { animate: true });
      } else {
        mapRef.current?.fitBounds(bounds, { padding: [40, 40], maxZoom: 14, animate: true });
      }
    }
  }, [visibleDevices]);

  const counts = useMemo(() => ({
    all: devices.filter((d) => d.lat && d.lng).length,
    online: devices.filter((d) => d.lat && d.lng && d.status === "online").length,
    offline: devices.filter((d) => d.lat && d.lng && d.status === "offline").length,
    pending: devices.filter((d) => d.lat && d.lng && d.status === "pending").length,
    approved: devices.filter((d) => d.lat && d.lng && d.status === "approved").length,
  }), [devices]);

  return (
    <DashboardLayout>
      <div className="mb-4">
        <h2 className="text-lg font-bold tracking-tighter text-foreground">Mapa</h2>
        <p className="text-xs text-muted-foreground">Localização geográfica dos dispositivos</p>
      </div>

      {/* Filters */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {/* Status filter */}
        <div className="flex rounded-md border border-border bg-card">
          {(["all", "online", "offline", "pending", "approved"] as FilterStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1.5 text-[11px] font-medium transition-colors ${statusFilter === s ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              {s === "all" ? "Todos" : s.charAt(0).toUpperCase() + s.slice(1)}
              <span className="ml-1 opacity-60">({counts[s]})</span>
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="ml-auto flex items-center gap-3">
          {LEGEND.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="relative flex h-3 w-3 items-center justify-center">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              </div>
              <span className="text-[10px] text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card-shadow overflow-hidden rounded-lg">
        <div ref={containerRef} style={{ height: "calc(100vh - 240px)", width: "100%" }} />
      </div>

      {/* Counter */}
      <p className="mt-2 text-right text-[11px] text-muted-foreground">
        {visibleDevices.length} dispositivo{visibleDevices.length !== 1 ? "s" : ""} visível{visibleDevices.length !== 1 ? "s" : ""} no mapa
      </p>
    </DashboardLayout>
  );
};

export default DeviceMap;
