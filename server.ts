import path from "path";
import express from "express";
import { createServer as createViteServer } from "vite";
import { createApp } from "./server/createApp";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = createApp();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

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
