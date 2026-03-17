import { useState } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Activity, Radio, AlertTriangle, Info, Plug, Search } from "lucide-react";

interface EventItem {
  id: string;
  type: "connection" | "disconnection" | "approval" | "alert" | "system";
  deviceName: string;
  message: string;
  timestamp: string;
}

const iconMap = {
  connection: { icon: Plug, cls: "bg-success/10 text-success" },
  disconnection: { icon: Radio, cls: "bg-destructive/10 text-destructive" },
  approval: { icon: Activity, cls: "bg-primary/10 text-primary" },
  alert: { icon: AlertTriangle, cls: "bg-warning/10 text-warning" },
  system: { icon: Info, cls: "bg-muted text-muted-foreground" },
};

const mockEvents: EventItem[] = [
  { id: "1", type: "connection", deviceName: "Gerador A", message: "Modem conectou na porta 7001. Bridge ativo → 9001.", timestamp: "2026-03-17T07:32:00" },
  { id: "2", type: "approval", deviceName: "Bomba Hidráulica 1", message: "Dispositivo aprovado. Porta SCADA 9003 atribuída.", timestamp: "2026-03-17T07:28:00" },
  { id: "3", type: "disconnection", deviceName: "Subestação Norte", message: "Conexão TCP perdida. Último IP: 10.0.0.15.", timestamp: "2026-03-17T06:15:00" },
  { id: "4", type: "alert", deviceName: "Compressor Central", message: "Sinal degradado: -85 dBm. Possível instabilidade.", timestamp: "2026-03-17T07:10:00" },
  { id: "5", type: "system", deviceName: "Sistema", message: "Gateway reiniciado. 6 bridges reconectados automaticamente.", timestamp: "2026-03-17T05:00:00" },
  { id: "6", type: "connection", deviceName: "Torre Resfriamento", message: "Reconexão automática bem-sucedida. Bridge → 9006.", timestamp: "2026-03-17T05:02:00" },
  { id: "7", type: "connection", deviceName: "Gerador B", message: "Modem conectou na porta 7003. Bridge ativo → 9002.", timestamp: "2026-03-17T05:01:00" },
  { id: "8", type: "alert", deviceName: "Dispositivo Desconhecido", message: "Nova conexão na porta 7005. IMEI não identificado.", timestamp: "2026-03-17T07:25:00" },
  { id: "9", type: "disconnection", deviceName: "Gerador A", message: "Timeout TCP. Tentando reconexão automática...", timestamp: "2026-03-17T04:45:00" },
  { id: "10", type: "connection", deviceName: "Gerador A", message: "Reconexão bem-sucedida. Bridge mantido na porta 9001.", timestamp: "2026-03-17T04:45:30" },
];

const Events = () => {
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = mockEvents.filter((e) => {
    const matchType = filter === "all" || e.type === filter;
    const matchSearch = e.deviceName.toLowerCase().includes(search.toLowerCase()) || e.message.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const tabs = [
    { key: "all", label: "Todos" },
    { key: "connection", label: "Conexão" },
    { key: "disconnection", label: "Desconexão" },
    { key: "approval", label: "Aprovação" },
    { key: "alert", label: "Alerta" },
    { key: "system", label: "Sistema" },
  ];

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-lg font-bold tracking-tighter text-foreground">Eventos</h2>
        <p className="text-xs text-muted-foreground">Log de atividades do gateway em tempo real</p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar eventos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-64 rounded-md border border-border bg-card pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex flex-wrap gap-1 rounded-md border border-border bg-card">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 text-[11px] font-medium transition-colors ${
                filter === tab.key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card-shadow rounded-lg bg-card">
        <div className="space-y-0">
          {filtered.map((event, i) => {
            const cfg = iconMap[event.type];
            const Icon = cfg.icon;
            const time = new Date(event.timestamp);
            return (
              <motion.div
                key={event.id}
                initial={{ y: 4, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
                className="flex items-start gap-3 border-b border-border/50 px-5 py-3 last:border-b-0 hover:bg-secondary/30"
              >
                <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${cfg.cls}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-foreground">
                    <span className="font-semibold">{event.deviceName}</span>
                    <span className="ml-1 text-muted-foreground">— {event.message}</span>
                  </p>
                  <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
                    {time.toLocaleDateString("pt-BR")} às {time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Events;
