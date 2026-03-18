import { DashboardLayout } from "@/components/DashboardLayout";
import { KpiCard } from "@/components/KpiCard";
import { TrafficChart } from "@/components/TrafficChart";
import { DeviceTable } from "@/components/DeviceTable";
import { DeviceStatusChart } from "@/components/DeviceStatusChart";
import { useDevices, formatBytes } from "@/hooks/useData";
import { Radio, ClipboardCheck, Activity, Plug } from "lucide-react";

const Dashboard = () => {
  const { data: devices = [], isLoading } = useDevices();

  const online = devices.filter(d => d.status === 'online').length;
  const pending = devices.filter(d => d.status === 'pending').length;
  const totalTx = devices.reduce((s, d) => s + (d.bytes_tx || 0), 0);
  const scadaActive = devices.filter(d => d.scada_port && d.status === 'online').length;

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tighter text-foreground">Dashboard</h2>
          <p className="text-xs text-muted-foreground">Visão geral do tráfego em RC Gateway</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-success animate-pulse-online" />
          <span className="text-xs font-medium text-success">Operacional</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Online" value={online} subtitle={`Conexões ativas em ${devices.length} dispositivos`} icon={Radio} variant="success" />
        <KpiCard title="Pendentes" value={pending} subtitle="Aguardando aprovação" icon={ClipboardCheck} variant="warning" />
        <KpiCard title="Tráfego Total" value={formatBytes(totalTx)} subtitle="Soma de TX acumulado" icon={Activity} />
        <KpiCard title="SCADA Ativas" value={scadaActive} subtitle="Bridges operacionais" icon={Plug} variant="success" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TrafficChart />
        </div>
        <DeviceStatusChart devices={devices} />
      </div>

      <div className="mt-4">
        <DeviceTable devices={devices} />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
