import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { queryClient } from "@/lib/queryClient";
import Index from "./pages/Index.tsx";
import Devices from "./pages/Devices.tsx";
import Approval from "./pages/Approval.tsx";
import DeviceMap from "./pages/DeviceMap.tsx";
import Events from "./pages/Events.tsx";
import UsersPage from "./pages/UsersPage.tsx";
import SettingsPage from "./pages/SettingsPage.tsx";
import UpdatesPage from "./pages/UpdatesPage.tsx";
import Login from "./pages/Login.tsx";
import NotFound from "./pages/NotFound.tsx";

const ProtectedPage = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>{children}</ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Toaster />
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
          <Route path="/updates" element={<ProtectedPage><UpdatesPage /></ProtectedPage>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
