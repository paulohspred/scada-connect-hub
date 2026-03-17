import { motion } from "framer-motion";
import { mockDevices, formatBytes } from "@/lib/mockData";

export function DeviceTable() {
  const devices = mockDevices.filter(d => d.status !== 'pending');

  const statusDot: Record<string, string> = {
    online: "bg-success animate-pulse-online",
    offline: "bg-destructive",
    approved: "bg-primary",
  };

  return (
    <motion.div
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.15, ease: [0.2, 0, 0, 1] }}
      className="card-shadow rounded-lg bg-card"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Dispositivos</h3>
          <p className="text-xs text-muted-foreground">Lista em tempo real com portas SCADA ativas</p>
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">{devices.length} de {mockDevices.length}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-5 py-3 font-medium text-muted-foreground">Status</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Nome</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Identificador</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">IP Modem / SCADA</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Tipo</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">RX</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">TX</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Tendência</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((device) => (
              <tr key={device.id} className="border-b border-border/50 transition-colors duration-150 hover:bg-secondary/50">
                <td className="px-5 py-3">
                  <div className={`h-2 w-2 rounded-full ${statusDot[device.status] || 'bg-muted'}`} />
                </td>
                <td className="px-5 py-3 font-medium text-foreground">{device.name}</td>
                <td className="px-5 py-3 font-mono tabular-nums text-muted-foreground">{device.identifier.slice(-8)}</td>
                <td className="px-5 py-3">
                  <span className="font-mono tabular-nums text-muted-foreground">{device.lastIp}</span>
                  {device.scadaPort && (
                    <span className="ml-1.5 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-primary">
                      :{device.scadaPort}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-muted-foreground">{device.type}</td>
                <td className="px-5 py-3 tabular-nums text-muted-foreground">{formatBytes(device.bytesRx)}</td>
                <td className="px-5 py-3 tabular-nums text-muted-foreground">{formatBytes(device.bytesTx)}</td>
                <td className="px-5 py-3">
                  {/* Mini sparkline placeholder */}
                  <div className="flex h-4 items-end gap-px">
                    {Array.from({ length: 8 }, (_, i) => (
                      <div
                        key={i}
                        className="w-1 rounded-sm bg-primary/40"
                        style={{ height: `${Math.random() * 100}%` }}
                      />
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
