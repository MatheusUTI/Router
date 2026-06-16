import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import dns from "dns";

dotenv.config();

// Tracks verified offline Supabase hosts to avoid fetch failures/warnings
const offlineHosts = new Set<string>();
let isMainSupabaseOffline = false;

function getHostFromUrl(url: string): string {
  if (!url) return "";
  try {
    return new URL(url).hostname;
  } catch (e) {
    // If lacks protocol, wrap it
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      try {
        return new URL("https://" + url).hostname;
      } catch {
        return url;
      }
    }
    return url;
  }
}

// Default fallback users in memory to prevent lockout
const DEFAULT_APP_USERS = [
  {
    username: "anderson",
    password: "123",
    name: "Anderson Matheus",
    role: "Supervisor Operacional",
    is_master: true,
    unid: "VGA"
  },
  {
    username: "master",
    password: "123",
    name: "Anderson M. (Master)",
    role: "Superintendente de Logística",
    is_master: true,
    unid: "VGA"
  },
  {
    username: "operador",
    password: "123",
    name: "João Silva",
    role: "Operador de Despacho",
    is_master: false,
    unid: "VGA"
  },
  {
    username: "auditor",
    password: "123",
    name: "Maria Costa",
    role: "Auditor de Contratos",
    is_master: false,
    unid: "VGA"
  }
];

// Memory cache for fallback users created during session if DB is offline or not migration setup
let inMemoryUsers = [...DEFAULT_APP_USERS];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Setup Supabase Client securely on the server side
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const supabaseKey = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

  function markHostOffline(url: string) {
    const host = getHostFromUrl(url);
    if (host && !offlineHosts.has(host)) {
      console.log(`[BACKEND] Host '${host}' marcado como OFFLINE. Redirecionando todas as consultas para o banco local.`);
      offlineHosts.add(host);
      if (url === supabaseUrl) {
        isMainSupabaseOffline = true;
      }
    }
  }

  const mainHost = getHostFromUrl(supabaseUrl);
  // Aggressively check placeholders or unreachable environments
  if (mainHost) {
    if (mainHost.includes("pwckzqzzewiuqoqqamdo") || mainHost === "your-supabase-project.supabase.co") {
      console.log(`[BACKEND] Host '${mainHost}' é um endereço de rascunho/placeholder. Ignorando conexão remota ativa.`);
      isMainSupabaseOffline = true;
      offlineHosts.add(mainHost);
    } else {
      dns.lookup(mainHost, (err) => {
        if (err) {
          console.log(`[BACKEND] Host '${mainHost}' está offline/inacessível via DNS. Ativando modo local.`);
          isMainSupabaseOffline = true;
          offlineHosts.add(mainHost);
        }
      });
    }
  } else {
    isMainSupabaseOffline = true;
  }

  let supabaseClient: any = null;
  if (supabaseUrl && supabaseKey && !isMainSupabaseOffline) {
    try {
      supabaseClient = createClient(supabaseUrl, supabaseKey);
      console.log(`[BACKEND] Supabase configurado e inicializado com sucesso.`);
    } catch (err) {
      // Avoid raw logs on instantiating
      isMainSupabaseOffline = true;
    }
  }

  // Dynamic client initialization function per request based on client headers
  function getRequestSupabaseClient(req: any) {
    const rxUrl = req.headers["x-supabase-url"] || req.headers["X-Supabase-Url"];
    const rxKey = req.headers["x-supabase-key"] || req.headers["X-Supabase-Key"];
    
    if (rxUrl && rxKey && rxUrl !== "https://your-supabase-project.supabase.co" && rxKey !== "your-supabase-anon-key") {
      const rxHost = getHostFromUrl(rxUrl as string);
      if (offlineHosts.has(rxHost)) {
        return null;
      }
      try {
        return createClient(rxUrl as string, rxKey as string);
      } catch (err) {
        // Suppress print
        return null;
      }
    }
    
    if (isMainSupabaseOffline) {
      return null;
    }
    return supabaseClient;
  }

  // API Route - Health Check / Info
  app.get("/api/health", (req, res) => {
    const activeSupabase = getRequestSupabaseClient(req);
    res.json({
      status: "ok",
      supabase_configured: !!activeSupabase,
      supabase_url: supabaseUrl ? `${supabaseUrl.substring(0, 15)}...` : null
    });
  });

  // API Route - Login query from public.app_users table
  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: "Nome de usuário e senha são obrigatórios." });
    }

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    console.log(`[BACKEND] Tentativa de login recebida para: ${cleanUser}`);
    const activeSupabase = getRequestSupabaseClient(req);

    try {
      if (activeSupabase) {
        const email = cleanUser.includes("@") ? cleanUser : `${cleanUser}@rotaoperational.com`;
        
        console.log(`[BACKEND] Tentativa de login via Supabase para: ${email}`);
        
        let authData: any = null;
        let authError: any = null;
        try {
          const authRes = await activeSupabase.auth.signInWithPassword({
            email,
            password: cleanPass
          });
          authData = authRes.data;
          authError = authRes.error;
        } catch (fetchErr: any) {
          const msg = fetchErr?.message || "";
          if (msg.includes("fetch failed") || msg.includes("getaddrinfo")) {
            markHostOffline(activeSupabase.supabaseUrl);
          }
          authError = { message: "connection offline" };
        }

        if (!authError && authData?.user) {
          console.log(`[BACKEND] Login corporativo autenticado com sucesso.`);
          const meta = authData.user.user_metadata || {};
          const mappedUser = {
            username: cleanUser,
            name: meta.name || authData.user.email?.split("@")[0] || username,
            role: meta.role || "Operador de Despacho",
            is_master: meta.is_master === true || cleanUser === 'master',
            created_at: authData.user.created_at
          };

          try {
            await activeSupabase.from("app_users").upsert({
              username: cleanUser,
              password: cleanPass,
              name: mappedUser.name,
              role: mappedUser.role,
              is_master: mappedUser.is_master
            });
          } catch (syncErr: any) {
            // Silently swallow
          }

          return res.json({
            success: true,
            user: mappedUser
          });
        } else {
          const rxHost = getHostFromUrl(activeSupabase.supabaseUrl);
          const isOffline = offlineHosts.has(rxHost) || (authError && authError.message === "connection offline");

          if (!isOffline) {
            // Fallback to querying custom app_users table
            try {
              let dbData: any = null;
              let dbError: any = null;
              try {
                const dbRes = await activeSupabase
                  .from("app_users")
                  .select("*")
                  .eq("username", cleanUser);
                dbData = dbRes.data;
                dbError = dbRes.error;
              } catch (fetchErr: any) {
                const msg = fetchErr?.message || "";
                if (msg.includes("fetch failed") || msg.includes("getaddrinfo")) {
                  markHostOffline(activeSupabase.supabaseUrl);
                }
                dbError = { message: "connection offline" };
              }

              if (!dbError && dbData && dbData.length > 0) {
                const dbUser = dbData[0];
                if (dbUser.password === cleanPass) {
                  console.log(`[BACKEND] Login autenticado com sucesso via tabela local.`);
                  return res.json({
                    success: true,
                    user: {
                      username: dbUser.username,
                      name: dbUser.name,
                      role: dbUser.role,
                      is_master: !!dbUser.is_master,
                      created_at: dbUser.created_at || new Date().toISOString()
                    }
                  });
                }
              }
            } catch (dbQueryErr) {
              // Ignored
            }
          }

          // Let's check fallback auto-provisioning!
          const fallbackMatch = DEFAULT_APP_USERS.find(
            u => u.username.toLowerCase() === cleanUser && u.password === cleanPass
          );
          
          if (fallbackMatch) {
            console.log(`[BACKEND] Ativando conta corporativa padrão '${cleanUser}'.`);
            
            if (!isOffline && !offlineHosts.has(rxHost)) {
              try {
                await activeSupabase.auth.signUp({
                  email,
                  password: cleanPass,
                  options: {
                    data: {
                      name: fallbackMatch.name,
                      role: fallbackMatch.role,
                      is_master: fallbackMatch.is_master
                    }
                  }
                });
              } catch (signUpErr: any) {
                const msg = signUpErr?.message || "";
                if (msg.includes("fetch failed") || msg.includes("getaddrinfo")) {
                  markHostOffline(activeSupabase.supabaseUrl);
                }
              }
            }

            return res.json({
              success: true,
              user: {
                username: fallbackMatch.username,
                name: fallbackMatch.name,
                role: fallbackMatch.role,
                is_master: fallbackMatch.is_master,
                created_at: new Date().toISOString()
              }
            });
          }
        }
      }
    } catch (generalErr) {
      // Ignored
    }

    // Try in-memory or fallback matching for seeds (including 'master')
    const match = inMemoryUsers.find(
      u => u.username.toLowerCase() === cleanUser && u.password === cleanPass
    );

    if (match) {
      console.log(`[BACKEND] Login realizado com sucesso via Fallback em Memória para: ${cleanUser}`);
      return res.json({
        success: true,
        user: {
          username: match.username,
          name: match.name,
          role: match.role,
          is_master: match.is_master
        }
      });
    }

    return res.status(401).json({
      success: false,
      error: "Credenciais inválidas. Verifique o usuário corporativo e a senha cadastrada."
    });
  });

  // API Route - Get all users
  app.get("/api/auth/users", async (req, res) => {
    const activeSupabase = getRequestSupabaseClient(req);
    try {
      if (activeSupabase) {
        const { data, error } = await activeSupabase
          .from("app_users")
          .select("*")
          .order("created_at", { ascending: true });

        if (!error && data) {
          // If the DB returned rows, map and return them
          const mapped = data.map((u: any) => ({
            username: u.username,
            password: u.password,
            name: u.name,
            role: u.role,
            is_master: !!u.is_master,
            created_at: u.created_at
          }));
          
          // Also merge or ensure fallback users exist
          const resultList = [...mapped];
          DEFAULT_APP_USERS.forEach(fallback => {
            if (!resultList.some(u => u.username.toLowerCase() === fallback.username.toLowerCase())) {
              resultList.push(fallback);
            }
          });

          return res.json({ success: true, users: resultList });
        }
      }
    } catch (e: any) {
      console.error("[BACKEND] Erro ao buscar usuários no Supabase:", e);
    }

    // Fallback internally
    return res.json({ success: true, users: inMemoryUsers });
  });

  // API Route - Save / Update / Upsert user
  app.post("/api/auth/users", async (req, res) => {
    const { username, password, name, role, is_master, unid } = req.body;
    if (!username || !name || !role) {
      return res.status(400).json({ success: false, error: "Parâmetros de usuário inválidos." });
    }

    const cleanUsername = username.toLowerCase().trim();
    const updatedUser = {
      username: cleanUsername,
      password: password || "123",
      name,
      role,
      is_master: !!is_master,
      unid: unid || "VGA"
    };

    // Update in memory cache
    const existingIdx = inMemoryUsers.findIndex(u => u.username.toLowerCase() === cleanUsername);
    if (existingIdx > -1) {
      inMemoryUsers[existingIdx] = updatedUser;
    } else {
      inMemoryUsers.push(updatedUser);
    }

    const activeSupabase = getRequestSupabaseClient(req);

    // Attempt Supabase synchronization
    if (activeSupabase) {
      try {
        const email = cleanUsername.includes("@") ? cleanUsername : `${cleanUsername}@rotaoperational.com`;
        
        console.log(`[BACKEND] Cadastrando usuário '${cleanUsername}' no Supabase Auth (${email}).`);

        // Check if we can create the user using Admin auth client or normal signUp
        try {
          // Attempt Admin createUser (runs bypass of confirmation if service role key is set!)
          const { data: adminData, error: adminErr } = await activeSupabase.auth.admin.createUser({
            email,
            password: updatedUser.password,
            email_confirm: true,
            user_metadata: {
              name: updatedUser.name,
              role: updatedUser.role,
              is_master: updatedUser.is_master
            }
          });

          if (adminErr) {
            console.log(`[BACKEND] auth.admin.createUser falhou (não é chave de serviço): ${adminErr.message}. Tentando signUp normal...`);
            // Fallback to normal signUp
            const { data: signData, error: signUpError } = await activeSupabase.auth.signUp({
              email,
              password: updatedUser.password,
              options: {
                data: {
                  name: updatedUser.name,
                  role: updatedUser.role,
                  is_master: updatedUser.is_master
                }
              }
            });
            if (signUpError) {
              console.log(`[BACKEND] signUp normal também reportou erro/aviso: ${signUpError.message}`);
            }
          } else {
            console.log("[BACKEND] Usuário criado e confirmado com sucesso via API Admin do Supabase Auth.");
          }
        } catch (authErr: any) {
          console.warn("[BACKEND] Erro ao cadastrar no Supabase Auth:", authErr.message || authErr);
        }

        // Always sync to the custom public.app_users table
        const { error: dbError } = await activeSupabase
          .from("app_users")
          .upsert({
            username: cleanUsername,
            password: updatedUser.password,
            name: updatedUser.name,
            role: updatedUser.role,
            is_master: updatedUser.is_master
          });

        if (dbError) {
          console.warn("[BACKEND] Erro ao sincronizar usuário no Supabase DB:", dbError.message);
          return res.json({
            success: true,
            warning: true,
            message: `Salvo localmente na sessão. Sincronização de tabela de dados falhou: ${dbError.message}`
          });
        }

        return res.json({ success: true, message: "Usuário sincronizado e cadastrado no Supabase com sucesso!" });
      } catch (dbErr: any) {
        console.error("[BACKEND] Exceção ao persistir usuário:", dbErr);
      }
    }

    return res.json({ success: true, message: "Usuário persistido em memória com sucesso!" });
  });

  // API Route - Delete user
  app.delete("/api/auth/users/:username", async (req, res) => {
    const usernameToDelete = req.params.username.toLowerCase().trim();
    
    // Remove from memory cache
    inMemoryUsers = inMemoryUsers.filter(u => u.username.toLowerCase() !== usernameToDelete);

    const activeSupabase = getRequestSupabaseClient(req);

    if (activeSupabase) {
      try {
        const { error } = await activeSupabase
          .from("app_users")
          .delete()
          .eq("username", usernameToDelete);

        if (error) {
          console.warn("[BACKEND] Erro ao deletar usuário do Supabase DB:", error.message);
          return res.status(500).json({ success: false, error: error.message });
        }
        return res.json({ success: true, message: "Usuário removido do Supabase com sucesso!" });
      } catch (dbErr: any) {
        return res.status(500).json({ success: false, error: dbErr.message || dbErr });
      }
    }

    return res.json({ success: true, message: "Usuário removido da memória do servidor com sucesso!" });
  });

  // Setup Vite as middleware or static file serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("[BACKEND] Vite montado em modo de Desenvolvimento.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("[BACKEND] Servindo arquivos estáveis de produção de /dist.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[BACKEND] Servidor operacional na porta ${PORT} (0.0.0.0)`);
  });
}

startServer().catch((err) => {
  console.error("[BACKEND] Erro fatal no servidor de inicialização:", err);
});
