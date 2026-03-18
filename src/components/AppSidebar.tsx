import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Router,
  ClipboardCheck,
  Map,
  Activity,
  Users,
  Settings,
  Radio,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/devices", icon: Router, label: "Dispositivos" },
  { to: "/approval", icon: ClipboardCheck, label: "Aprovação" },
  { to: "/map", icon: Map, label: "Mapa" },
  { to: "/events", icon: Activity, label: "Eventos" },
  { to: "/users", icon: Users, label: "Usuários" },
  { to: "/settings", icon: Settings, label: "Configurações" },
];

export function AppSidebar() {
  const location = useLocation();
  const { profile, roles, signOut } = useAuth();

  const initials = (profile?.display_name || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const roleLabel = roles.includes("admin") ? "Admin" : roles.includes("operator") ? "Operador" : "Viewer";

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r border-border bg-background">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Radio className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tighter text-foreground">RC Gateway</h1>
          <p className="text-[10px] text-muted-foreground">Portal de Controle</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
              {initials}
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">{profile?.display_name || "Usuário"}</p>
              <p className="text-[10px] text-muted-foreground">{roleLabel}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            title="Sair"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
