"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const cors_1 = __importDefault(require("cors"));
const logger_1 = require("./utils/logger");
const errorHandler_1 = require("./middleware/errorHandler");
// Routes
const auth_1 = __importDefault(require("./routes/auth"));
const clientes_1 = __importDefault(require("./routes/clientes"));
const apolices_1 = __importDefault(require("./routes/apolices"));
const sinistros_1 = __importDefault(require("./routes/sinistros"));
const financeiro_1 = __importDefault(require("./routes/financeiro"));
const whatsapp_1 = __importDefault(require("./routes/whatsapp"));
const ia_1 = __importDefault(require("./routes/ia"));
const importacao_1 = __importDefault(require("./routes/importacao"));
const agenda_1 = __importDefault(require("./routes/agenda"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const cotacoes_1 = __importDefault(require("./routes/cotacoes"));
const propostas_1 = __importDefault(require("./routes/propostas"));
const endossos_1 = __importDefault(require("./routes/endossos"));
const alertas_1 = __importDefault(require("./routes/alertas"));
// Novos módulos separados
const consorcios_1 = __importDefault(require("./routes/consorcios"));
const planos_saude_1 = __importDefault(require("./routes/planos-saude"));
const financiamentos_1 = __importDefault(require("./routes/financiamentos"));
const produtos_1 = __importDefault(require("./routes/produtos"));
const pipeline_1 = __importDefault(require("./routes/pipeline"));
// Job Scheduler
const scheduler_1 = require("./jobs/scheduler");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Security middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false,
}));
// CORS
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
}));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: "Muitas requisições deste IP, tente novamente em 15 minutos",
});
app.use("/api/", limiter);
// Body parser
app.use(express_1.default.json({ limit: "50mb" }));
app.use(express_1.default.urlencoded({ limit: "50mb", extended: true }));
// Request logging
app.use((req, res, next) => {
    logger_1.logger.info(`${req.method} ${req.path}`, {
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
app.use("/api/auth", auth_1.default);
app.use("/api/clientes", clientes_1.default);
app.use("/api/apolices", apolices_1.default);
app.use("/api/sinistros", sinistros_1.default);
app.use("/api/financeiro", financeiro_1.default);
app.use("/api/whatsapp", whatsapp_1.default);
app.use("/api/ia", ia_1.default);
app.use("/api/importacao", importacao_1.default);
app.use("/api/agenda", agenda_1.default);
app.use("/api/dashboard", dashboard_1.default);
app.use("/api/cotacoes", cotacoes_1.default);
app.use("/api/propostas", propostas_1.default);
app.use("/api/endossos", endossos_1.default);
app.use("/api/alertas", alertas_1.default);
// Novos módulos separados
app.use("/api/consorcios", consorcios_1.default);
app.use("/api/planos-saude", planos_saude_1.default);
app.use("/api/financiamentos", financiamentos_1.default);
app.use("/api/produtos", produtos_1.default);
app.use("/api/pipeline", pipeline_1.default);
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: "Endpoint não encontrado" });
});
// Error handler (must be last)
app.use(errorHandler_1.errorHandler);
// Start server
app.listen(PORT, () => {
    logger_1.logger.info(`Servidor rodando em porta ${PORT}`);
    logger_1.logger.info(`Environment: ${process.env.NODE_ENV}`);
    logger_1.logger.info(`Frontend URL: ${process.env.FRONTEND_URL}`);
    // Iniciar scheduler de alertas automaticos
    (0, scheduler_1.iniciarScheduler)();
});
exports.default = app;
