import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Devices from "./pages/Devices.tsx";
import Approval from "./pages/Approval.tsx";
import DeviceMap from "./pages/DeviceMap.tsx";
import Events from "./pages/Events.tsx";
import UsersPage from "./pages/UsersPage.tsx";
import SettingsPage from "./pages/SettingsPage.tsx";
import Login from "./pages/Login.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const ProtectedPage = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>{children}</ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedPage><Index /></ProtectedPage>} />
            <Route path="/devices" element={<ProtectedPage><Devices /></ProtectedPage>} />
            <Route path="/approval" element={<ProtectedPage><Approval /></ProtectedPage>} />
            <Route path="/map" element={<ProtectedPage><DeviceMap /></ProtectedPage>} />
            <Route path="/events" element={<ProtectedPage><Events /></ProtectedPage>} />
            <Route path="/users" element={<ProtectedPage><UsersPage /></ProtectedPage>} />
            <Route path="/settings" element={<ProtectedPage><SettingsPage /></ProtectedPage>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
