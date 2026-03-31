import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/DashboardLayout";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { DownloadCloud, GitBranch, RefreshCw, ShieldAlert } from "lucide-react";

type UpdateStatus =
  | {
      state: "idle" | "running" | "failed" | "succeeded";
      currentVersion: string;
      targetRef: string | null;
      startedAt: string | null;
      finishedAt: string | null;
      lastError: string | null;
      logs: string[];
    }
  | { error: string };

const UpdatesPage = () => {
  const { session, hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const agentUrl = import.meta.env.VITE_UPDATE_AGENT_URL as string | undefined;

  const [ref, setRef] = useState("v1.0.0");
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSimulatingUpdate, setIsSimulatingUpdate] = useState(false);
  const pollTimer = useRef<number | null>(null);

  const canUseAgent = useMemo(() => !!agentUrl && agentUrl.startsWith("http"), [agentUrl]);

  const fetchStatus = async () => {
    if (!canUseAgent) return;
    try {
      const token = session?.access_token || "";
      const res = await fetch(`${agentUrl}/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json()) as UpdateStatus;
      setStatus(json);
    } catch (e) {
      // agent offline handling
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    if (!canUseAgent) {
      // Initial mock state
      setStatus({
        state: "idle",
        currentVersion: "v1.0.0 (Simulado)",
        targetRef: null,
        startedAt: null,
        finishedAt: null,
        lastError: null,
        logs: ["Sistema rodando no modo local via Docker sem Update Agent real configurado.", "A atualização neste painel executará apenas uma simulação visual."],
      });
      return;
    }
    fetchStatus().catch(() => null);
    return () => {
      if (pollTimer.current) window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    };
  }, [isAdmin, canUseAgent]);

  const statusState = status && "state" in status ? status.state : null;

  useEffect(() => {
    if (!isAdmin) return;
    if (pollTimer.current) window.clearInterval(pollTimer.current);
    const intervalMs = statusState === "running" ? 2000 : 10000;
    
    // Se for simulado, não faremos fetch do agente real (pois o status é mantido no estado React localmente pelo startUpdateSimulated)
    if (!canUseAgent && isSimulatingUpdate) return;

    pollTimer.current = window.setInterval(() => {
      if (canUseAgent) {
        fetchStatus().catch(() => null);
      }
    }, intervalMs);
    
    return () => {
      if (pollTimer.current) window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    };
  }, [isAdmin, canUseAgent, statusState, isSimulatingUpdate]);

  const startUpdateSimulated = async () => {
    setIsSimulatingUpdate(true);
    setLoading(true);
    
    // Array of fake logs to show progressively
    const mockLogs = [
      `Iniciando atualização simulada para [${ref}]...`,
      `[1/4] Baixando pacote v${Number(Math.random().toFixed(2))}...`,
      `[1/4] Extraindo arquivos...`,
      `[2/4] Verificando integridade e dependências...`,
      `[3/4] Instalando npm packages na imagem Docker...`,
      `[4/4] Aplicando Supabase migrations no banco de dados...`,
      `[4/4] Migrations aplicadas com sucesso.`,
      `Reiniciando serviços PM2/Docker...`,
      `Sucesso! Atualização aplicada (Mock local concluído).`
    ];

    setStatus({
      state: "running",
      currentVersion: "v1.0.0",
      targetRef: ref,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      lastError: null,
      logs: [mockLogs[0]],
    });

    let step = 1;
    const interval = setInterval(() => {
      if (step < mockLogs.length) {
        setStatus(prev => prev && "state" in prev ? {
          ...prev,
          logs: [...prev.logs, mockLogs[step]]
        } : prev);
        step++;
      } else {
        clearInterval(interval);
        setStatus(prev => prev && "state" in prev ? {
          ...prev,
          state: "succeeded",
          currentVersion: ref,
          finishedAt: new Date().toISOString(),
        } : prev);
        setLoading(false);
        setIsSimulatingUpdate(false);
        toast.success("Atualização simulada foi concluída! (Docker Mode)");
      }
    }, 1500);
  };

  const startUpdate = async () => {
    if (!ref.trim()) {
      toast.error("Informe a tag/branch/commit");
      return;
    }
    if (!canUseAgent) {
      toast.info("Iniciando modo simulação de Update!");
      await startUpdateSimulated();
      return;
    }
    
    setLoading(true);
    try {
      const token = session?.access_token || "";
      const res = await fetch(`${agentUrl}/update/git`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ref: ref.trim() }),
      });
      const json = (await res.json()) as any;
      if (!res.ok) {
        throw new Error(json?.error || "Falha ao iniciar atualização");
      }
      toast.success("Atualização iniciada");
      await fetchStatus();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao iniciar atualização");
    } finally {
      if (canUseAgent) setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tighter text-foreground">Atualizações</h2>
          <p className="text-xs text-muted-foreground">
            Atualize o sistema com segurança (Git + migrations + restart)
          </p>
        </div>
        <button
          onClick={() => fetchStatus().catch(() => null)}
          className="flex h-9 items-center gap-2 rounded-md bg-secondary px-4 text-xs font-medium text-foreground transition-colors hover:bg-secondary/80"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Atualizar status
        </button>
      </div>

      {!isAdmin ? (
        <div className="card-shadow rounded-lg bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-destructive/10 text-destructive">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Acesso restrito</p>
              <p className="text-xs text-muted-foreground">Somente administradores podem atualizar o sistema.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {!canUseAgent && !status ? (
            <div className="card-shadow rounded-lg bg-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-warning/10 text-warning">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Aviso Local</p>
                  <p className="text-xs text-muted-foreground">
                    Carregando simulador local...
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="card-shadow rounded-lg bg-card p-5"
            >
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <GitBranch className="h-3.5 w-3.5" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">Atualizar via Git</h3>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-muted-foreground">Tag/Branch/Commit</label>
                  <input
                    value={ref}
                    onChange={(e) => setRef(e.target.value)}
                    className="h-9 w-full rounded-md border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="v1.2.3"
                  />
                </div>
                <button
                  disabled={loading}
                  onClick={startUpdate}
                  className="flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  <DownloadCloud className="h-3.5 w-3.5" />
                  Iniciar atualização
                </button>
              </div>
            </motion.div>
          )}

          <div className="card-shadow rounded-lg bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Status</h3>
              <span className="text-[10px] text-muted-foreground">{agentUrl || ""}</span>
            </div>

            {!status ? (
              <p className="text-xs text-muted-foreground">Carregando...</p>
            ) : "error" in status ? (
              <p className="text-xs text-destructive">{status.error}</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-border bg-background p-3">
                  <p className="text-[10px] text-muted-foreground">Estado</p>
                  <p className="text-xs font-semibold text-foreground">{status.state}</p>
                </div>
                <div className="rounded-md border border-border bg-background p-3">
                  <p className="text-[10px] text-muted-foreground">Versão atual</p>
                  <p className="text-xs font-semibold text-foreground">{status.currentVersion}</p>
                </div>
                <div className="rounded-md border border-border bg-background p-3">
                  <p className="text-[10px] text-muted-foreground">Alvo</p>
                  <p className="text-xs font-semibold text-foreground">{status.targetRef || "-"}</p>
                </div>
                <div className="rounded-md border border-border bg-background p-3">
                  <p className="text-[10px] text-muted-foreground">Erro</p>
                  <p className="text-xs font-semibold text-foreground">{status.lastError || "-"}</p>
                </div>
              </div>
            )}
          </div>

          {status && !("error" in status) && (
            <div className="card-shadow rounded-lg bg-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Logs</h3>
                <span className="text-[10px] text-muted-foreground">
                  {status.startedAt ? `Início: ${status.startedAt}` : ""}
                </span>
              </div>
              <div className="max-h-[360px] overflow-auto rounded-md border border-border bg-background p-3">
                <pre className="whitespace-pre-wrap break-words text-[11px] leading-4 text-foreground">
                  {(status.logs || []).join("\n")}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default UpdatesPage;
