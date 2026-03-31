import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DeviceCard } from "@/components/DeviceCard";
import { useDevices } from "@/hooks/useData";
import { Search, Router, LayoutGrid, List } from "lucide-react";

type StatusFilter = "all" | "online" | "offline" | "pending" | "approved";

const Devices = () => {
  const { data: devices = [] } = useDevices();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filtered = useMemo(() => devices.filter((d) => {
    const matchSearch =
      (d.name || "").toLowerCase().includes(search.toLowerCase()) ||
      d.identifier.includes(search) ||
      (d.last_ip || "").includes(search);
    if (!matchSearch) return false;
    if (statusFilter === "all") return true;
    return d.status === statusFilter;
  }), [devices, search, statusFilter]);

  const counts = useMemo(() => ({
    all: devices.length,
    online: devices.filter((d) => d.status === "online").length,
    offline: devices.filter((d) => d.status === "offline").length,
    pending: devices.filter((d) => d.status === "pending").length,
    approved: devices.filter((d) => d.status === "approved").length,
  }), [devices]);

  const tabs: { key: StatusFilter; label: string; color?: string }[] = [
    { key: "all", label: "Todos" },
    { key: "online", label: "Online", color: "text-success" },
    { key: "offline", label: "Offline", color: "text-destructive" },
    { key: "pending", label: "Pendentes", color: "text-warning" },
    { key: "approved", label: "Aprovados", color: "text-primary" },
  ];

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-lg font-bold tracking-tighter text-foreground">Dispositivos</h2>
        <p className="text-xs text-muted-foreground">Gerencie todos os modems e coletores conectados ao gateway</p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome, IMEI ou IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-72 rounded-md border border-border bg-card pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-wrap rounded-md border border-border bg-card">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                  statusFilter === tab.key ? "bg-primary/10 text-primary" : `text-muted-foreground hover:text-foreground ${tab.color ?? ""}`
                }`}
              >
                {tab.label}
                <span className="ml-1 tabular-nums opacity-70">({counts[tab.key]})</span>
              </button>
            ))}
          </div>
          <div className="flex rounded-md border border-border bg-card">
            <button onClick={() => setViewMode("grid")} className={`p-1.5 ${viewMode === "grid" ? "text-primary" : "text-muted-foreground"}`} title="Grade">
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button onClick={() => setViewMode("list")} className={`p-1.5 ${viewMode === "list" ? "text-primary" : "text-muted-foreground"}`} title="Lista">
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card-shadow flex h-48 items-center justify-center rounded-lg bg-card">
          <div className="text-center">
            <Router className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Nenhum dispositivo encontrado</p>
          </div>
        </div>
      ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "space-y-2"}>
          {filtered.map((device, i) => (
            <DeviceCard key={device.id} device={device} index={i} listMode={viewMode === "list"} />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default Devices;
