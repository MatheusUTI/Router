const http = require("http");
const path = require("path");
const fs = require("fs");

async function runRuntimeValidation() {
  console.log("--- Iniciando Validação de Runtime CommonJS (Vercel Serverless Entrypoint) ---");

  const entrypointPath = path.resolve(__dirname, "../api/index.js");
  if (!fs.existsSync(entrypointPath)) {
    throw new Error(`Artefato compilado para Vercel não encontrado em: ${entrypointPath}. Execute 'npm run build' antes do teste.`);
  }

  // Validação 1: O arquivo NÃO pode conter 'import ' ou 'export ' no topo do código
  const rawContent = fs.readFileSync(entrypointPath, "utf-8");
  if (/^import\s+/m.test(rawContent) || /^export\s+default/m.test(rawContent)) {
    throw new Error("O arquivo api/index.js contém instruções ESM (import/export). Deve ser um bundle CommonJS puro.");
  }
  console.log("✓ Sintaxe: api/index.js validado como bundle CommonJS (sem imports ESM no arquivo compilado).");

  // Validação 2: Require nativo do Node.js
  let app;
  try {
    app = require(entrypointPath);
  } catch (err) {
    throw new Error(`Falha no require() nativo do Node.js sobre api/index.js: ${err.message}`);
  }

  const handler = typeof app === "function" ? app : (app && typeof app.default === "function" ? app.default : null);
  if (!handler) {
    throw new Error(`O export de api/index.js não é uma função Express válida. Recebido tipo: ${typeof app}`);
  }
  console.log("✓ Compatibilidade Node.js: require('../api/index.js') executado com sucesso e exporta app Express.");

  // Validação 3: Execução HTTP real em servidor nativo
  const server = http.createServer(handler);
  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // Teste GET /api/health
    const healthRes = await fetch(`${baseUrl}/api/health`);
    console.log(`GET /api/health -> Status: ${healthRes.status}`);
    if (healthRes.status !== 200) {
      throw new Error(`GET /api/health retornou status inesperado: ${healthRes.status}`);
    }
    const healthData = await healthRes.json();
    console.log("Health payload:", healthData);

    // Teste GET /api/ssw/config
    const configRes = await fetch(`${baseUrl}/api/ssw/config`);
    console.log(`GET /api/ssw/config -> Status: ${configRes.status}`);
    if (configRes.status === 500) {
      throw new Error(`GET /api/ssw/config retornou erro 500 fatal.`);
    }
    const configData = await configRes.json();
    console.log("Config payload (status):", { success: configData.success, configured: configData.configured });

    console.log("======================================================");
    console.log("VALIDAÇÃO DE RUNTIME VERCEL CJS PASSOU COM SUCESSO! 🎯");
    console.log("======================================================");
  } finally {
    server.close();
  }
}

runRuntimeValidation().catch((err) => {
  console.error("❌ Falha na validação do runtime Vercel CJS:", err);
  process.exit(1);
});
