import { useState } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useEvents } from "@/hooks/useData";
import { Activity, Radio, AlertTriangle, Info, Plug, Search, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 50;

const iconMap: Record<string, { icon: React.ElementType; cls: string }> = {
  device_approved: { icon: Activity, cls: "bg-primary/10 text-primary" },
  device_rejected: { icon: AlertTriangle, cls: "bg-destructive/10 text-destructive" },
  device_connected: { icon: Plug, cls: "bg-success/10 text-success" },
  connection: { icon: Plug, cls: "bg-success/10 text-success" },
  disconnection: { icon: Radio, cls: "bg-destructive/10 text-destructive" },
  device_disconnected: { icon: Radio, cls: "bg-destructive/10 text-destructive" },
  alert: { icon: AlertTriangle, cls: "bg-warning/10 text-warning" },
  system: { icon: Info, cls: "bg-muted text-muted-foreground" },
};

const Events = () => {
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const { data: events = [], isLoading } = useEvents(page, PAGE_SIZE);

  const filtered = events.filter((e) => {
    const matchType = filter === "all" || e.type === filter;
    const matchSearch = e.message.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const tabs = [
    { key: "all", label: "Todos" },
    { key: "device_approved", label: "Aprovação" },
    { key: "device_rejected", label: "Rejeição" },
    { key: "device_connected", label: "Conexão" },
    { key: "alert", label: "Alerta" },
  ];

  const hasNextPage = events.length === PAGE_SIZE;
  const hasPrevPage = page > 0;

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-lg font-bold tracking-tighter text-foreground">Eventos</h2>
        <p className="text-xs text-muted-foreground">Log de atividades do gateway em tempo real</p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Buscar eventos..." value={search} onChange={(e) => {
            setSearch(e.target.value);
            setPage(0); // reset to first page on search
          }}
            className="h-9 w-64 rounded-md border border-border bg-card pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div className="flex flex-wrap gap-1 rounded-md border border-border bg-card">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => { setFilter(tab.key); setPage(0); }}
              className={`px-3 py-1.5 text-[11px] font-medium transition-colors ${filter === tab.key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card-shadow rounded-lg bg-card">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-xs text-muted-foreground">Nenhum evento registrado</p>
          </div>
        ) : (
          <div className="space-y-0">
            {filtered.map((event, i) => {
              const cfg = iconMap[event.type] || iconMap.system;
              const Icon = cfg.icon;
              const time = new Date(event.created_at);
              return (
                <motion.div key={event.id} initial={{ y: 4, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.2, delay: i * 0.02 }}
                  className="flex items-start gap-3 border-b border-border/50 px-5 py-3 last:border-b-0 hover:bg-secondary/30">
                  <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${cfg.cls}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-foreground">{event.message}</p>
                    <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
                      {time.toLocaleDateString("pt-BR")} às {time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </p>
                  </div>
                  <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">{event.type}</span>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination controls */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">
          Página {page + 1} · {filtered.length} evento{filtered.length !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled={!hasPrevPage}
            onClick={() => setPage((p) => p - 1)}
            className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Anterior
          </button>
          <button
            disabled={!hasNextPage}
            onClick={() => setPage((p) => p + 1)}
            className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
          >
            Próxima
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Events;
