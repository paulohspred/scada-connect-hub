import { Pool } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const databaseUrl = Deno.env.get("DATABASE_URL");
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const tcpPortRaw = Deno.env.get("TCP_PORT");
const tcpPortMinRaw = Deno.env.get("TCP_PORT_MIN");
const tcpPortMaxRaw = Deno.env.get("TCP_PORT_MAX");

const defaultPort = 7000;
const tcpPortMin = Number(tcpPortMinRaw ?? tcpPortRaw ?? String(defaultPort));
const tcpPortMax = Number(tcpPortMaxRaw ?? tcpPortRaw ?? String(defaultPort));

if (!Number.isInteger(tcpPortMin) || tcpPortMin <= 0 || tcpPortMin > 65535) {
  throw new Error("TCP_PORT_MIN is invalid");
}
if (!Number.isInteger(tcpPortMax) || tcpPortMax <= 0 || tcpPortMax > 65535) {
  throw new Error("TCP_PORT_MAX is invalid");
}
if (tcpPortMin > tcpPortMax) {
  throw new Error("TCP_PORT_MIN must be <= TCP_PORT_MAX");
}

const pool = new Pool(databaseUrl, 3, true);

function normalizeIp(ip: string) {
  if (ip.startsWith("::ffff:")) return ip.slice("::ffff:".length);
  return ip;
}

async function handleConn(conn: Deno.TcpConn) {
  const local = conn.localAddr as Deno.NetAddr;
  const remote = conn.remoteAddr as Deno.NetAddr;

  const localPort = local.port;
  const remoteIp = normalizeIp(remote.hostname);
  const remotePort = remote.port;
  const identifier = `MODEM-${localPort}-${remoteIp.replaceAll(":", "_")}`;

  const client = await pool.connect();
  let connectionId: string | null = null;
  let deviceId: string | null = null;
  let bytesRx = 0;

  try {
    const upsert = await client.queryObject<{
      id: string;
      status: string;
      scada_port: number | null;
    }>(
      `insert into public.devices (identifier, status, last_ip, last_seen)
       values ($1, 'pending', $2, now())
       on conflict (identifier) do update
         set last_seen = now(),
             last_ip = excluded.last_ip,
             status = case
               when public.devices.status in ('approved', 'online') then 'online'
               else public.devices.status
             end
       returning id, status, scada_port`,
      [identifier, remoteIp]
    );

    const device = upsert.rows[0];
    deviceId = device?.id ?? null;

    if (deviceId) {
      const insertedConn = await client.queryObject<{ id: string }>(
        `insert into public.connections (device_id, source_ip, source_port)
         values ($1, $2, $3)
         returning id`,
        [deviceId, remoteIp, remotePort]
      );
      connectionId = insertedConn.rows[0]?.id ?? null;

      await client.queryObject(
        `insert into public.events (type, device_id, message, metadata)
         values ($1, $2, $3, $4::jsonb)`,
        [
          "device_connected",
          deviceId,
          `TCP conectado em ${localPort} (${remoteIp}:${remotePort})`,
          JSON.stringify({ local_port: localPort, remote_ip: remoteIp, remote_port: remotePort }),
        ]
      );
    }

    console.log(
      JSON.stringify({
        level: "info",
        event: "tcp_connected",
        identifier,
        local_port: localPort,
        remote_ip: remoteIp,
        remote_port: remotePort,
        device_id: deviceId,
        connection_id: connectionId,
      })
    );

    const reader = conn.readable.getReader();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) bytesRx += value.byteLength;
      }
    } finally {
      reader.releaseLock();
    }
  } catch (e) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "tcp_error",
        message: e instanceof Error ? e.message : String(e),
        identifier,
        device_id: deviceId,
        connection_id: connectionId,
      })
    );
  } finally {
    try {
      if (client && deviceId) {
        if (connectionId) {
          await client.queryObject(
            `update public.connections
             set disconnected_at = now(),
                 bytes_rx = coalesce(bytes_rx, 0) + $2
             where id = $1`,
            [connectionId, bytesRx]
          );
        }

        await client.queryObject(
          `update public.devices
           set last_seen = now(),
               bytes_rx = coalesce(bytes_rx, 0) + $2,
               status = case
                 when status in ('approved', 'online') then 'offline'
                 else status
               end
           where id = $1`,
          [deviceId, bytesRx]
        );

        await client.queryObject(
          `insert into public.events (type, device_id, message, metadata)
           values ($1, $2, $3, $4::jsonb)`,
          [
            "device_disconnected",
            deviceId,
            `TCP desconectado em ${localPort} (${remoteIp}:${remotePort})`,
            JSON.stringify({ local_port: localPort, remote_ip: remoteIp, remote_port: remotePort, bytes_rx: bytesRx }),
          ]
        );
      }
    } catch (e) {
      console.error(
        JSON.stringify({
          level: "error",
          event: "tcp_finalize_error",
          message: e instanceof Error ? e.message : String(e),
          identifier,
          device_id: deviceId,
          connection_id: connectionId,
        })
      );
    }

    try {
      conn.close();
    } catch {
      // ignore
    }
    try {
      client.release();
    } catch {
      // ignore
    }
  }
}

const portCount = tcpPortMax - tcpPortMin + 1;
const listeners: Deno.TcpListener[] = [];
const failedPorts: Array<{ port: number; error: string }> = [];

for (let port = tcpPortMin; port <= tcpPortMax; port++) {
  try {
    listeners.push(Deno.listen({ port, transport: "tcp" }));
  } catch (e) {
    failedPorts.push({
      port,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

console.log(
  JSON.stringify({
    level: "info",
    event: "tcp_listen_range",
    port_min: tcpPortMin,
    port_max: tcpPortMax,
    ports: portCount,
    listening: listeners.length,
    failed: failedPorts.length,
    failed_sample: failedPorts.slice(0, 25),
  })
);

if (listeners.length === 0) {
  throw new Error("Failed to listen on any port in the configured range");
}

await Promise.all(
  listeners.map(async (listener) => {
    for await (const conn of listener) {
      handleConn(conn);
    }
  })
);
