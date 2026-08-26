import { createApp } from "../server/createApp";
import http from "http";
import fs from "fs";
import path from "path";

async function runRoutingRegressionTest() {
  console.log("--- Iniciando Teste de Regressão de Roteamento Vercel & SPA Fallback ---");

  // 1. Validar vercel.json
  const vercelJsonPath = path.resolve(__dirname, "../vercel.json");
  if (!fs.existsSync(vercelJsonPath)) {
    throw new Error("Arquivo vercel.json não encontrado!");
  }
  const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, "utf-8"));
  const rewrites = vercelConfig.rewrites || [];

  console.log("✓ Regras de rewrite no vercel.json:", JSON.stringify(rewrites, null, 2));

  // Verificar se há regra para /api/* direcionando para a função /api
  const apiRewrite = rewrites.find((r: any) => r.source.startsWith("/api") && r.destination === "/api");
  if (!apiRewrite) {
    throw new Error("Falta regra de rewrite no vercel.json mapeando /api/(.*) -> /api");
  }
  console.log("✓ Regra de API encontrada:", apiRewrite);

  // Verificar se a regra SPA fallback NÃO engole /api/*
  const spaFallback = rewrites.find((r: any) => r.destination === "/index.html");
  if (!spaFallback) {
    throw new Error("Falta regra de SPA fallback para /index.html no vercel.json");
  }

  // Testar regex do SPA fallback
  const spaRegex = new RegExp("^" + spaFallback.source.replace(/\(\.\*\)/g, ".*") + "$");
  
  const testPaths = [
    { path: "/api/health", shouldMatchSpa: false },
    { path: "/api/ssw/config", shouldMatchSpa: false },
    { path: "/api/ssw/health", shouldMatchSpa: false },
    { path: "/api/ssw/101/query", shouldMatchSpa: false },
    { path: "/api/auth/login", shouldMatchSpa: false },
    { path: "/roteirizacao", shouldMatchSpa: true },
    { path: "/configuracoes", shouldMatchSpa: true },
    { path: "/dashboard", shouldMatchSpa: true },
    { path: "/", shouldMatchSpa: true },
  ];

  for (const { path: testPath, shouldMatchSpa } of testPaths) {
    // Note: in path-to-regexp source like "/((?!api($|/)).*)", we test if regex accepts/rejects
    const regexPattern = new RegExp(`^${spaFallback.source}$`);
    const matches = regexPattern.test(testPath);
    if (matches !== shouldMatchSpa) {
      throw new Error(`Falha no regex de SPA fallback para '${testPath}': esperado match=${shouldMatchSpa}, obtido=${matches}`);
    }
  }
  console.log("✓ Regex do SPA fallback validado com precisão: NENHUMA rota /api/* é engolida pelo /index.html.");

  // 2. Executar servidor Express real e testar Content-Type e Métodos HTTP (GET e POST)
  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // Teste A: GET /api/health -> Deve retornar application/json (NUNCA text/html)
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthContentType = healthRes.headers.get("content-type") || "";
    console.log(`GET /api/health -> Status: ${healthRes.status}, Content-Type: ${healthContentType}`);
    if (healthRes.status !== 200) {
      throw new Error(`GET /api/health retornou status inválido: ${healthRes.status}`);
    }
    if (!healthContentType.includes("application/json")) {
      throw new Error(`GET /api/health retornou Content-Type não JSON: ${healthContentType}`);
    }
    const healthData = await healthRes.json();
    if (healthData.status !== "ok") {
      throw new Error("Payload de health inválido");
    }
    console.log("✓ GET /api/health retornou JSON válido:", healthData);

    // Teste B: GET /api/ssw/config -> Deve retornar application/json (NUNCA text/html com <!doctype)
    const configRes = await fetch(`${baseUrl}/api/ssw/config`);
    const configContentType = configRes.headers.get("content-type") || "";
    console.log(`GET /api/ssw/config -> Status: ${configRes.status}, Content-Type: ${configContentType}`);
    if (configRes.status !== 200) {
      throw new Error(`GET /api/ssw/config retornou status inesperado: ${configRes.status}`);
    }
    if (!configContentType.includes("application/json")) {
      throw new Error(`GET /api/ssw/config retornou Content-Type não JSON: ${configContentType}`);
    }
    const configData = await configRes.json();
    console.log("✓ GET /api/ssw/config retornou JSON válido:", { success: configData.success, configured: configData.configured });

    // Teste C: POST /api/ssw/config -> Deve atingir o backend Express com método POST (NUNCA 405 Method Not Allowed)
    const postConfigRes = await fetch(`${baseUrl}/api/ssw/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usuario: "TESTE_USER",
        senha: "TESTE_PASSWORD",
        unid: "VGA"
      })
    });
    const postContentType = postConfigRes.headers.get("content-type") || "";
    console.log(`POST /api/ssw/config -> Status: ${postConfigRes.status}, Content-Type: ${postContentType}`);
    if (postConfigRes.status === 405) {
      throw new Error("POST /api/ssw/config retornou 405 Method Not Allowed!");
    }
    if (!postContentType.includes("application/json")) {
      throw new Error(`POST /api/ssw/config retornou Content-Type não JSON: ${postContentType}`);
    }
    const postData = await postConfigRes.json();
    if (!postData.success) {
      throw new Error(`POST /api/ssw/config falhou: ${postData.error}`);
    }
    console.log("✓ POST /api/ssw/config processado com sucesso pelo handler Express:", postData);

    // Teste D: GET /api/ssw/health -> Retorna JSON controlado
    const sswHealthRes = await fetch(`${baseUrl}/api/ssw/health`);
    const sswHealthContentType = sswHealthRes.headers.get("content-type") || "";
    console.log(`GET /api/ssw/health -> Status: ${sswHealthRes.status}, Content-Type: ${sswHealthContentType}`);
    if (!sswHealthContentType.includes("application/json")) {
      throw new Error(`GET /api/ssw/health retornou Content-Type não JSON: ${sswHealthContentType}`);
    }
    const sswHealthData = await sswHealthRes.json();
    console.log("✓ GET /api/ssw/health retornou JSON válido:", sswHealthData);

    console.log("==================================================================");
    console.log("TODOS OS TESTES DE ROTEAMENTO E PRECEDÊNCIA API PASSARAM COM SUCESSO! 🎯");
    console.log("==================================================================");
  } finally {
    server.close();
  }
}

runRoutingRegressionTest().catch((err) => {
  console.error("❌ Falha no teste de roteamento:", err);
  process.exit(1);
});
