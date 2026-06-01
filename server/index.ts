import express, { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./simpleRoutes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import dotenv from "dotenv";

// ---------- 1️⃣ Load environment variables ----------
// Load local `.env` when present. In production, real env vars still win (override=false).
dotenv.config({ override: false });

// ---------- 2️⃣ Check essential env variables ----------
const requiredEnv = ["BREVO_API_KEY", "EMAIL_FROM", "EMAIL_FROM_NAME"];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  console.error(`❌ Missing environment variables: ${missingEnv.join(", ")}`);
  process.exit(1); // stop server if critical envs are missing
}

// ---------- 3️⃣ Setup Express ----------
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ---------- 4️⃣ CORS & Security Headers ----------
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  if (process.env.NODE_ENV === "development") {
    res.removeHeader("Content-Security-Policy");
    res.removeHeader("Content-Security-Policy-Report-Only");
  }

  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ---------- 5️⃣ Request Logging ----------
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      if (logLine.length > 120) logLine = logLine.slice(0, 119) + "…";
      log(logLine);
    }
  });

  next();
});

// ---------- 6️⃣ Start Server ----------
(async () => {
  const server = await registerRoutes(app);

  // Global Error Handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error(`❌ Server Error: ${message}`);
    res.status(status).json({ message });
  });

  // Vite Setup vs Static Serving
  app.use("/api", (_req, res) => {
    res.status(404).json({ message: "API route not found" });
  });

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = process.env.PORT || 5000;
  const isReplit = process.env.REPLIT_ENVIRONMENT || process.env.REPLIT_DOMAINS;
  // On some macOS setups, binding to "localhost" may resolve to IPv6 (::1) and fail with EPERM.
  // Default to IPv4 loopback for local dev unless explicitly overridden.
  const host = process.env.HOST || (isReplit ? "0.0.0.0" : "127.0.0.1");

  server.listen({ port: Number(port), host }, () => {
    log(`🚀 ReferralMe Server running on ${host}:${port}`);

    // ✅ Production-ready Brevo check
    log(`✅ BREVO_API_KEY loaded: ${!!process.env.BREVO_API_KEY}`);
    log(`✅ EMAIL_FROM loaded: ${!!process.env.EMAIL_FROM}`);
    log(`✅ EMAIL_FROM_NAME loaded: ${!!process.env.EMAIL_FROM_NAME}`);
  });
})();
