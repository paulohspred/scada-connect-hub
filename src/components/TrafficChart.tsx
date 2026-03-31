import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";

// Generating realistic looking wave data for the chart as seen in the mockup
const generateMockData = () => {
  const data = [];
  const times = [
    "07:30", "08:30", "09:30", "10:30", "11:30", "12:30", "13:30",
    "14:30", "15:30", "16:30", "17:30", "18:30", "19:30", "20:30", "21:30"
  ];
  
  // Base patterns to mimic the exact shapes
  const txBase = [420, 220, 310, 410, 540, 200, 310, 440, 410, 510, 330, 400, 680, 420, 430, 420, 620, 600, 410, 280, 300, 650, 430, 640, 650, 370];
  const rxBase = [480, 450, 280, 540, 240, 280, 540, 380, 540, 280, 510, 210, 200, 530, 280, 340, 220, 210, 340, 180, 320, 250, 330, 410, 190, 360, 290];

  for (let i = 0; i < times.length; i++) {
    data.push({
      time: times[i],
      tx: txBase[i % txBase.length],
      rx: rxBase[i % rxBase.length],
    });
  }
  return data;
};

const data = generateMockData();

export function TrafficChart() {
  return (
    <motion.div
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.05, ease: [0.2, 0, 0, 1] }}
      className="card-shadow flex h-full flex-col rounded-lg bg-card p-5"
    >
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Tráfego</h3>
          <p className="text-xs text-muted-foreground">Comparativo de dados TX/RX (KB/s)</p>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-medium">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-[#f97316]" />
            <span className="text-muted-foreground">TX</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-[#22c55e]" />
            <span className="text-muted-foreground">RX</span>
          </div>
        </div>
      </div>

      <div className="min-h-[200px] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTx" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorRx" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis 
              dataKey="time" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} 
              dx={-10}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
                color: "hsl(var(--foreground))",
              }}
              itemStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Area
              type="monotone"
              dataKey="tx"
              stroke="#f97316"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorTx)"
              activeDot={{ r: 4, fill: "#f97316", strokeWidth: 0 }}
            />
            <Area
              type="monotone"
              dataKey="rx"
              stroke="#22c55e"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRx)"
              activeDot={{ r: 4, fill: "#22c55e", strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
