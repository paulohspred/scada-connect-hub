import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Activity, Plus, Trash2, Zap, Play, Square } from "lucide-react";

export default function SimulatorPage() {
  const { user, roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const [isSimulating, setIsSimulating] = useState(false);
  const [loading, setLoading] = useState(false);

  // Poll simulator traffic every 3 seconds if active
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isSimulating) {
      interval = setInterval(async () => {
        // Find 10 random 'online' and 'mock' devices, and increment their tx/rx randomly
        try {
          // In a real strict environment, we might do a pure postgres function, 
          // but we can just invoke a dummy update or RPC here, or direct update if RLS allows.
          // Since it's a mock tool for admins, we use direct update via a bulk call if possible.
          // Actually, let's use a quick RPC or direct updates.
          const { data } = await supabase.from("devices")
            .select("id, bytes_rx, bytes_tx")
            .eq("observation", "SIMULATOR_MOCK")
            .eq("status", "online")
            .limit(20);

          if (data && data.length > 0) {
            for (const d of data) {
              await supabase.from("devices")
                .update({
                  bytes_rx: (d.bytes_rx || 0) + Math.floor(Math.random() * 500000), // Random KB
                  bytes_tx: (d.bytes_tx || 0) + Math.floor(Math.random() * 250000), // Random KB
                  signal_dbm: -50 - Math.floor(Math.random() * 40) // -50 to -90
                })
                .eq("id", d.id);
            }
          }
        } catch (e) {
          console.error("Traffic simulator error", e);
        }
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSimulating]);

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex h-[50vh] flex-col items-center justify-center p-8 text-center text-muted-foreground">
          <Zap className="mb-4 h-12 w-12 text-muted-foreground/30" />
          <h2 className="text-xl font-bold">Acesso Negado</h2>
          <p>O simulador é restrito para administradores.</p>
        </div>
      </DashboardLayout>
    );
  }

  // Utils for random Brazil coordinates
  const randomLat = () => -(Math.random() * 25 + 5); // Rough Brazil bounds -5 to -30
  const randomLng = () => -(Math.random() * 30 + 35); // Rough bounds -35 to -65
  const statuses = ["pending", "approved", "online", "online", "online", "online", "offline"]; 

  const handleCreateMockDevices = async (count: number, withScada = false) => {
    setLoading(true);
    let success = 0;
    try {
      for (let i = 0; i < count; i++) {
        const idStr = Math.floor(Math.random() * 90000) + 10000 + "";
        const stat = withScada ? "online" : statuses[Math.floor(Math.random() * statuses.length)] as any;
        const res = await supabase.from("devices").insert({
          identifier: `MOCK-${idStr}`,
          name: `Simulado-${idStr}`,
          status: stat,
          lat: randomLat(),
          lng: randomLng(),
          observation: "SIMULATOR_MOCK",
          type: "Modem",
          brand: "MockBrand",
          scada_port: withScada ? 5000 + i : null, // porta scada entre 5000-5020
        }).select("id").single();
        
        if (!res.error && res.data) {
          success++;
          // Generate a fake event for the UI table to look busy
          await supabase.from("events").insert({
            type: withScada ? "device_connected" : "alert",
            message: withScada ? `Banda Larga SCADA estabelecida na porta ${5000+i}` : `Ping de MOCK-${idStr} injetado com sucesso`,
            device_id: res.data.id,
            user_id: user?.id
          });
        }
      }
      toast.success(`${success} dispositivos mock criados.`);
    } catch (e) {
      toast.error("Erro ao criar mocks");
    }
    setLoading(false);
  };

  const handleClearMocks = async () => {
    if (!window.confirm("Apagar todos os modems de teste do banco?")) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("devices").delete().eq("observation", "SIMULATOR_MOCK");
      if (error) throw error;
      toast.success("Todos os mocks apagados.");
      setIsSimulating(false);
    } catch (e: any) {
      toast.error("Falha ao apagar: " + e.message);
    }
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-lg font-bold tracking-tighter text-foreground flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Simulador de Tráfego e Stress
        </h2>
        <p className="text-xs text-muted-foreground">
          Gere dispositivos falsos espalhados geograficamente para testar métricas e limite do mapa, sem afetar produção (eles recebem a tag de SIMULATOR_MOCK).
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Mock Controls */}
        <div className="card-shadow flex flex-col justify-between rounded-lg bg-card p-5 border border-border">
          <div>
            <h3 className="text-sm font-bold mb-1">Injetar Dispositivos</h3>
            <p className="text-xs text-muted-foreground mb-4">Adiciona aparelhos artificiais no mapa nas condições Online, Offline, Pending e Approved de forma randômica.</p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              disabled={loading}
              onClick={() => handleCreateMockDevices(5)}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-secondary py-2 text-xs font-medium text-foreground hover:bg-muted"
            >
              <Plus className="h-4 w-4" /> Gerar 5 Dispositivos
            </button>
            <button
              disabled={loading}
              onClick={() => handleCreateMockDevices(20)}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-secondary py-2 text-xs font-medium text-foreground hover:bg-muted"
            >
              <Plus className="h-4 w-4 text-warning" /> Gerar 20 Dispositivos
            </button>
            <button
              disabled={loading}
              onClick={() => handleCreateMockDevices(5, true)}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-secondary py-2 text-xs font-medium text-foreground hover:bg-muted"
            >
              <Activity className="h-4 w-4 text-success" /> Gerar 5 com SCADA (Online)
            </button>
          </div>
        </div>

        {/* Traffic Controls */}
        <div className="card-shadow flex flex-col justify-between rounded-lg bg-card p-5 border border-primary/20 bg-primary/5">
          <div>
            <h3 className="text-sm font-bold text-primary mb-1">Simulador Contínuo Online</h3>
            <p className="text-xs text-muted-foreground mb-4">Atualiza o TX, RX e DBm ativamente nos mocks que estiverem 'Online' para testar vazão render do React Query/Leaflet.</p>
          </div>
          <button
            disabled={loading}
            onClick={() => setIsSimulating(!isSimulating)}
            className={`flex w-full items-center justify-center gap-2 rounded-md py-3 text-sm font-bold transition-colors ${
              isSimulating ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {isSimulating ? (
              <><Square className="h-4 w-4 fill-current" /> Parar Simulação</>
            ) : (
              <><Play className="h-4 w-4 fill-current" /> Iniciar Tráfego Diário</>
            )}
          </button>
        </div>

        {/* Clear Data */}
        <div className="card-shadow flex flex-col justify-between rounded-lg bg-card p-5 border border-border">
          <div>
            <h3 className="text-sm font-bold text-destructive mb-1">Danger Zone</h3>
            <p className="text-xs text-muted-foreground mb-4">Limpar o banco de dados e remover todos os testes.</p>
          </div>
          <button
            disabled={loading}
            onClick={handleClearMocks}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-destructive/10 py-2 text-xs font-medium text-destructive hover:bg-destructive hover:text-white transition-colors"
          >
            <Trash2 className="h-4 w-4" /> Apagar Mocks
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
