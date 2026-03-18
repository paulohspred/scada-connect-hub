import { motion } from "framer-motion";
import { Signal, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatBytes, type Device } from "@/hooks/useData";

interface DeviceCardProps {
  device: Device;
  index: number;
}

const statusConfig = {
  online: { label: "ONLINE", dotClass: "bg-success animate-pulse-online" },
  offline: { label: "OFFLINE", dotClass: "bg-destructive" },
  pending: { label: "PENDENTE", dotClass: "bg-warning animate-pulse-online" },
  approved: { label: "APROVADO", dotClass: "bg-primary" },
};

export function DeviceCard({ device, index }: DeviceCardProps) {
  const status = statusConfig[device.status];
  const displayName = device.name || `Dispositivo ${device.identifier.slice(-6)}`;

  return (
    <motion.div
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: [0.2, 0, 0, 1] }}
      className="card-shadow group rounded-lg bg-card p-4 transition-all duration-150 hover:card-shadow-hover"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{displayName}</h3>
        <div className="flex items-center gap-1.5">
          <div className={`h-2 w-2 rounded-full ${status.dotClass}`} />
          <span className="text-[10px] font-medium text-muted-foreground">{status.label}</span>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {device.scada_port && (
          <div className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5">
            <span className="text-xs font-medium tabular-nums text-primary">Porta {device.scada_port}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">IP</span>
            <p className="font-mono tabular-nums text-foreground">{device.last_ip || "—"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Tipo</span>
            <p className="text-foreground">{device.type}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 border-t border-border pt-2">
          <div className="flex items-center gap-1">
            <ArrowUpRight className="h-3 w-3 text-primary" />
            <span className="text-[11px] tabular-nums text-muted-foreground">TX {formatBytes(device.bytes_tx || 0)}</span>
          </div>
          <div className="flex items-center gap-1">
            <ArrowDownRight className="h-3 w-3 text-success" />
            <span className="text-[11px] tabular-nums text-muted-foreground">RX {formatBytes(device.bytes_rx || 0)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Signal className="h-3 w-3 text-muted-foreground" />
          <span className="text-[11px] tabular-nums text-muted-foreground">{device.signal_dbm} dBm</span>
          {device.brand && (
            <span className="ml-auto text-[10px] text-muted-foreground">{device.brand} {device.model}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
