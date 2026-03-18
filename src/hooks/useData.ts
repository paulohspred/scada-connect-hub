import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Device = Tables<"devices">;

export function useDevices() {
  return useQuery({
    queryKey: ["devices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devices")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Device[];
    },
  });
}

export function usePendingDevices() {
  return useQuery({
    queryKey: ["devices", "pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devices")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Device[];
    },
  });
}

export function useApproveDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      deviceId: string;
      name: string;
      lat: number;
      lng: number;
      type: "RTU" | "CLP" | "Modem";
      brand: string;
      model: string;
      observation?: string;
    }) => {
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
      return data;
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
    mutationFn: async (deviceId: string) => {
      const { error } = await supabase.rpc("reject_device", { _device_id: deviceId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["devices"] });
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useEvents() {
  return useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });
}

export function useGatewaySettings() {
  return useQuery({
    queryKey: ["gateway_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("gateway_settings").select("*");
      if (error) throw error;
      return data;
    },
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, user_roles(role)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}
