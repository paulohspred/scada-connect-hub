import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-gateway-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate via x-gateway-key header
  const gatewayKey = req.headers.get("x-gateway-key");
  const expectedKey = Deno.env.get("GATEWAY_API_KEY");

  if (!expectedKey || gatewayKey !== expectedKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/gateway-api\/?/, "");

  try {
    // POST /gateway-api/register — Register or update a device heartbeat
    if (req.method === "POST" && (path === "register" || path === "")) {
      const body = await req.json();
      const { identifier, source_ip, source_port, signal_dbm } = body;

      if (!identifier) {
        return jsonResponse({ error: "identifier is required" }, 400);
      }

      // Check if device already exists
      const { data: existing } = await supabase
        .from("devices")
        .select("id, status, scada_port")
        .eq("identifier", identifier)
        .single();

      if (existing) {
        // Update heartbeat
        await supabase
          .from("devices")
          .update({
            last_seen: new Date().toISOString(),
            last_ip: source_ip || null,
            signal_dbm: signal_dbm ?? null,
            status:
              existing.status === "approved" || existing.status === "online"
                ? "online"
                : existing.status,
          })
          .eq("id", existing.id);

        return jsonResponse({
          action: "updated",
          device_id: existing.id,
          scada_port: existing.scada_port,
          status: existing.status === "approved" ? "online" : existing.status,
        });
      } else {
        // Create pending device
        const { data: newDevice, error } = await supabase
          .from("devices")
          .insert({
            identifier,
            last_ip: source_ip || null,
            signal_dbm: signal_dbm ?? null,
            status: "pending",
          })
          .select("id, status")
          .single();

        if (error) throw error;

        // Log event
        await supabase.from("events").insert({
          type: "device_connected",
          device_id: newDevice.id,
          message: `New device ${identifier} connected from ${source_ip || "unknown"}`,
        });

        return jsonResponse({
          action: "created",
          device_id: newDevice.id,
          status: "pending",
          scada_port: null,
        });
      }
    }

    // POST /gateway-api/heartbeat — Batch heartbeat for multiple devices
    if (req.method === "POST" && path === "heartbeat") {
      const body = await req.json();
      const { devices } = body;

      if (!Array.isArray(devices)) {
        return jsonResponse({ error: "devices array is required" }, 400);
      }

      const results = [];
      for (const dev of devices) {
        const { data } = await supabase
          .from("devices")
          .select("id, status, scada_port")
          .eq("identifier", dev.identifier)
          .single();

        if (data) {
          await supabase
            .from("devices")
            .update({
              last_seen: new Date().toISOString(),
              last_ip: dev.source_ip || null,
              signal_dbm: dev.signal_dbm ?? null,
              bytes_tx: dev.bytes_tx ?? null,
              bytes_rx: dev.bytes_rx ?? null,
              status:
                data.status === "approved" || data.status === "online"
                  ? "online"
                  : data.status,
            })
            .eq("id", data.id);

          results.push({
            identifier: dev.identifier,
            device_id: data.id,
            scada_port: data.scada_port,
            status: data.status === "approved" ? "online" : data.status,
          });
        }
      }

      return jsonResponse({ updated: results.length, devices: results });
    }

    // POST /gateway-api/disconnect — Mark device as offline
    if (req.method === "POST" && path === "disconnect") {
      const body = await req.json();
      const { identifier, device_id } = body;

      const query = device_id
        ? supabase.from("devices").select("id, status").eq("id", device_id)
        : supabase.from("devices").select("id, status").eq("identifier", identifier);

      const { data } = await query.single();

      if (data && (data.status === "online" || data.status === "approved")) {
        await supabase
          .from("devices")
          .update({ status: "offline" })
          .eq("id", data.id);

        await supabase.from("events").insert({
          type: "device_disconnected",
          device_id: data.id,
          message: `Device disconnected`,
        });

        return jsonResponse({ action: "disconnected", device_id: data.id });
      }

      return jsonResponse({ action: "no_change", device_id: data?.id || null });
    }

    // GET /gateway-api/config — Get approved devices with their port bindings
    if (req.method === "GET" && path === "config") {
      const { data: devices } = await supabase
        .from("devices")
        .select("id, identifier, name, scada_port, status, type")
        .in("status", ["approved", "online", "offline"])
        .not("scada_port", "is", null)
        .order("scada_port", { ascending: true });

      return jsonResponse({ devices: devices || [] });
    }

    return jsonResponse({ error: "Not found" }, 404);
  } catch (err) {
    console.error("Gateway API error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }

  function jsonResponse(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
