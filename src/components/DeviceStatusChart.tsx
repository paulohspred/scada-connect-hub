import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { mockDevices } from "@/lib/mockData";

export function DeviceStatusChart() {
  const online = mockDevices.filter(d => d.status === 'online').length;
  const offline = mockDevices.filter(d => d.status === 'offline').length;
  const pending = mockDevices.filter(d => d.status === 'pending').length;

  const data = [
    { name: "Online", value: online, color: "hsl(142, 71%, 45%)" },
    { name: "Offline", value: offline, color: "hsl(0, 84%, 60%)" },
    { name: "Pendente", value: pending, color: "hsl(38, 92%, 50%)" },
  ];

  const total = mockDevices.length;

  return (
    <motion.div
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1, ease: [0.2, 0, 0, 1] }}
      className="card-shadow rounded-lg bg-card p-5"
    >
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-foreground">Dispositivos</h3>
        <p className="text-xs text-muted-foreground">Estado atual de modems e coletores</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative h-28 w-28">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={32}
                outerRadius={48}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold tabular-nums text-foreground">{total}</span>
            <span className="text-[9px] text-muted-foreground">Total</span>
          </div>
        </div>

        <div className="space-y-2">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-xs text-muted-foreground">{item.name}</span>
              <span className="ml-auto text-xs font-semibold tabular-nums text-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
