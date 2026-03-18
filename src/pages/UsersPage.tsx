import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useUsers } from "@/hooks/useData";
import { useAuth } from "@/hooks/useAuth";
import { Users as UsersIcon, Shield } from "lucide-react";

const roleLabels: Record<string, { label: string; cls: string }> = {
  admin: { label: "Admin", cls: "bg-primary/10 text-primary" },
  operator: { label: "Operador", cls: "bg-success/10 text-success" },
  viewer: { label: "Visualizador", cls: "bg-muted text-muted-foreground" },
};

const UsersPage = () => {
  const { data: users = [] } = useUsers();

  return (
    <DashboardLayout>
      <div className="mb-6">
        <div>
          <h2 className="text-lg font-bold tracking-tighter text-foreground">Usuários</h2>
          <p className="text-xs text-muted-foreground">Gerencie acessos ao painel do gateway</p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-4">
        {[
          { label: "Total", value: users.length, icon: UsersIcon },
          { label: "Admins", value: users.filter((u: any) => u.user_roles?.some((r: any) => r.role === "admin")).length, icon: Shield },
          { label: "Operadores", value: users.filter((u: any) => u.user_roles?.some((r: any) => r.role === "operator")).length, icon: Shield },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.05 }} className="card-shadow rounded-lg bg-card p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="card-shadow rounded-lg bg-card">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-5 py-3 font-medium text-muted-foreground">Usuário</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Role</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Criado em</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={3} className="px-5 py-8 text-center text-muted-foreground">Nenhum usuário registrado</td></tr>
            ) : users.map((user: any) => {
              const userRoles = user.user_roles || [];
              const primaryRole = userRoles[0]?.role || "viewer";
              const role = roleLabels[primaryRole] || roleLabels.viewer;
              const initials = (user.display_name || "U").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
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
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${role.cls}`}>{role.label}</span>
                  </td>
                  <td className="px-5 py-3 tabular-nums text-muted-foreground">
                    {created.toLocaleDateString("pt-BR")}
                  </td>
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
