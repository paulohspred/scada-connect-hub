import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useUsers } from "@/hooks/useData";
import { useAuth } from "@/hooks/useAuth";
import { Users as UsersIcon, Shield, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const roleLabels: Record<string, { label: string; cls: string }> = {
  admin: { label: "Admin", cls: "bg-primary/10 text-primary" },
  operator: { label: "Operador", cls: "bg-success/10 text-success" },
  viewer: { label: "Visualizador", cls: "bg-muted text-muted-foreground" },
};

const UsersPage = () => {
  const qc = useQueryClient();
  const { data: users = [], isFetching, refetch } = useUsers();
  const { hasRole } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "operator" | "viewer">("viewer");
  const [creating, setCreating] = useState(false);
  const canManage = hasRole("admin");

  const handleCreateUser = async () => {
    if (!email || !password) {
      toast.error("Informe e-mail e senha");
      return;
    }
    if (password.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres");
      return;
    }
    setCreating(true);
    try {
      const { error } = await supabase.functions.invoke("admin-users", {
        body: { email, password, role },
      });
      if (error) throw new Error(error.message || "Falha ao criar usuário");

      // ✅ Invalida o cache para forçar refetch da lista de usuários
      await qc.invalidateQueries({ queryKey: ["users"] });

      toast.success(`Usuário ${email} criado com sucesso`);
      setEmail("");
      setPassword("");
      setRole("viewer");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Falha ao criar usuário");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!window.confirm(`Tem certeza que deseja apagar o usuário ${email}?`)) return;
    try {
      const { error } = await supabase.functions.invoke("admin-users", {
        method: "POST",
        body: { action: "delete", user_id: userId },
      });
      if (error) throw new Error(error.message || "Falha ao apagar usuário");

      await qc.invalidateQueries({ queryKey: ["users"] });
      toast.success(`Usuário apagado com sucesso`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Falha ao apagar");
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tighter text-foreground">Usuários</h2>
          <p className="text-xs text-muted-foreground">Gerencie acessos ao painel do gateway</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
          title="Atualizar lista"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-4">
        {[
          { label: "Total", value: users.length, icon: UsersIcon },
          { label: "Admins", value: users.filter((u) => u.user_roles?.some((r) => r.role === "admin")).length, icon: Shield },
          { label: "Operadores", value: users.filter((u) => u.user_roles?.some((r) => r.role === "operator")).length, icon: Shield },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.05 }} className="card-shadow rounded-lg bg-card p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {canManage && (
        <div className="mb-6 card-shadow rounded-lg bg-card p-4">
          <h3 className="mb-3 text-xs font-semibold text-foreground">Criar usuário</h3>
          <div className="grid grid-cols-3 gap-3">
            <input
              type="email"
              placeholder="email@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateUser()}
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              type="password"
              placeholder="Senha inicial (mín. 8 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateUser()}
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "operator" | "viewer")}
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="viewer">Visualizador</option>
              <option value="operator">Operador</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="mt-3">
            <button
              disabled={creating}
              onClick={handleCreateUser}
              className="h-9 rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {creating ? "Criando..." : "Criar usuário"}
            </button>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            O usuário receberá o papel selecionado e poderá acessar com a senha inicial. Altere a senha após o primeiro login.
          </p>
        </div>
      )}

      <div className="card-shadow rounded-lg bg-card">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-5 py-3 font-medium text-muted-foreground">Usuário</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Role</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Criado em</th>
              {canManage && <th className="px-5 py-3 font-medium text-muted-foreground text-right">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {isFetching && users.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-5 py-8 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Carregando...
                  </div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={3} className="px-5 py-8 text-center text-muted-foreground">Nenhum usuário registrado</td></tr>
            ) : users.map((user) => {
              const userRoles = user.user_roles || [];
              const primaryRole = userRoles[0]?.role || "viewer";
              const roleCfg = roleLabels[primaryRole] || roleLabels.viewer;
              const initials = (user.display_name || "U").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
              const created = new Date(user.created_at);
              return (
                <tr key={user.id} className="border-b border-border/50 transition-colors hover:bg-secondary/30">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-[10px] font-semibold text-primary">{initials}</div>
                      <div>
                        <p className="font-medium text-foreground">{user.display_name || "Sem nome"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${roleCfg.cls}`}>{roleCfg.label}</span>
                  </td>
                  <td className="px-5 py-3 tabular-nums text-muted-foreground">
                    {created.toLocaleDateString("pt-BR")}
                  </td>
                  {canManage && (
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleDeleteUser(user.user_id, user.display_name || "Usuário")}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        title="Apagar Usuário"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
};

export default UsersPage;
