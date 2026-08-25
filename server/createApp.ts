import express from "express";
import { createClient } from "@supabase/supabase-js";
import { getSsw455Service, getSsw101Service, getSswSessionManager, getSswConfigManager } from "./ssw/sswServiceInstance";
import { SswError } from "../src/integrations/ssw/types/errors";

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

function markHostOffline(url: string) {
  const host = getHostFromUrl(url);
  if (host && !offlineHosts.has(host)) {
    console.log(`[BACKEND] Host '${host}' marcado como OFFLINE. Redirecionando todas as consultas para o banco local.`);
    offlineHosts.add(host);
    isMainSupabaseOffline = true;
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

let supabaseClient: any = null;
let supabaseInitialized = false;

function getSystemSupabaseClient() {
  if (supabaseInitialized) return supabaseClient;
  supabaseInitialized = true;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const supabaseKey = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  
  const mainHost = getHostFromUrl(supabaseUrl);
  if (mainHost) {
    if (mainHost.includes("pwckzqzzewiuqoqqamdo") || mainHost === "your-supabase-project.supabase.co") {
      isMainSupabaseOffline = true;
      offlineHosts.add(mainHost);
    }
  } else {
    isMainSupabaseOffline = true;
  }

  if (supabaseUrl && supabaseKey && !isMainSupabaseOffline) {
    try {
      supabaseClient = createClient(supabaseUrl, supabaseKey);
    } catch (err) {
      isMainSupabaseOffline = true;
    }
  }

  return supabaseClient;
}

export function createApp() {
  const app = express();
  app.use(express.json());

  // Supabase is initialized lazily per request now.

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
        return null;
      }
    }
    
    return getSystemSupabaseClient();
  }

  // API Route - Health Check / Info
  app.get("/api/health", (req, res) => {
    const activeSupabase = getRequestSupabaseClient(req);
    
    // Check if we are running in Vercel
    const isVercel = !!process.env.VERCEL;
    
    // Check SSW configuration
    const sswConfigured = !!(
      (process.env.SSW_USUARIO || process.env.SSW_USER || process.env.SSW_USERNAME) &&
      (process.env.SSW_SENHA || process.env.SSW_PASSWORD || process.env.SSW_PASS)
    );

    res.json({
      status: "ok",
      runtime: isVercel ? "vercel" : "local",
      supabase_configured: !!activeSupabase,
      sswConfigured
    });
  });

  // API Route - Login query from public.app_users table
  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: "Nome de usuário e senha são obrigatórios." });
    }

    const cleanUser = username.trim().toLowerCase();
    const loginName = cleanUser.endsWith("@rotaoperational.com") ? cleanUser.replace("@rotaoperational.com", "") : cleanUser;
    const cleanPass = password.trim();

    console.log(`[BACKEND] Tentativa de login recebida para: ${cleanUser} (loginName: ${loginName})`);
    const activeSupabase = getRequestSupabaseClient(req);

    try {
      if (activeSupabase) {
        const email = cleanUser.includes("@") ? cleanUser : `${loginName}@rotaoperational.com`;
        
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
            username: loginName,
            name: meta.name || authData.user.email?.split("@")[0] || loginName,
            role: meta.role || "Operador de Despacho",
            is_master: meta.is_master === true || loginName === 'master',
            created_at: authData.user.created_at
          };

          try {
            await activeSupabase.from("app_users").upsert({
              username: loginName,
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
                  .eq("username", loginName);
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
            u => u.username.toLowerCase() === loginName && u.password === cleanPass
          );
          
          if (fallbackMatch) {
            console.log(`[BACKEND] Ativando conta corporativa padrão '${loginName}'.`);
            
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
      u => u.username.toLowerCase() === loginName && u.password === cleanPass
    );

    if (match) {
      console.log(`[BACKEND] Login realizado com sucesso via Fallback em Memória para: ${loginName}`);
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
            is_master: updatedUser.is_master,
            unid: updatedUser.unid
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

  // ==========================================
  // SSW CAPABILITY & REPORT 455 API ENDPOINTS
  // ==========================================
  // SSW CAPABILITY & CONFIGURATION ENDPOINTS
  // ==========================================

  // Get Central SSW Configuration (Safe masked view)
  app.get("/api/ssw/config", async (req, res) => {
    try {
      const sessionManager = getSswSessionManager();
      const configManager = getSswConfigManager(sessionManager);
      const config = configManager.getPublicConfig();

      // Diagnose missing env variables
      const missing = [];
      if (!process.env.SSW_EMPRESA && !process.env.SSW_DOMAIN) missing.push("SSW_EMPRESA");
      if (!process.env.SSW_USERI && !process.env.SSW_USER_I) missing.push("SSW_USERI");
      if (!process.env.SSW_USUARIO && !process.env.SSW_USER && !process.env.SSW_USERNAME) missing.push("SSW_USUARIO");
      if (!process.env.SSW_SENHA && !process.env.SSW_PASSWORD && !process.env.SSW_PASS) missing.push("SSW_SENHA");

      return res.json({
        success: true,
        configured: missing.length === 0,
        missing: missing.length > 0 ? missing : undefined,
        config
      });
    } catch (err: any) {
      console.error("[SSW-CONFIG-API] Erro ao recuperar configuração:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Erro ao recuperar configuração central do SSW"
      });
    }
  });

  // Update SSW Configuration (Connection and/or Capabilities)
  app.put("/api/ssw/config", async (req, res) => {
    try {
      const sessionManager = getSswSessionManager();
      const configManager = getSswConfigManager(sessionManager);
      const { connection, capabilities } = req.body || {};

      if (connection) {
        configManager.updateConnectionConfig(connection);
      }

      if (capabilities && capabilities['455']) {
        configManager.update455Config(capabilities['455']);
      }

      return res.json({
        success: true,
        message: "Configurações da integração SSW atualizadas com sucesso!",
        config: configManager.getPublicConfig()
      });
    } catch (err: any) {
      console.error("[SSW-CONFIG-API] Erro ao salvar configuração:", err);
      return res.status(400).json({
        success: false,
        error: err.message || "Falha ao salvar configurações do SSW"
      });
    }
  });

  app.post("/api/ssw/config", async (req, res) => {
    try {
      const sessionManager = getSswSessionManager();
      const configManager = getSswConfigManager(sessionManager);
      const { connection, capabilities } = req.body || {};

      if (connection) {
        configManager.updateConnectionConfig(connection);
      }

      if (capabilities && capabilities['455']) {
        configManager.update455Config(capabilities['455']);
      }

      return res.json({
        success: true,
        message: "Configurações da integração SSW atualizadas com sucesso!",
        config: configManager.getPublicConfig()
      });
    } catch (err: any) {
      console.error("[SSW-CONFIG-API] Erro ao salvar configuração:", err);
      return res.status(400).json({
        success: false,
        error: err.message || "Falha ao salvar configurações do SSW"
      });
    }
  });

  // Restore SSW 455 Capability Defaults (Strict SSWTools Baseline)
  app.post("/api/ssw/config/455/restore-defaults", async (req, res) => {
    try {
      const sessionManager = getSswSessionManager();
      const configManager = getSswConfigManager(sessionManager);
      const restored = configManager.restore455Defaults();

      return res.json({
        success: true,
        message: "Parâmetros padrão do SSWTools restaurados com sucesso para o Relatório 455!",
        config455: restored,
        fullConfig: configManager.getPublicConfig()
      });
    } catch (err: any) {
      console.error("[SSW-CONFIG-API] Erro ao restaurar defaults 455:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Erro ao restaurar parâmetros padrão do SSWTools"
      });
    }
  });

  // Validate SSW 455 Capability Configuration
  app.post("/api/ssw/config/455/validate", async (req, res) => {
    try {
      const sessionManager = getSswSessionManager();
      const configManager = getSswConfigManager(sessionManager);
      const params = req.body || {};
      const result = configManager.validate455Config(params);

      return res.json({
        success: true,
        validation: result
      });
    } catch (err: any) {
      console.error("[SSW-CONFIG-API] Erro na validação da config 455:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Erro ao validar configuração 455"
      });
    }
  });

  // SSW Health Diagnostic and summary
  app.get("/api/ssw/health", async (req, res) => {
    try {
      const sswService = await getSsw455Service();
      const sessionManager = getSswSessionManager();
      const health = await sswService.getHealthSummary();
      const sessionStatus = sessionManager.getSafeStatus();

      return res.json({
        success: true,
        health,
        session: sessionStatus
      });
    } catch (err: any) {
      console.error("[SSW-API] Erro ao obter diagnóstico de saúde:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Erro interno ao obter telemetria SSW"
      });
    }
  });

  // Test SSW Connection
  app.post("/api/ssw/test-connection", async (req, res) => {
    try {
      const sessionManager = getSswSessionManager();
      if (!sessionManager.isConfigured()) {
        return res.status(400).json({
          success: false,
          error: "Credenciais SSW (SSW_USER e SSW_PASSWORD) não configuradas no backend."
        });
      }

      const authenticated = await sessionManager.authenticate();
      return res.json({
        success: authenticated,
        message: "Conexão com o SSW autenticada com sucesso!",
        session: sessionManager.getSafeStatus()
      });
    } catch (err: any) {
      console.error("[SSW-API] Erro no teste de conexão:", err);
      const isSswError = err instanceof SswError;
      return res.status(isSswError ? 400 : 500).json({
        success: false,
        error: err.message || "Falha na autenticação SSW",
        code: isSswError ? err.code : "AUTH_FAILED"
      });
    }
  });

  // Request SSW 455 Report Generation
  app.post("/api/ssw/455/request", async (req, res) => {
    try {
      const sswService = await getSsw455Service();
      const { startDate, endDate, unid, dataTipo } = req.body || {};
      const requestedBy = (req.body?.requestedBy || "operador").trim();

      const job = await sswService.requestReport(
        { startDate, endDate, unid, dataTipo },
        requestedBy
      );

      return res.json({
        success: true,
        job
      });
    } catch (err: any) {
      console.error("[SSW-API] Erro ao solicitar relatório 455:", err);
      const isSswError = err instanceof SswError;
      return res.status(isSswError ? 400 : 500).json({
        success: false,
        error: err.message || "Erro ao solicitar relatório 455 no SSW",
        code: isSswError ? err.code : "REQUEST_FAILED"
      });
    }
  });

  // Check Job Status in Queue 156
  app.get("/api/ssw/455/jobs/:id", async (req, res) => {
    try {
      const sswService = await getSsw455Service();
      const jobId = req.params.id;
      const job = await sswService.checkJobStatus(jobId);

      return res.json({
        success: true,
        job
      });
    } catch (err: any) {
      console.error("[SSW-API] Erro ao consultar status do job:", err);
      const isSswError = err instanceof SswError;
      return res.status(isSswError ? 404 : 500).json({
        success: false,
        error: err.message || "Job não encontrado ou erro na fila",
        code: isSswError ? err.code : "JOB_ERROR"
      });
    }
  });

  // Download Completed Report CSV
  app.post("/api/ssw/455/jobs/:id/download", async (req, res) => {
    try {
      const sswService = await getSsw455Service();
      const jobId = req.params.id;
      const jobStore = sswService.getJobStore();
      const job = await jobStore.getJob(jobId);

      if (!job) {
        return res.status(404).json({
          success: false,
          error: `Job '${jobId}' não encontrado.`
        });
      }

      const { csvContent, rowCount } = await sswService.downloadReport(job);

      return res.json({
        success: true,
        job,
        csvContent,
        rowCount
      });
    } catch (err: any) {
      console.error("[SSW-API] Erro ao baixar relatório:", err);
      const isSswError = err instanceof SswError;
      return res.status(isSswError ? 400 : 500).json({
        success: false,
        error: err.message || "Falha ao baixar CSV do relatório 455",
        code: isSswError ? err.code : "DOWNLOAD_ERROR"
      });
    }
  });

  // Get Latest Completed Report 455 for Current Profile/Unidade
  app.get("/api/ssw/455/latest", async (req, res) => {
    try {
      const sswService = await getSsw455Service();
      const unid = (req.query.unid as string) || undefined;
      const latest = await sswService.findLatestCompletedReport(unid);

      return res.json({
        success: true,
        latest
      });
    } catch (err: any) {
      console.error("[SSW-API] Erro ao buscar último relatório 455:", err);
      const isSswError = err instanceof SswError;
      return res.status(isSswError ? 400 : 500).json({
        success: false,
        error: err.message || "Erro ao consultar último relatório 455",
        code: isSswError ? err.code : "LATEST_QUERY_ERROR"
      });
    }
  });

  // Sync Latest Completed Report 455 (without requesting new report generation)
  app.post("/api/ssw/455/latest/sync", async (req, res) => {
    try {
      const sswService = await getSsw455Service();
      const { unid } = req.body || {};
      const requestedBy = (req.body?.requestedBy || "operador").trim();

      const result = await sswService.syncLatestReport(unid, requestedBy);

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.json(result);
    } catch (err: any) {
      console.error("[SSW-API] Erro ao sincronizar último relatório 455:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Erro inesperado ao sincronizar último relatório 455",
        errorCode: "SYNC_LATEST_FAILED"
      });
    }
  });

  // Retry Download for a Specific Sequence (without requesting new report generation)
  app.post("/api/ssw/455/retry", async (req, res) => {
    try {
      const sswService = await getSsw455Service();
      const { sequence, unid } = req.body || {};
      const requestedBy = (req.body?.requestedBy || "operador").trim();

      const result = await sswService.retryReport(sequence, requestedBy, unid);

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.json(result);
    } catch (err: any) {
      console.error("[SSW-API] Erro no retry do relatório:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Erro inesperado ao tentar novamente o download",
        errorCode: "RETRY_FAILED"
      });
    }
  });

  app.post("/api/ssw/455/:sequence/retry", async (req, res) => {
    try {
      const sswService = await getSsw455Service();
      const sequence = req.params.sequence;
      const { unid } = req.body || {};
      const requestedBy = (req.body?.requestedBy || "operador").trim();

      const result = await sswService.retryReport(sequence, requestedBy, unid);

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.json(result);
    } catch (err: any) {
      console.error("[SSW-API] Erro no retry por sequência:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Erro inesperado ao tentar novamente o download",
        errorCode: "RETRY_FAILED"
      });
    }
  });

  // Generate New SSW 455 Report (Explicit On-Demand Request)
  app.post("/api/ssw/455/generate", async (req, res) => {
    try {
      const sswService = await getSsw455Service();
      const { startDate, endDate, unid, dataTipo, pollIntervalMs, maxWaitTimeMs } = req.body || {};
      const requestedBy = (req.body?.requestedBy || "operador").trim();

      const result = await sswService.acquireReport(
        { startDate, endDate, unid, dataTipo },
        requestedBy,
        { pollIntervalMs: pollIntervalMs || 5000, maxWaitTimeMs: maxWaitTimeMs || 300000 }
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.json(result);
    } catch (err: any) {
      console.error("[SSW-API] Exceção na geração sob demanda de relatório 455:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Erro inesperado durante a geração do relatório 455",
        errorCode: "GENERATION_FAILED"
      });
    }
  });

  // Full Acquisition Flow: Request -> Poll Queue -> Download CSV (Backward Compatibility)
  app.post("/api/ssw/455/acquire", async (req, res) => {
    try {
      const sswService = await getSsw455Service();
      const { startDate, endDate, unid, dataTipo, pollIntervalMs, maxWaitTimeMs } = req.body || {};
      const requestedBy = (req.body?.requestedBy || "operador").trim();

      const result = await sswService.acquireReport(
        { startDate, endDate, unid, dataTipo },
        requestedBy,
        { pollIntervalMs: pollIntervalMs || 5000, maxWaitTimeMs: maxWaitTimeMs || 300000 }
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.json(result);
    } catch (err: any) {
      console.error("[SSW-API] Exceção no fluxo consolidado de aquisição:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Erro inesperado durante a aquisição do relatório 455",
        errorCode: "ACQUISITION_FAILED"
      });
    }
  });

  // ==========================================
  // SSW 101 ON-DEMAND CTRC / NF API ENDPOINTS
  // ==========================================

  // Universal SSW 101 Query (CTRC, NF or Key)
  app.post("/api/ssw/101/query", async (req, res) => {
    try {
      const ssw101Service = await getSsw101Service();
      const requestDto = req.body || {};

      if (!requestDto.tipoConsulta) {
        return res.status(400).json({
          success: false,
          error: "O campo 'tipoConsulta' ('CTRC', 'NF' ou 'CHAVE') é obrigatório."
        });
      }

      const result = await ssw101Service.query(requestDto);
      return res.json(result);
    } catch (err: any) {
      console.error("[SSW-101-API] Erro na consulta 101:", err);
      const isSswError = err instanceof SswError;
      return res.status(isSswError ? 400 : 500).json({
        success: false,
        found: false,
        resultsCount: 0,
        error: err.message || "Falha na consulta SSW 101",
        code: isSswError ? err.code : "QUERY_FAILED"
      });
    }
  });

  // Query CTRC by ID / code directly
  app.get("/api/ssw/101/ctrc/:id", async (req, res) => {
    try {
      const ssw101Service = await getSsw101Service();
      const id = req.params.id;
      const forceFresh = req.query.fresh === 'true' || req.query.fresh === '1';

      const result = await ssw101Service.queryCtrc(id, undefined, forceFresh);
      return res.json(result);
    } catch (err: any) {
      console.error("[SSW-101-API] Erro ao consultar CTRC:", err);
      const isSswError = err instanceof SswError;
      return res.status(isSswError ? 400 : 500).json({
        success: false,
        found: false,
        resultsCount: 0,
        error: err.message || "Erro ao consultar CTRC no SSW 101",
        code: isSswError ? err.code : "CTRC_QUERY_FAILED"
      });
    }
  });

  // Query NF by number directly
  app.get("/api/ssw/101/nf/:numero", async (req, res) => {
    try {
      const ssw101Service = await getSsw101Service();
      const numero = req.params.numero;
      const cnpj = (req.query.cnpj as string) || undefined;
      const forceFresh = req.query.fresh === 'true' || req.query.fresh === '1';

      const result = await ssw101Service.queryNf(numero, cnpj, forceFresh);
      return res.json(result);
    } catch (err: any) {
      console.error("[SSW-101-API] Erro ao consultar NF:", err);
      const isSswError = err instanceof SswError;
      return res.status(isSswError ? 400 : 500).json({
        success: false,
        found: false,
        resultsCount: 0,
        error: err.message || "Erro ao consultar NF no SSW 101",
        code: isSswError ? err.code : "NF_QUERY_FAILED"
      });
    }
  });

  // Query by 44-digit CT-e / NF-e Access Key
  app.get("/api/ssw/101/chave/:chave", async (req, res) => {
    try {
      const ssw101Service = await getSsw101Service();
      const chave = req.params.chave;
      const forceFresh = req.query.fresh === 'true' || req.query.fresh === '1';

      const result = await ssw101Service.queryChave(chave, forceFresh);
      return res.json(result);
    } catch (err: any) {
      console.error("[SSW-101-API] Erro ao consultar chave:", err);
      const isSswError = err instanceof SswError;
      return res.status(isSswError ? 400 : 500).json({
        success: false,
        found: false,
        resultsCount: 0,
        error: err.message || "Erro ao consultar chave no SSW 101",
        code: isSswError ? err.code : "CHAVE_QUERY_FAILED"
      });
    }
  });

  // Clear SSW 101 In-Memory Cache
  app.post("/api/ssw/101/clear-cache", async (req, res) => {
    try {
      const ssw101Service = await getSsw101Service();
      ssw101Service.clearCache();
      return res.json({
        success: true,
        message: "Cache da consulta SSW 101 limpo com sucesso!"
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err.message || "Erro ao limpar cache SSW 101"
      });
    }
  });

  // Get SSW 101 Cache Statistics
  app.get("/api/ssw/101/cache-stats", async (req, res) => {
    try {
      const ssw101Service = await getSsw101Service();
      const stats = ssw101Service.getCacheStats();
      return res.json({
        success: true,
        stats
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err.message || "Erro ao obter estatísticas do cache 101"
      });
    }
  });

  return app;
}
