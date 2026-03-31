import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Settings as SettingsIcon, Save, Server, Shield, Bell, Database, Lock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useGatewaySettings } from "@/hooks/useData";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const DEFAULT_CONFIG = {
  gatewayName: "RC Gateway",
  modemPortMin: "7000",
  modemPortMax: "8000",
  scadaPortStart: "9001",
  scadaPortEnd: "10000",
  autoApprove: false,
  maxConnections: "1000",
  tcpTimeout: "300",
  heartbeatInterval: "10",
  logRetentionDays: "30",
  notifyDisconnect: true,
  notifyNewDevice: true,
  notifySignalLow: true,
  signalThreshold: "-80",
};

type Config = typeof DEFAULT_CONFIG;

// Map DB keys to config fields
const DB_KEY_MAP: Record<string, (v: any) => Partial<Config>> = {
  port_range_input: (v) => ({ modemPortMin: String(v.min), modemPortMax: String(v.max) }),
  port_range_scada: (v) => ({ scadaPortStart: String(v.min), scadaPortEnd: String(v.max) }),
  tcp_timeout: (v) => ({ tcpTimeout: String(v.seconds) }),
  auto_identify: (v) => ({ autoApprove: v.enabled }),
  gateway_name: (v) => ({ gatewayName: String(v.value ?? "RC Gateway") }),
  max_connections: (v) => ({ maxConnections: String(v.value ?? "1000") }),
  heartbeat_interval: (v) => ({ heartbeatInterval: String(v.seconds ?? "10") }),
  log_retention_days: (v) => ({ logRetentionDays: String(v.days ?? "30") }),
  notify_disconnect: (v) => ({ notifyDisconnect: v.enabled }),
  notify_new_device: (v) => ({ notifyNewDevice: v.enabled }),
  notify_signal_low: (v) => ({ notifySignalLow: v.enabled }),
  signal_threshold_dbm: (v) => ({ signalThreshold: String(v.value ?? "-80") }),
};

const SettingsPage = () => {
  const { hasRole } = useAuth();
  const canManage = hasRole("admin");
  const qc = useQueryClient();
  const { data: settingsRows = [] } = useGatewaySettings();
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);

  // Hydrate local state from DB rows
  useEffect(() => {
    if (!settingsRows.length) return;
    let merged: Partial<Config> = {};
    for (const row of settingsRows as any[]) {
      const mapper = DB_KEY_MAP[row.key];
      if (mapper) merged = { ...merged, ...mapper(row.value) };
    }
    setConfig((prev) => ({ ...prev, ...merged }));
  }, [settingsRows]);

  const handleSave = async () => {
    if (!canManage) {
      toast.error("Apenas administradores podem alterar configurações");
      return;
    }
    setSaving(true);
    try {
      // Build upsert payload for each gateway_settings key
      const upserts = [
        { key: "port_range_input", value: { min: Number(config.modemPortMin), max: Number(config.modemPortMax) } },
        { key: "port_range_scada", value: { min: Number(config.scadaPortStart), max: Number(config.scadaPortEnd) } },
        { key: "tcp_timeout", value: { seconds: Number(config.tcpTimeout) } },
        { key: "auto_identify", value: { enabled: config.autoApprove } },
        { key: "gateway_name", value: { value: config.gatewayName } },
        { key: "max_connections", value: { value: Number(config.maxConnections) } },
        { key: "heartbeat_interval", value: { seconds: Number(config.heartbeatInterval) } },
        { key: "log_retention_days", value: { days: Number(config.logRetentionDays) } },
        { key: "notify_disconnect", value: { enabled: config.notifyDisconnect } },
        { key: "notify_new_device", value: { enabled: config.notifyNewDevice } },
        { key: "notify_signal_low", value: { enabled: config.notifySignalLow } },
        { key: "signal_threshold_dbm", value: { value: Number(config.signalThreshold) } },
      ];

      for (const upsert of upserts) {
        const { error } = await supabase
          .from("gateway_settings")
          .upsert(upsert, { onConflict: "key" });
        if (error) throw error;
      }

      await qc.invalidateQueries({ queryKey: ["gateway_settings"] });
      toast.success("Configurações salvas com sucesso");
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    {
      title: "Gateway",
      icon: Server,
      fields: [
        { key: "gatewayName", label: "Nome do Gateway", type: "text" },
        { key: "modemPortMin", label: "Porta Modem Mínima", type: "text" },
        { key: "modemPortMax", label: "Porta Modem Máxima", type: "text" },
        { key: "scadaPortStart", label: "Porta SCADA Inicial", type: "text" },
        { key: "scadaPortEnd", label: "Porta SCADA Final", type: "text" },
        { key: "maxConnections", label: "Máximo de Conexões", type: "text" },
      ],
    },
    {
      title: "TCP",
      icon: Database,
      fields: [
        { key: "tcpTimeout", label: "Timeout TCP (s)", type: "text" },
        { key: "heartbeatInterval", label: "Heartbeat (s)", type: "text" },
        { key: "logRetentionDays", label: "Retenção de Logs (dias)", type: "text" },
      ],
    },
    {
      title: "Segurança",
      icon: Shield,
      fields: [
        { key: "autoApprove", label: "Auto-aprovar dispositivos conhecidos", type: "toggle" },
      ],
    },
    {
      title: "Notificações",
      icon: Bell,
      fields: [
        { key: "notifyDisconnect", label: "Alertar desconexão de modem", type: "toggle" },
        { key: "notifyNewDevice", label: "Alertar novo dispositivo", type: "toggle" },
        { key: "notifySignalLow", label: "Alertar sinal fraco", type: "toggle" },
        { key: "signalThreshold", label: "Limiar de sinal (dBm)", type: "text" },
      ],
    },
  ];

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tighter text-foreground">Configurações</h2>
          <p className="text-xs text-muted-foreground">Parâmetros do gateway e preferências do sistema</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !canManage}
          className="flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          title={!canManage ? "Apenas administradores podem salvar" : ""}
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>

      {!canManage && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
          <Lock className="h-4 w-4 text-warning" />
          <p className="text-xs text-warning">Você está no modo leitura. Apenas administradores podem editar configurações.</p>
        </div>
      )}

      <div className="space-y-4">
        {sections.map((section, si) => {
          const Icon = section.icon;
          return (
            <motion.div
              key={section.title}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: si * 0.05 }}
              className="card-shadow rounded-lg bg-card p-5"
            >
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
              </div>

              <div className="space-y-3">
                {section.fields.map((field) => (
                  <div key={field.key} className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground">{field.label}</label>
                    {field.type === "toggle" ? (
                      <button
                        disabled={!canManage}
                        onClick={() =>
                          setConfig({ ...config, [field.key]: !config[field.key as keyof Config] })
                        }
                        className={`relative h-5 w-9 rounded-full transition-colors disabled:cursor-not-allowed ${
                          config[field.key as keyof Config] ? "bg-primary" : "bg-secondary"
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 h-4 w-4 rounded-full bg-foreground transition-transform ${
                            config[field.key as keyof Config] ? "translate-x-4" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    ) : (
                      <input
                        type="text"
                        disabled={!canManage}
                        value={config[field.key as keyof Config] as string}
                        onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                        className="h-8 w-48 rounded-md border border-border bg-background px-3 text-right text-xs tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
