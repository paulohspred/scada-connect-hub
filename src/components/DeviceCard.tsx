import { motion } from "framer-motion";
import { Signal, ArrowUpRight, ArrowDownRight, Pencil, Trash2, Save, X } from "lucide-react";
import { formatBytes, type Device, useUpdateDevice, useDeleteDevice } from "@/hooks/useData";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { toast } from "sonner";

interface DeviceCardProps {
  device: Device;
  index: number;
  listMode?: boolean;
}

const statusConfig = {
  online: { label: "ONLINE", dotClass: "bg-success animate-pulse-online", textClass: "text-success" },
  offline: { label: "OFFLINE", dotClass: "bg-destructive", textClass: "text-destructive" },
  pending: { label: "PENDENTE", dotClass: "bg-warning animate-pulse-online", textClass: "text-warning" },
  approved: { label: "APROVADO", dotClass: "bg-primary", textClass: "text-primary" },
};

const inputCls = "h-8 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";

export function DeviceCard({ device, index, listMode = false }: DeviceCardProps) {
  const status = statusConfig[device.status] ?? statusConfig.pending;
  const displayName = device.name || `Dispositivo ${device.identifier.slice(-6)}`;
  const { hasRole } = useAuth();
  const canEdit = hasRole("operator") || hasRole("admin");
  const canDelete = hasRole("admin");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState<string>(device.name || "");
  const [type, setType] = useState<"RTU" | "CLP" | "Modem">(device.type as "RTU" | "CLP" | "Modem");
  const [brand, setBrand] = useState<string>(device.brand || "");
  const [model, setModel] = useState<string>(device.model || "");
  const [observation, setObservation] = useState<string>(device.observation || "");
  const updateDevice = useUpdateDevice();
  const deleteDevice = useDeleteDevice();

  const handleSave = async () => {
    try {
      await updateDevice.mutateAsync({ id: device.id, name: name || null, type, brand: brand || null, model: model || null, observation: observation || null });
      toast.success("Dispositivo atualizado");
      setEditing(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Falha ao atualizar");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Confirmar exclusão de "${displayName}"?\nEsta ação é irreversível.`)) return;
    try {
      await deleteDevice.mutateAsync(device.id);
      toast.success("Dispositivo removido");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Falha ao remover");
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setName(device.name || "");
    setType(device.type as "RTU" | "CLP" | "Modem");
    setBrand(device.brand || "");
    setModel(device.model || "");
    setObservation(device.observation || "");
  };

  const actionButtons = canEdit && !editing ? (
    <>
      <button onClick={() => setEditing(true)} className="rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Editar"><Pencil className="h-4 w-4" /></button>
      {canDelete && <button onClick={handleDelete} className="rounded p-1 text-muted-foreground hover:text-destructive" aria-label="Remover"><Trash2 className="h-4 w-4" /></button>}
    </>
  ) : canEdit && editing ? (
    <>
      <button onClick={handleSave} disabled={updateDevice.isPending} className="rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Salvar"><Save className="h-4 w-4" /></button>
      <button onClick={handleCancel} className="rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Cancelar"><X className="h-4 w-4" /></button>
    </>
  ) : null;

  // ── LIST MODE ──────────────────────────────────────────────────────────────
  if (listMode) {
    return (
      <motion.div
        initial={{ x: -8, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.25, delay: index * 0.03, ease: [0.2, 0, 0, 1] }}
        className="card-shadow flex items-center gap-4 rounded-lg bg-card px-4 py-3 transition-all hover:card-shadow-hover"
      >
        <div className={`h-2 w-2 shrink-0 rounded-full ${status.dotClass}`} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
          <p className="text-[10px] font-mono text-muted-foreground">{device.identifier}</p>
        </div>
        {device.scada_port && <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium tabular-nums text-primary">:{device.scada_port}</span>}
        <span className="shrink-0 w-14 text-center rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{device.type}</span>
        <span className="shrink-0 w-28 text-right text-[11px] font-mono tabular-nums text-muted-foreground">{device.last_ip || "—"}</span>
        <div className="flex shrink-0 items-center gap-1">
          <Signal className="h-3 w-3 text-muted-foreground" />
          <span className="text-[11px] tabular-nums text-muted-foreground">{device.signal_dbm ?? "—"} dBm</span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex items-center gap-1"><ArrowUpRight className="h-3 w-3 text-primary" /><span className="text-[11px] tabular-nums text-muted-foreground">{formatBytes(device.bytes_tx || 0)}</span></div>
          <div className="flex items-center gap-1"><ArrowDownRight className="h-3 w-3 text-success" /><span className="text-[11px] tabular-nums text-muted-foreground">{formatBytes(device.bytes_rx || 0)}</span></div>
        </div>
        <span className={`shrink-0 text-[10px] font-semibold flex w-16 justify-end ${status.textClass}`}>{status.label}</span>
        <div className="flex shrink-0 items-center gap-1 min-w-[50px] justify-end">{actionButtons}</div>
      </motion.div>
    );
  }

  // ── GRID MODE ──────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: [0.2, 0, 0, 1] }}
      className="card-shadow group rounded-lg bg-card p-4 transition-all hover:card-shadow-hover"
    >
      <div className="flex items-center justify-between">
        <h3 className="truncate text-sm font-semibold text-foreground">{displayName}</h3>
        <div className="flex items-center gap-1.5 ml-2 shrink-0">
          <div className={`h-2 w-2 rounded-full ${status.dotClass}`} />
          <span className="text-[10px] font-medium text-muted-foreground">{status.label}</span>
          <div className="flex items-center gap-0.5 ml-1">{actionButtons}</div>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {device.scada_port && (
          <div className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5">
            <span className="text-xs font-medium tabular-nums text-primary">Porta {device.scada_port}</span>
          </div>
        )}

        {!editing ? (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-muted-foreground">IP</span><p className="font-mono tabular-nums text-foreground">{device.last_ip || "—"}</p></div>
            <div><span className="text-muted-foreground">Tipo</span><p className="text-foreground">{device.type}</p></div>
          </div>
        ) : (
          <div className="space-y-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" className={inputCls} />
            <div className="grid grid-cols-2 gap-2">
              <select value={type} onChange={(e) => setType(e.target.value as "RTU" | "CLP" | "Modem")} className={inputCls}>
                <option value="Modem">Modem</option><option value="RTU">RTU</option><option value="CLP">CLP</option>
              </select>
              <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Marca" className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Modelo" className={inputCls} />
              <input value={observation} onChange={(e) => setObservation(e.target.value)} placeholder="Observações" className={inputCls} />
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 border-t border-border pt-2">
          <div className="flex items-center gap-1"><ArrowUpRight className="h-3 w-3 text-primary" /><span className="text-[11px] tabular-nums text-muted-foreground">TX {formatBytes(device.bytes_tx || 0)}</span></div>
          <div className="flex items-center gap-1"><ArrowDownRight className="h-3 w-3 text-success" /><span className="text-[11px] tabular-nums text-muted-foreground">RX {formatBytes(device.bytes_rx || 0)}</span></div>
        </div>

        <div className="flex items-center gap-1.5">
          <Signal className="h-3 w-3 text-muted-foreground" />
          <span className="text-[11px] tabular-nums text-muted-foreground">{device.signal_dbm ?? "—"} dBm</span>
          {!editing && device.brand && <span className="ml-auto text-[10px] text-muted-foreground">{device.brand} {device.model}</span>}
        </div>
      </div>
    </motion.div>
  );
}
