import { DashboardLayout } from "@/components/DashboardLayout";
import { useDevices } from "@/hooks/useData";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const statusColors: Record<string, string> = {
  online: "#22c55e",
  offline: "#ef4444",
  pending: "#f59e0b",
  approved: "#ff6a00",
};

const DeviceMap = () => {
  const { data: devices = [] } = useDevices();
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const devicesWithCoords = devices.filter(
    (d) => d.lat && d.lng && (d.lat !== 0 || d.lng !== 0)
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current).setView([-23.55, -46.633], 13);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "",
    }).addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker) {
        mapRef.current?.removeLayer(layer);
      }
    });

    devicesWithCoords.forEach((device) => {
      const color = statusColors[device.status] || "#71717a";
      L.circleMarker([device.lat!, device.lng!], {
        radius: 8,
        fillColor: color,
        fillOpacity: 0.9,
        color: color,
        weight: 2,
        opacity: 0.5,
      })
        .bindPopup(
          `<div style="font-size:12px">
            <p style="font-weight:600">${device.name || "Sem nome"}</p>
            <p>${device.last_ip || "—"} • Porta ${device.scada_port || "—"}</p>
            <p>${device.signal_dbm ?? "—"} dBm • ${device.status.toUpperCase()}</p>
          </div>`
        )
        .addTo(mapRef.current!);
    });
  }, [devicesWithCoords]);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-lg font-bold tracking-tighter text-foreground">Mapa</h2>
        <p className="text-xs text-muted-foreground">
          Localização geográfica dos dispositivos conectados
        </p>
      </div>

      <div className="mb-4 flex items-center gap-4">
        {[
          { label: "Online", color: "#22c55e" },
          { label: "Offline", color: "#ef4444" },
          { label: "Pendente", color: "#f59e0b" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[11px] text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="card-shadow overflow-hidden rounded-lg">
        <div ref={containerRef} style={{ height: "calc(100vh - 220px)", width: "100%" }} />
      </div>
    </DashboardLayout>
  );
};

export default DeviceMap;
