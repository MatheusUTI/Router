import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.106.1";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

function reply(status: number, value: unknown) {
  return new Response(JSON.stringify(value), { status, headers: jsonHeaders });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return reply(405, { success: false, error: "Método não permitido." });

  let payload: { username?: unknown; password?: unknown };
  try {
    payload = await req.json();
  } catch {
    return reply(400, { success: false, error: "Dados de autenticação inválidos." });
  }

  const username = typeof payload?.username === "string" ? payload.username.trim().toLowerCase() : "";
  const password = typeof payload?.password === "string" ? payload.password : "";
  if (!username || !password || username.length > 128 || password.length > 256) {
    return reply(400, { success: false, error: "Informe usuário e senha válidos." });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) {
    return reply(503, { success: false, error: "Autenticação temporariamente indisponível." });
  }

  const db = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data, error } = await db.rpc("router_verify_login", {
      p_username: username,
      p_password: password,
    });

    if (error) {
      console.error("[router-login] Verification query failed:", error.code || "unknown");
      return reply(503, { success: false, error: "Autenticação temporariamente indisponível." });
    }

    if (!Array.isArray(data) || data.length !== 1) {
      return reply(401, { success: false, error: "Usuário ou senha inválidos." });
    }

    const user = data[0];
    return reply(200, {
      success: true,
      user: {
        username: user.username,
        name: user.name,
        role: user.role,
        is_master: user.is_master === true,
        unid: user.unid,
      },
    });
  } catch {
    return reply(503, { success: false, error: "Autenticação temporariamente indisponível." });
  }
});
