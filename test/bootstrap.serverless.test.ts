import app from "../server/vercel";
import http from "http";

async function run() {
  const server = http.createServer(app);
  
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });
  
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;
  
  try {
    console.log("Testing GET /api/health via api/index export");
    const healthRes = await fetch(`${baseUrl}/api/health`);
    console.log("Health status:", healthRes.status);
    if (healthRes.status !== 200) {
      throw new Error(`Health check failed with status: ${healthRes.status}`);
    }
    const healthBody = await healthRes.json();
    console.log("Health response:", JSON.stringify(healthBody));

    console.log("Testing GET /api/ssw/config via api/index export");
    const configRes = await fetch(`${baseUrl}/api/ssw/config`);
    console.log("Config status:", configRes.status);
    if (configRes.status === 500) {
      throw new Error(`Config check crashed with status: 500`);
    }

    console.log("Serverless Bootstrap & Contract tests passed successfully!");
  } finally {
    server.close();
  }
}

run().catch((err) => {
  console.error("Bootstrap test failed:", err);
  process.exit(1);
});

