import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { mockTrafficData } from "@/lib/mockData";

export function TrafficChart() {
  return (
    <motion.div
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1, ease: [0.2, 0, 0, 1] }}
      className="card-shadow rounded-lg bg-card p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Tráfego</h3>
          <p className="text-xs text-muted-foreground">Comparativo de dados TX/RX (KB/s)</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-[11px] text-muted-foreground">TX</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-success" />
            <span className="text-[11px] text-muted-foreground">RX</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={mockTrafficData}>
          <defs>
            <linearGradient id="txGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(24, 100%, 50%)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(24, 100%, 50%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="rxGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 16%)" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: 'hsl(240, 5%, 48%)' }}
            axisLine={{ stroke: 'hsl(240, 4%, 16%)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'hsl(240, 5%, 48%)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(240, 6%, 10%)',
              border: '1px solid hsl(240, 4%, 16%)',
              borderRadius: '8px',
              fontSize: '12px',
              color: 'hsl(0, 0%, 96%)',
            }}
          />
          <Area
            type="monotone"
            dataKey="tx"
            stroke="hsl(24, 100%, 50%)"
            strokeWidth={2}
            fill="url(#txGradient)"
          />
          <Area
            type="monotone"
            dataKey="rx"
            stroke="hsl(142, 71%, 45%)"
            strokeWidth={2}
            fill="url(#rxGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
