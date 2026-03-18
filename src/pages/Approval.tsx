import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardLayout } from "@/components/DashboardLayout";
import { usePendingDevices, useApproveDevice, useRejectDevice } from "@/hooks/useData";
import type { Device } from "@/hooks/useData";
import { ClipboardCheck, Check, X, Radio } from "lucide-react";
import { toast } from "sonner";

const Approval = () => {
  const { data: pendingDevices = [], isLoading } = usePendingDevices();
  const approveMutation = useApproveDevice();
  const rejectMutation = useRejectDevice();
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [formData, setFormData] = useState({
    name: "", lat: "", lng: "", type: "RTU" as "RTU" | "CLP" | "Modem", brand: "", model: "", observation: "",
  });

  const handleSelect = (device: Device) => {
    setSelectedDevice(device);
    setFormData({ name: "", lat: "", lng: "", type: "RTU", brand: "", model: "", observation: "" });
  };

  const handleApprove = async () => {
    if (!selectedDevice || !formData.name) {
      toast.error("Preencha o nome do dispositivo");
      return;
    }
    try {
      await approveMutation.mutateAsync({
        deviceId: selectedDevice.id,
        name: formData.name,
        lat: parseFloat(formData.lat) || 0,
        lng: parseFloat(formData.lng) || 0,
        type: formData.type,
        brand: formData.brand,
        model: formData.model,
        observation: formData.observation,
      });
      toast.success(`${formData.name} aprovado com sucesso`);
      setSelectedDevice(null);
    } catch (err: any) {
      toast.error(err.message || "Erro ao aprovar dispositivo");
    }
  };

  const handleReject = async () => {
    if (!selectedDevice) return;
    try {
      await rejectMutation.mutateAsync(selectedDevice.id);
      toast.error(`Dispositivo ${selectedDevice.identifier.slice(-6)} rejeitado`);
      setSelectedDevice(null);
    } catch (err: any) {
      toast.error(err.message || "Erro ao rejeitar dispositivo");
    }
  };

  const inputCls = "h-9 w-full rounded-md border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-lg font-bold tracking-tighter text-foreground">Aprovação</h2>
        <p className="text-xs text-muted-foreground">Dispositivos aguardando identificação e binding de porta SCADA</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-warning" />
            <h3 className="text-sm font-semibold text-foreground">
              Fila de Aprovação
              <span className="ml-2 text-xs tabular-nums text-muted-foreground">({pendingDevices.length})</span>
            </h3>
          </div>

          {pendingDevices.length === 0 ? (
            <div className="card-shadow flex h-40 items-center justify-center rounded-lg bg-card">
              <div className="text-center">
                <Check className="mx-auto h-6 w-6 text-success" />
                <p className="mt-2 text-xs text-muted-foreground">Nenhum dispositivo pendente</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {pendingDevices.map((device) => (
                  <motion.button
                    key={device.id} layout
                    initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
                    onClick={() => handleSelect(device)}
                    className={`card-shadow w-full rounded-lg bg-card p-4 text-left transition-all duration-150 ${
                      selectedDevice?.id === device.id ? "card-shadow-hover" : "hover:card-shadow-hover"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Radio className="h-4 w-4 text-warning" />
                        <span className="text-xs font-semibold text-foreground">Dispositivo Desconhecido</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-warning animate-pulse-online" />
                        <span className="text-[10px] text-muted-foreground">PENDENTE</span>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-muted-foreground">IMEI:</span>
                        <span className="ml-1 font-mono tabular-nums text-foreground">{device.identifier}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">IP:</span>
                        <span className="ml-1 font-mono tabular-nums text-foreground">{device.last_ip}</span>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div>
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-foreground">Formulário de Aprovação</h3>
          </div>

          {!selectedDevice ? (
            <div className="card-shadow flex h-40 items-center justify-center rounded-lg bg-card">
              <p className="text-xs text-muted-foreground">Selecione um dispositivo da fila</p>
            </div>
          ) : (
            <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="card-shadow rounded-lg bg-card p-5">
              <div className="mb-4 rounded-md bg-secondary p-3">
                <p className="text-[11px] text-muted-foreground">
                  IMEI: <span className="font-mono tabular-nums text-foreground">{selectedDevice.identifier}</span>
                  <span className="mx-2">|</span>
                  IP: <span className="font-mono tabular-nums text-foreground">{selectedDevice.last_ip}</span>
                  <span className="mx-2">|</span>
                  Sinal: <span className="tabular-nums text-foreground">{selectedDevice.signal_dbm} dBm</span>
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Nome *</label>
                  <input type="text" placeholder="Ex: Gerador A" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Latitude</label>
                    <input type="text" placeholder="-23.5505" value={formData.lat} onChange={(e) => setFormData({ ...formData, lat: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Longitude</label>
                    <input type="text" placeholder="-46.6333" value={formData.lng} onChange={(e) => setFormData({ ...formData, lng: e.target.value })} className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Tipo</label>
                  <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as any })} className={inputCls}>
                    <option value="RTU">RTU</option>
                    <option value="CLP">CLP</option>
                    <option value="Modem">Modem</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Marca</label>
                    <input type="text" placeholder="Ex: Schneider" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Modelo</label>
                    <input type="text" placeholder="Ex: RTU-X500" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Observação</label>
                  <textarea placeholder="Notas adicionais..." value={formData.observation} onChange={(e) => setFormData({ ...formData, observation: e.target.value })} rows={2}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={handleApprove} disabled={approveMutation.isPending}
                    className="flex h-9 flex-1 items-center justify-center gap-2 rounded-md bg-primary text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
                    <Check className="h-3.5 w-3.5" />
                    Aprovar e Vincular Porta
                  </button>
                  <button onClick={handleReject} disabled={rejectMutation.isPending}
                    className="flex h-9 items-center justify-center gap-2 rounded-md border border-border px-4 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50">
                    <X className="h-3.5 w-3.5" />
                    Rejeitar
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Approval;
