import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useEffect } from "react";

export type Device = Tables<"devices">;
export type Event = Tables<"events">;
export type Profile = Tables<"profiles">;
export type GatewaySetting = Tables<"gateway_settings">;

// ── Realtime hook — invalidates queries when devices or events change ──────
export function useRealtimeSync() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("realtime-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "devices" },
        () => {
          qc.invalidateQueries({ queryKey: ["devices"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        () => {
          qc.invalidateQueries({ queryKey: ["events"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}

// ── Devices ────────────────────────────────────────────────────────────────

export function useDevices() {
  return useQuery({
    queryKey: ["devices"],
    queryFn: async (): Promise<Device[]> => {
      const { data, error } = await supabase
        .from("devices")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function usePendingDevices() {
  return useQuery({
    queryKey: ["devices", "pending"],
    queryFn: async (): Promise<Device[]> => {
      const { data, error } = await supabase
        .from("devices")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

type ApproveDeviceArgs = {
  deviceId: string;
  name: string;
  lat: number;
  lng: number;
  type: "RTU" | "CLP" | "Modem";
  brand: string;
  model: string;
  observation?: string;
};

export function useApproveDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: ApproveDeviceArgs): Promise<Device> => {
      const { data, error } = await supabase.rpc("approve_device", {
        _device_id: args.deviceId,
        _name: args.name,
        _lat: args.lat,
        _lng: args.lng,
        _type: args.type,
        _brand: args.brand,
        _model: args.model,
        _observation: args.observation || "",
      });
      if (error) throw error;
      return data as Device;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["devices"] });
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useRejectDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (deviceId: string): Promise<void> => {
      const { error } = await supabase.rpc("reject_device", { _device_id: deviceId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["devices"] });
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

// ── Events ─────────────────────────────────────────────────────────────────

export function useEvents(page = 0, pageSize = 50) {
  return useQuery({
    queryKey: ["events", page, pageSize],
    queryFn: async (): Promise<Event[]> => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (error) throw error;
      return data;
    },
  });
}

// ── Gateway Settings ────────────────────────────────────────────────────────

export function useGatewaySettings() {
  return useQuery({
    queryKey: ["gateway_settings"],
    queryFn: async (): Promise<GatewaySetting[]> => {
      const { data, error } = await supabase.from("gateway_settings").select("*");
      if (error) throw error;
      return data;
    },
  });
}

// ── Users ──────────────────────────────────────────────────────────────────

type ProfileWithRoles = Profile & { user_roles: { role: string }[] };

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async (): Promise<ProfileWithRoles[]> => {
      // Fetch profiles and roles separately to avoid PGRST200 FK resolution issues
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      // Build a map of userId → roles[]
      const rolesByUser = new Map<string, { role: string }[]>();
      for (const r of rolesRes.data ?? []) {
        const existing = rolesByUser.get(r.user_id) ?? [];
        existing.push({ role: r.role });
        rolesByUser.set(r.user_id, existing);
      }

      // Merge profiles with their roles
      return (profilesRes.data ?? []).map((profile) => ({
        ...profile,
        user_roles: rolesByUser.get(profile.user_id) ?? [],
      }));
    },
  });
}

// ── Device mutations ────────────────────────────────────────────────────────

type UpdateDeviceArgs = {
  id: string;
  name?: string | null;
  lat?: number;
  lng?: number;
  type?: "RTU" | "CLP" | "Modem";
  brand?: string | null;
  model?: string | null;
  observation?: string | null;
};

export function useUpdateDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: UpdateDeviceArgs): Promise<void> => {
      const payload: Partial<Omit<Device, "id" | "created_at" | "updated_at">> = {};
      if (args.name !== undefined) payload.name = args.name;
      if (args.lat !== undefined) payload.lat = args.lat;
      if (args.lng !== undefined) payload.lng = args.lng;
      if (args.type !== undefined) payload.type = args.type;
      if (args.brand !== undefined) payload.brand = args.brand;
      if (args.model !== undefined) payload.model = args.model;
      if (args.observation !== undefined) payload.observation = args.observation;
      const { error } = await supabase.from("devices").update(payload).eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}

export function useDeleteDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from("devices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["devices"] });
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export type DeviceMode = "normal" | "traffic" | "silent" | "maintenance";

export function useSetDeviceMode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ deviceId, mode }: { deviceId: string; mode: DeviceMode }): Promise<void> => {
      const { error } = await supabase.rpc("set_device_mode", {
        _device_id: deviceId,
        _mode: mode,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["devices"] });
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

// ── Utilities ──────────────────────────────────────────────────────────────

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}
