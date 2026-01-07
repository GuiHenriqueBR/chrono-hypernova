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

// Job Scheduler
import { iniciarScheduler } from "./jobs/scheduler";

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Muitas requisições deste IP, tente novamente em 15 minutos",
});
app.use("/api/", limiter);

// Body parser
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });
  next();
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint não encontrado" });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Servidor rodando em porta ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  logger.info(`Frontend URL: ${process.env.FRONTEND_URL}`);

  // Iniciar scheduler de alertas automaticos
  iniciarScheduler();
});

export default app;
