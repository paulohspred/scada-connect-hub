import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS — restrict to your production domain via env var
// Set ALLOWED_ORIGIN in Supabase Edge Function secrets, e.g. "https://gateway.rcgeradores.com.br"
// Falls back to strict deny if not set in production
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "";

function corsHeaders(requestOrigin: string | null) {
  const origin =
    ALLOWED_ORIGIN && requestOrigin === ALLOWED_ORIGIN
      ? requestOrigin
      : ALLOWED_ORIGIN || ""; // empty string = no Access-Control-Allow-Origin header → browser blocks
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
  };
}

function json(data: unknown, status = 200, requestOrigin: string | null = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(requestOrigin), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const requestOrigin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(requestOrigin) });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/admin-users\/?/, "");

  try {
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return json({ error: "Unauthorized" }, 401, requestOrigin);

    console.log("Decoding JWT instead of calling getUser to prevent Kong timeout...");
    let user_id_from_jwt = null;
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        user_id_from_jwt = payload.sub;
      }
    } catch(e) { console.error("JWT parse error", e); }
    
    if (!user_id_from_jwt) return json({ error: "Unauthorized - bad token" }, 401, requestOrigin);

    console.log("Checking user roles for", user_id_from_jwt);
    const { data: roles, error: rolesErr } = await service
      .from("user_roles")
      .select("role")
      .eq("user_id", user_id_from_jwt);
      
    if (rolesErr) console.error("Roles fetch error:", rolesErr);

    const isAdmin = (roles || []).some((r) => r.role === "admin");
    if (!isAdmin) return json({ error: "Forbidden" }, 403, requestOrigin);

    console.log("User is admin. Processing request method:", req.method);

    if (req.method === "POST" && (path === "" || path === "create")) {
      const body = await req.json();
      const { email, password, role = "viewer", display_name, action, user_id } = body;

      // Handle DELETE via POST action payload to bypass CORS/proxy strict method issues
      if (action === "delete") {
        console.log("Executing delete user action for", user_id);
        if (!user_id) return json({ error: "user_id required" }, 400, requestOrigin);
        if (user_id === user_id_from_jwt) {
          return json({ error: "Você não pode excluir a sua própria conta." }, 400, requestOrigin);
        }
        const { error: delErr } = await service.auth.admin.deleteUser(user_id);
        if (delErr) {
          console.error("Delete user error:", delErr);
          return json({ error: delErr.message }, 400, requestOrigin);
        }
        console.log("Delete success");
        return json({ success: true, user_id }, 200, requestOrigin);
      }

      if (!email || !password) return json({ error: "email and password required" }, 400, requestOrigin);

      // Enforce minimum password length server-side (8 chars)
      if (password.length < 8) {
        return json({ error: "A senha deve ter pelo menos 8 caracteres" }, 400, requestOrigin);
      }

      // Enforce valid roles only
      const validRoles = ["admin", "operator", "viewer"];
      if (!validRoles.includes(role)) {
        return json({ error: "Role inválido" }, 400, requestOrigin);
      }

      const { data: created, error } = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: display_name || email },
      });
      if (error) return json({ error: error.message }, 400, requestOrigin);

      const newUserId = created.user?.id;
      if (newUserId) {
        await service
          .from("user_roles")
          .insert({ user_id: newUserId, role });
      }

      return json({ id: newUserId, email, role }, 200, requestOrigin);
    }

    return json({ error: "Method not allowed" }, 405, requestOrigin);
  } catch (e: unknown) {
    console.error("admin-users error:", e);
    return json({ error: "Internal error" }, 500, requestOrigin);
  }
});
