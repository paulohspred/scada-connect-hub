import http from "node:http";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import path from "node:path";
import { readFile, readdir } from "node:fs/promises";

const HOST = process.env.UPDATE_AGENT_HOST || "127.0.0.1";
const PORT = Number(process.env.UPDATE_AGENT_PORT || "8787");
const PROJECT_ROOT = process.env.UPDATE_PROJECT_ROOT || process.cwd();
const MIGRATIONS_DIR =
  process.env.UPDATE_MIGRATIONS_DIR || path.join(PROJECT_ROOT, "supabase", "migrations");
const DB_CONTAINER = process.env.UPDATE_DB_CONTAINER || "supabase_db_scada-connect-hub";
const DB_USER = process.env.UPDATE_DB_USER || "postgres";
const DB_NAME = process.env.UPDATE_DB_NAME || "postgres";
const RESTART_CMD = process.env.UPDATE_RESTART_CMD || "";
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const ALLOWED_ORIGINS = (process.env.UPDATE_ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);

let state = {
  state: "idle",
  currentVersion: "unknown",
  targetRef: null,
  startedAt: null,
  finishedAt: null,
  lastError: null,
  logs: [],
};

function nowIso() {
  return new Date().toISOString();
}

function log(line) {
  const msg = `[${nowIso()}] ${line}`;
  state.logs.push(msg);
  if (state.logs.length > 800) state.logs = state.logs.slice(-800);
  process.stdout.write(msg + "\n");
}

function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (!ALLOWED_ORIGINS.length) return true;
  return ALLOWED_ORIGINS.includes(origin);
}

function sendJson(res, statusCode, obj, origin) {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };
  if (origin && isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Headers"] = "authorization, content-type";
    headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS";
  }
  res.writeHead(statusCode, headers);
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 2_000_000) reject(new Error("Payload too large"));
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, {
      cwd: PROJECT_ROOT,
      env: process.env,
      shell: false,
      ...opts,
    });
    let out = "";
    let err = "";
    p.stdout.on("data", (d) => (out += d.toString()));
    p.stderr.on("data", (d) => (err += d.toString()));
    p.on("close", (code) => {
      if (code === 0) resolve({ out, err });
      else reject(new Error(`${cmd} ${args.join(" ")} failed (${code})\n${err || out}`));
    });
  });
}

async function getGitVersion() {
  try {
    const { out } = await run("git", ["describe", "--tags", "--always", "--dirty"]);
    return out.trim() || "unknown";
  } catch {
    return "unknown";
  }
}

async function ensureConfigured() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios");
  }
}

async function requireAdmin(req) {
  await ensureConfigured();
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
  if (!token) throw new Error("Unauthorized");

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!userRes.ok) throw new Error("Unauthorized");
  const userJson = await userRes.json();
  const userId = userJson?.id;
  if (!userId) throw new Error("Unauthorized");

  const rolesRes = await fetch(
    `${SUPABASE_URL}/rest/v1/user_roles?select=role&user_id=eq.${encodeURIComponent(userId)}`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    },
  );
  if (!rolesRes.ok) throw new Error("Forbidden");
  const roles = (await rolesRes.json()) || [];
  const isAdmin = roles.some((r) => r?.role === "admin");
  if (!isAdmin) throw new Error("Forbidden");
  return { userId };
}

async function upsertGatewaySetting(key, value, userId) {
  await ensureConfigured();
  const body = JSON.stringify([{ key, value, updated_by: userId }]);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/gateway_settings?on_conflict=key`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || "Falha ao salvar gateway_settings");
  }
}

function validateRef(ref) {
  const trimmed = String(ref || "").trim();
  if (!trimmed) throw new Error("Ref inválida");
  if (trimmed.length > 80) throw new Error("Ref inválida");
  if (!/^[A-Za-z0-9][A-Za-z0-9._/\\-]*$/.test(trimmed)) throw new Error("Ref inválida");
  return trimmed;
}

async function psqlQuery(sql) {
  const args = [
    "exec",
    "-i",
    DB_CONTAINER,
    "psql",
    "-U",
    DB_USER,
    "-d",
    DB_NAME,
    "-tA",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    sql,
  ];
  const { out } = await run("docker", args, { cwd: PROJECT_ROOT });
  return out.trim();
}

async function psqlExec(sql) {
  const args = [
    "exec",
    "-i",
    DB_CONTAINER,
    "psql",
    "-U",
    DB_USER,
    "-d",
    DB_NAME,
    "-v",
    "ON_ERROR_STOP=1",
  ];
  return new Promise((resolve, reject) => {
    const p = spawn("docker", args, { cwd: PROJECT_ROOT, env: process.env, shell: false });
    let err = "";
    p.stderr.on("data", (d) => (err += d.toString()));
    p.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(err || `psql failed (${code})`));
    });
    p.stdin.write(sql);
    p.stdin.end();
  });
}

async function applyMigrations() {
  log("Migrations: preparando tabela de controle");
  await psqlExec(`
CREATE TABLE IF NOT EXISTS public.app_migrations (
  filename TEXT PRIMARY KEY,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`);

  let files = [];
  try {
    files = await readdir(MIGRATIONS_DIR);
  } catch {
    log("Migrations: diretório não encontrado, pulando");
    return;
  }

  const sqlFiles = files.filter((f) => f.endsWith(".sql")).sort();
  if (!sqlFiles.length) {
    log("Migrations: nenhuma migration encontrada");
    return;
  }

  for (const file of sqlFiles) {
    const full = path.join(MIGRATIONS_DIR, file);
    const content = await readFile(full, "utf8");
    const checksum = crypto.createHash("sha256").update(content).digest("hex");
    const already = await psqlQuery(
      `SELECT 1 FROM public.app_migrations WHERE filename = '${file.replace(/'/g, "''")}' LIMIT 1;`,
    );
    if (already === "1") continue;
    log(`Migrations: aplicando ${file}`);
    const safeFilename = file.replace(/'/g, "''");
    const safeChecksum = checksum.replace(/'/g, "''");
    await psqlExec(`
BEGIN;
${content}
INSERT INTO public.app_migrations (filename, checksum) VALUES ('${safeFilename}', '${safeChecksum}');
COMMIT;
`);
  }

  log("Migrations: concluído");
}

async function runRestart() {
  if (!RESTART_CMD.trim()) {
    log("Restart: UPDATE_RESTART_CMD não configurado, pulando");
    return;
  }
  log(`Restart: executando ${RESTART_CMD}`);
  await new Promise((resolve, reject) => {
    const p = spawn(RESTART_CMD, {
      cwd: PROJECT_ROOT,
      env: process.env,
      shell: true,
      stdio: "inherit",
    });
    p.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Restart falhou (${code})`));
    });
  });
}

let updatePromise = null;

async function startUpdate(ref, userId) {
  if (state.state === "running") throw new Error("Update em execução");
  const safeRef = validateRef(ref);

  state.state = "running";
  state.targetRef = safeRef;
  state.startedAt = nowIso();
  state.finishedAt = null;
  state.lastError = null;
  state.logs = [];
  state.currentVersion = await getGitVersion();

  await upsertGatewaySetting(
    "update_status",
    {
      state: state.state,
      targetRef: state.targetRef,
      startedAt: state.startedAt,
      finishedAt: state.finishedAt,
      lastError: state.lastError,
      currentVersion: state.currentVersion,
    },
    userId,
  );

  updatePromise = (async () => {
    try {
      log("Git: fetch --all --tags --prune");
      await run("git", ["fetch", "--all", "--tags", "--prune"]);

      log(`Git: checkout ${safeRef}`);
      await run("git", ["checkout", "--force", safeRef]);

      log("Node: npm ci");
      await run("npm", ["ci"]);

      log("Build: npm run build");
      await run("npm", ["run", "build"]);

      await applyMigrations();

      await runRestart();

      state.currentVersion = await getGitVersion();
      state.state = "succeeded";
      state.finishedAt = nowIso();
      log("Atualização: sucesso");
    } catch (e) {
      state.state = "failed";
      state.lastError = e?.message || String(e);
      state.finishedAt = nowIso();
      log(`Atualização: falhou - ${state.lastError}`);
    } finally {
      try {
        await upsertGatewaySetting(
          "update_status",
          {
            state: state.state,
            targetRef: state.targetRef,
            startedAt: state.startedAt,
            finishedAt: state.finishedAt,
            lastError: state.lastError,
            currentVersion: state.currentVersion,
          },
          userId,
        );
      } catch (e) {
        log(`Falha ao salvar update_status: ${e?.message || String(e)}`);
      }
      updatePromise = null;
    }
  })();

  return { ok: true };
}

async function init() {
  state.currentVersion = await getGitVersion();
  log(`Update Agent on http://${HOST}:${PORT} (cwd=${PROJECT_ROOT})`);
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (req.method === "OPTIONS") {
    return sendJson(res, 200, { ok: true }, origin);
  }

  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (url.pathname === "/health" && req.method === "GET") {
      return sendJson(res, 200, { ok: true }, origin);
    }

    if (url.pathname === "/status" && req.method === "GET") {
      await requireAdmin(req);
      if (state.currentVersion === "unknown") state.currentVersion = await getGitVersion();
      return sendJson(res, 200, state, origin);
    }

    if (url.pathname === "/update/git" && req.method === "POST") {
      const { userId } = await requireAdmin(req);
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      const ref = body?.ref;
      if (state.state === "running") {
        return sendJson(res, 409, { error: "Update em execução" }, origin);
      }
      await startUpdate(ref, userId);
      return sendJson(res, 202, { ok: true }, origin);
    }

    return sendJson(res, 404, { error: "Not found" }, origin);
  } catch (e) {
    const msg = e?.message || String(e);
    const statusCode = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 400;
    return sendJson(res, statusCode, { error: msg }, origin);
  }
});

await init();
server.listen(PORT, HOST);
