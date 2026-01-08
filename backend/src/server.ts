import "dotenv/config";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";

import { logger } from "./utils/logger";
import { errorHandler } from "./middleware/errorHandler";

// Routes
import authRoutes from "./routes/auth";
import clienteRoutes from "./routes/clientes";
import apoliceRoutes from "./routes/apolices";
import sinistroRoutes from "./routes/sinistros";
import financeiroRoutes from "./routes/financeiro";
import whatsappRoutes from "./routes/whatsapp";
import iaRoutes from "./routes/ia";
import importacaoRoutes from "./routes/importacao";
import agendaRoutes from "./routes/agenda";
import dashboardRoutes from "./routes/dashboard";
import cotacaoRoutes from "./routes/cotacoes";
import propostaRoutes from "./routes/propostas";
import endossoRoutes from "./routes/endossos";
import alertasRoutes from "./routes/alertas";
// Novos módulos separados
import consorcioRoutes from "./routes/consorcios";
import planoSaudeRoutes from "./routes/planos-saude";
import financiamentoRoutes from "./routes/financiamentos";
import produtoRoutes from "./routes/produtos";
import pipelineRoutes from "./routes/pipeline";
import adminRoutes from "./routes/admin";

// Job Scheduler
import { iniciarScheduler } from "./jobs/scheduler";

const app = express();
app.set("trust proxy", 1); // Trust first proxy (Railway/Nginx)
const PORT = process.env.PORT || 3001;

// Request logging - Early logging to capture all requests
app.use((req, res, next) => {
  logger.info(`[INCOMING] ${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get("user-agent"),
    origin: req.get("origin"),
  });
  next();
});

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// CORS
// Permitir múltiplas origens ou * para debug inicial se necessário
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:5173",
  "https://chrono-hypernova-ix8qfbbv1-guihenriquebrs-projects.vercel.app",
  "https://chrono-hypernova.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      // Durante debug, vamos ser mais permissivos, mas idealmente filtrar
      // if (allowedOrigins.indexOf(origin) === -1) { ... }
      callback(null, true);
    },
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Aumentado para debug/teste
  message: "Muitas requisições deste IP, tente novamente em 15 minutos",
});
// Aplicar rate limit em /api
app.use("/api/", limiter);

// Body parser
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    port: PORT,
  });
});

// Root API check
app.get("/api", (req, res) => {
  res.json({
    message: "API Root is accessible",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/clientes", clienteRoutes);
app.use("/api/apolices", apoliceRoutes);
app.use("/api/sinistros", sinistroRoutes);
app.use("/api/financeiro", financeiroRoutes);
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/ia", iaRoutes);
app.use("/api/importacao", importacaoRoutes);
app.use("/api/agenda", agendaRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/cotacoes", cotacaoRoutes);
app.use("/api/propostas", propostaRoutes);
app.use("/api/endossos", endossoRoutes);
app.use("/api/alertas", alertasRoutes);
// Novos módulos separados
app.use("/api/consorcios", consorcioRoutes);
app.use("/api/planos-saude", planoSaudeRoutes);
app.use("/api/financiamentos", financiamentoRoutes);
app.use("/api/produtos", produtoRoutes);
app.use("/api/pipeline", pipelineRoutes);
app.use("/api/admin", adminRoutes);

// 404 handler
app.use((req, res) => {
  logger.warn(`[404] Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    error: "Endpoint não encontrado",
    path: req.path,
    method: req.method,
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Debug endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Backend is running!",
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`=========================================`);
  logger.info(`🚀 CHRONO BACKEND EXPRESS STARTING v2.0`);
  logger.info(`=========================================`);
  logger.info(`Servidor rodando em porta ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  logger.info(`Frontend URL: ${process.env.FRONTEND_URL}`);

  // Iniciar scheduler de alertas automaticos
  iniciarScheduler();
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err: Error) => {
  logger.error(`UNHANDLED REJECTION! 💥 Shutting down...`, {
    name: err.name,
    message: err.message,
    stack: err.stack,
  });
  // Graceful shutdown
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", (err: Error) => {
  logger.error(`UNCAUGHT EXCEPTION! 💥 Shutting down...`, {
    name: err.name,
    message: err.message,
    stack: err.stack,
  });
  process.exit(1);
});

export default app;
