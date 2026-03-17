import { useState } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Users as UsersIcon, Shield, UserPlus, MoreVertical, Mail } from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "operator" | "viewer";
  lastLogin: string;
  status: "active" | "inactive";
}

const mockUsers: User[] = [
  { id: "1", name: "Admin Principal", email: "admin@rcgateway.com", role: "admin", lastLogin: "2026-03-17T07:30:00", status: "active" },
  { id: "2", name: "Carlos Operador", email: "carlos@rcgateway.com", role: "operator", lastLogin: "2026-03-17T06:45:00", status: "active" },
  { id: "3", name: "Maria Supervisora", email: "maria@rcgateway.com", role: "operator", lastLogin: "2026-03-16T18:00:00", status: "active" },
  { id: "4", name: "João Viewer", email: "joao@rcgateway.com", role: "viewer", lastLogin: "2026-03-15T10:00:00", status: "inactive" },
];

const roleLabels = {
  admin: { label: "Admin", cls: "bg-primary/10 text-primary" },
  operator: { label: "Operador", cls: "bg-success/10 text-success" },
  viewer: { label: "Visualizador", cls: "bg-muted text-muted-foreground" },
};

const UsersPage = () => {
  const [users] = useState(mockUsers);

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tighter text-foreground">Usuários</h2>
          <p className="text-xs text-muted-foreground">Gerencie acessos ao painel do gateway</p>
        </div>
        <button
          onClick={() => toast.info("Funcionalidade disponível em breve")}
          className="flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Novo Usuário
        </button>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-3 gap-4">
        {[
          { label: "Total", value: users.length, icon: UsersIcon },
          { label: "Ativos", value: users.filter(u => u.status === "active").length, icon: Shield },
          { label: "Admins", value: users.filter(u => u.role === "admin").length, icon: Shield },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.05 }}
            className="card-shadow rounded-lg bg-card p-4"
          >
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Table */}
      <div className="card-shadow rounded-lg bg-card">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-5 py-3 font-medium text-muted-foreground">Usuário</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Role</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Status</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Último Login</th>
              <th className="px-5 py-3 font-medium text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const role = roleLabels[user.role];
              const login = new Date(user.lastLogin);
              return (
                <tr key={user.id} className="border-b border-border/50 transition-colors hover:bg-secondary/30">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-[10px] font-semibold text-primary">
                        {user.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{user.name}</p>
                        <p className="text-[10px] text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${role.cls}`}>{role.label}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className={`h-2 w-2 rounded-full ${user.status === "active" ? "bg-success" : "bg-muted-foreground"}`} />
                      <span className="text-muted-foreground">{user.status === "active" ? "Ativo" : "Inativo"}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 tabular-nums text-muted-foreground">
                    {login.toLocaleDateString("pt-BR")} {login.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-5 py-3">
                    <button className="text-muted-foreground hover:text-foreground">
                      <MoreVertical className="h-4 w-4" />
                    </button>
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
