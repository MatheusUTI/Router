/**
 * Teste de Regressão de Runtime CommonJS Nativo para o Entrypoint Serverless Vercel
 * Executa em Node.js puro sem tsx para garantir 100% de compatibilidade CJS.
 */
const path = require("path");
const fs = require("fs");
const http = require("http");

async function testRuntimeCommonJS() {
  console.log("--- Iniciando Teste de Validação de Artefato CommonJS (api/index.cjs) ---");

  const artifactPath = path.resolve(__dirname, "../api/index.cjs");
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artefato runtime ${artifactPath} não encontrado! Execute 'npm run build' primeiro.`);
  }

  const content = fs.readFileSync(artifactPath, "utf-8");

  // 1. Validar que não existem instruções ESM de alto nível (import / export)
  const esmImportMatch = /(?:^|\n)\s*import\s+[^;]+from/m.test(content) || /(?:^|\n)\s*import\s*["']/m.test(content);
  const esmExportMatch = /(?:^|\n)\s*export\s+(?:default|const|let|var|function|class|\{)/m.test(content);

  if (esmImportMatch) {
    throw new Error("VIOLAÇÃO: O arquivo api/index.cjs contém declarações ESM 'import'!");
  }
  if (esmExportMatch) {
    throw new Error("VIOLAÇÃO: O arquivo api/index.cjs contém declarações ESM 'export'!");
  }
  console.log("✓ Validação estática: api/index.cjs NÃO contém declarações ESM (import/export).");

  // 2. Carregar via require nativo
  let app;
  try {
    app = require(artifactPath);
  } catch (err) {
    throw new Error(`Falha ao carregar api/index.cjs via require() nativo: ${err.message}`);
  }

  // Se o módulo exportou objeto com .default, resolver
  if (app && app.default) {
    app = app.default;
  }

  if (typeof app !== "function" || typeof app.handle !== "function") {
    throw new Error(`api/index.cjs não exportou um app Express válido! Tipo recebido: ${typeof app}`);
  }
  console.log("✓ Validação dinâmica: api/index.cjs carregado com sucesso via require() nativo e é um Express handler válido.");

  // 3. Subir servidor HTTP e testar endpoints críticos com verbos GET e POST
  const server = http.createServer(app);

  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // GET /api/health
    const healthRes = await fetch(`${baseUrl}/api/health`);
    if (healthRes.status !== 200) {
      throw new Error(`GET /api/health retornou status ${healthRes.status}`);
    }
    const healthJson = await healthRes.json();
    if (healthJson.status !== "ok") {
      throw new Error("GET /api/health retornou payload inválido");
    }
    console.log("✓ GET /api/health retornou 200 OK JSON:", healthJson);

    // GET /api/ssw/config
    const configRes = await fetch(`${baseUrl}/api/ssw/config`);
    if (configRes.status !== 200) {
      throw new Error(`GET /api/ssw/config retornou status ${configRes.status}`);
    }
    const configJson = await configRes.json();
    console.log("✓ GET /api/ssw/config retornou 200 OK JSON:", configJson);

    // POST /api/ssw/config
    const postConfigRes = await fetch(`${baseUrl}/api/ssw/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usuario: "TESTE_CJS",
        senha: "TESTE_PASSWORD",
        unid: "VGA"
      })
    });
    if (postConfigRes.status === 405) {
      throw new Error("POST /api/ssw/config retornou 405 Method Not Allowed!");
    }
    const postConfigJson = await postConfigRes.json();
    if (!postConfigJson.success) {
      throw new Error(`POST /api/ssw/config falhou: ${postConfigJson.error}`);
    }
    console.log("✓ POST /api/ssw/config retornou 200 OK JSON:", postConfigJson.message);

    // GET /api/ssw/health
    const sswHealthRes = await fetch(`${baseUrl}/api/ssw/health`);
    if (sswHealthRes.status !== 200) {
      throw new Error(`GET /api/ssw/health retornou status ${sswHealthRes.status}`);
    }
    const sswHealthJson = await sswHealthRes.json();
    console.log("✓ GET /api/ssw/health retornou 200 OK JSON:", sswHealthJson.health.overallStatus);

    // POST /api/auth/login
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "testuser",
        password: "testpassword"
      })
    });
    // Deve responder status controlado (400, 401 ou 200 com JSON), NUNCA 500 Function Crash
    if (loginRes.status === 500) {
      const errText = await loginRes.text();
      throw new Error(`POST /api/auth/login resultou em erro 500 do servidor: ${errText}`);
    }
    const loginJson = await loginRes.json();
    console.log(`✓ POST /api/auth/login retornou resposta HTTP controlada (Status ${loginRes.status}):`, loginJson);

    console.log("==================================================================");
    console.log("TODAS AS VALIDAÇÕES DE RUNTIME COMMONJS FORAM CONCLUÍDAS COM SUCESSO! 🚀");
    console.log("==================================================================");
  } finally {
    server.close();
  }
}

testRuntimeCommonJS().catch((err) => {
  console.error("❌ Falha no teste de runtime CommonJS:", err);
  process.exit(1);
});
