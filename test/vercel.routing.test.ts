import { createApp } from "../server/createApp";
import http from "http";
import fs from "fs";
import path from "path";

async function runRoutingRegressionTest() {
  console.log("--- Iniciando Teste de Validação de Roteamento Vercel (Precedência Oficial) ---");

  // 1. Validar vercel.json
  const vercelJsonPath = path.resolve(__dirname, "../vercel.json");
  if (!fs.existsSync(vercelJsonPath)) {
    throw new Error("Arquivo vercel.json não encontrado!");
  }
  const rawVercel = fs.readFileSync(vercelJsonPath, "utf-8");
  let vercelConfig: any;
  try {
    vercelConfig = JSON.parse(rawVercel);
  } catch (err: any) {
    throw new Error(`Falha ao fazer parse do vercel.json: ${err.message}`);
  }

  const rewrites = vercelConfig.rewrites || [];
  console.log("✓ Regras de rewrite no vercel.json:", JSON.stringify(rewrites, null, 2));

  // Validação: Não permitir regex não suportado (ex: lookaheads/lookbehinds inline como (?!) ou (?<=))
  for (const rule of rewrites) {
    if (/\(\?[=!<!]/.test(rule.source)) {
      throw new Error(`Regra de rewrite contém sintaxe de regex não suportada pela Vercel: ${rule.source}`);
    }
  }
  console.log("✓ Sintaxe Vercel validada: Nenhum regex de lookahead/lookbehind não suportado detectado.");

  // Validação: A regra de API deve vir ANTES do SPA fallback
  const apiIndex = rewrites.findIndex((r: any) => r.source.startsWith("/api") && r.destination === "/api");
  const spaIndex = rewrites.findIndex((r: any) => r.destination === "/index.html");

  if (apiIndex === -1) {
    throw new Error("Falta regra de rewrite no vercel.json mapeando /api/:path* -> /api");
  }
  if (spaIndex === -1) {
    throw new Error("Falta regra de SPA fallback para /index.html no vercel.json");
  }
  if (apiIndex >= spaIndex) {
    throw new Error(`Precedência incorreta: Regra da API (índice ${apiIndex}) deve ser definida antes do SPA fallback (índice ${spaIndex})`);
  }
  console.log(`✓ Precedência confirmada: API (/api/:path*) no índice ${apiIndex} precede SPA fallback (/:path*) no índice ${spaIndex}.`);

  // Validação: Entrypoint da Function Serverless existe
  const apiEntrypoint = path.resolve(__dirname, "../api/index.cjs");
  if (!fs.existsSync(apiEntrypoint)) {
    throw new Error("Entrypoint da API (api/index.cjs) não encontrado!");
  }
  console.log("✓ Entrypoint Serverless api/index.cjs existe e está registrado para execução pelo @vercel/node.");

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
