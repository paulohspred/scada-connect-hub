import { DashboardLayout } from "@/components/DashboardLayout";
import { useDevices } from "@/hooks/useData";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const statusColors: Record<string, string> = {
  online: "#22c55e",
  offline: "#ef4444",
  pending: "#f59e0b",
  approved: "#ff6a00",
};

const DeviceMap = () => {
  const { data: devices = [] } = useDevices();
  const devicesWithCoords = devices.filter((d) => d.lat && d.lng && (d.lat !== 0 || d.lng !== 0));

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-lg font-bold tracking-tighter text-foreground">Mapa</h2>
        <p className="text-xs text-muted-foreground">Localização geográfica dos dispositivos conectados</p>
      </div>

      <div className="mb-4 flex items-center gap-4">
        {[
          { label: "Online", color: "#22c55e" },
          { label: "Offline", color: "#ef4444" },
          { label: "Pendente", color: "#f59e0b" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-[11px] text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="card-shadow overflow-hidden rounded-lg">
        <div style={{ height: "calc(100vh - 220px)" }}>
          <MapContainer center={[-23.55, -46.633]} zoom={13} style={{ height: "100%", width: "100%" }} attributionControl={false}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            {devicesWithCoords.map((device) => (
              <CircleMarker
                key={device.id}
                center={[device.lat!, device.lng!]}
                radius={8}
                pathOptions={{
                  fillColor: statusColors[device.status] || "#71717a",
                  fillOpacity: 0.9,
                  color: statusColors[device.status] || "#71717a",
                  weight: 2,
                  opacity: 0.5,
                }}
              >
                <Popup>
                  <div className="text-xs">
                    <p className="font-semibold">{device.name || "Sem nome"}</p>
                    <p className="text-muted-foreground">{device.last_ip} • Porta {device.scada_port || "—"}</p>
                    <p className="text-muted-foreground">{device.signal_dbm} dBm • {device.status.toUpperCase()}</p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DeviceMap;
