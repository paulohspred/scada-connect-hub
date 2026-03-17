import { useState } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Settings as SettingsIcon, Save, Server, Shield, Bell, Database } from "lucide-react";
import { toast } from "sonner";

const SettingsPage = () => {
  const [config, setConfig] = useState({
    gatewayName: "RC Gateway",
    modemPortRange: "7000-8000",
    scadaPortStart: "9001",
    autoApprove: false,
    maxConnections: "1000",
    tcpTimeout: "30",
    heartbeatInterval: "10",
    logRetentionDays: "30",
    notifyDisconnect: true,
    notifyNewDevice: true,
    notifySignalLow: true,
    signalThreshold: "-80",
  });

  const handleSave = () => {
    toast.success("Configurações salvas com sucesso");
  };

  const sections = [
    {
      title: "Gateway",
      icon: Server,
      fields: [
        { key: "gatewayName", label: "Nome do Gateway", type: "text" },
        { key: "modemPortRange", label: "Range de Portas Modem", type: "text" },
        { key: "scadaPortStart", label: "Porta SCADA Inicial", type: "text" },
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
          className="flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Save className="h-3.5 w-3.5" />
          Salvar
        </button>
      </div>

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
                        onClick={() => setConfig({ ...config, [field.key]: !config[field.key as keyof typeof config] })}
                        className={`relative h-5 w-9 rounded-full transition-colors ${
                          config[field.key as keyof typeof config] ? "bg-primary" : "bg-secondary"
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 h-4 w-4 rounded-full bg-foreground transition-transform ${
                            config[field.key as keyof typeof config] ? "translate-x-4" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    ) : (
                      <input
                        type="text"
                        value={config[field.key as keyof typeof config] as string}
                        onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                        className="h-8 w-48 rounded-md border border-border bg-background px-3 text-right text-xs tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
