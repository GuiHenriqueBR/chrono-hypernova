"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = void 0;
const supabase_1 = require("../services/supabase");
const errorHandler_1 = require("./errorHandler");
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new errorHandler_1.AppError("Token de autenticação não fornecido", 401);
        }
        const token = authHeader.substring(7);
        // Validar token diretamente com o Supabase
        const { data: { user }, error, } = await supabase_1.supabase.auth.getUser(token);
        if (error || !user) {
            throw new errorHandler_1.AppError("Token inválido ou expirado", 401);
        }
        // Buscar role do usuário na tabela usuarios (opcional, se role for estática, mas seguro confirmar)
        const { data: userData } = await supabase_1.supabase
            .from("usuarios")
            .select("role")
            .eq("id", user.id)
            .single();
        req.userId = user.id;
        // req.userRole = user.app_metadata?.role || 'user'; // Supabase roles padrão
        req.userRole = userData?.role || "corretor";
        next();
    }
    catch (error) {
        if (error instanceof errorHandler_1.AppError) {
            next(error);
        }
        else {
            next(new errorHandler_1.AppError("Falha na autenticação", 401));
        }
    }
};
exports.authenticate = authenticate;
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.userRole) {
            next(new errorHandler_1.AppError("Não autenticado", 401));
        }
        if (!roles.includes(req.userRole)) {
            next(new errorHandler_1.AppError("Sem permissão para acessar este recurso", 403));
        }
        next();
    };
};
exports.authorize = authorize;
