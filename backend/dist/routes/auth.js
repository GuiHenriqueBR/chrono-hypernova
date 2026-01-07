"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supabase_1 = require("../services/supabase");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../utils/logger");
const router = express_1.default.Router();
// Login com Supabase Auth
router.post('/login', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha sao obrigatorios' });
    }
    const { data, error } = await supabase_1.supabase.auth.signInWithPassword({
        email,
        password
    });
    if (error) {
        logger_1.logger.error('Erro no login:', error);
        return res.status(401).json({ error: 'Email ou senha incorretos' });
    }
    // Buscar dados adicionais do usuario
    const { data: userData } = await supabase_1.supabase
        .from('usuarios')
        .select('*')
        .eq('id', data.user.id)
        .single();
    res.json({
        user: {
            id: data.user.id,
            email: data.user.email,
            nome: userData?.nome || data.user.email?.split('@')[0] || 'Usuario',
            role: userData?.role || 'corretor',
            ativo: userData?.ativo ?? true
        },
        token: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at
    });
}));
// Register com Supabase Auth
router.post('/register', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email, password, nome, role = 'corretor' } = req.body;
    if (!email || !password || !nome) {
        return res.status(400).json({ error: 'Email, senha e nome sao obrigatorios' });
    }
    // Criar usuario no Supabase Auth
    const { data, error } = await supabase_1.supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                nome,
                role
            }
        }
    });
    if (error) {
        logger_1.logger.error('Erro no registro:', error);
        return res.status(400).json({ error: error.message });
    }
    // Criar registro na tabela usuarios
    if (data.user) {
        await supabase_1.supabase.from('usuarios').insert({
            id: data.user.id,
            email,
            nome,
            role,
            ativo: true
        });
    }
    res.json({
        message: 'Usuario criado com sucesso',
        user: {
            id: data.user?.id,
            email: data.user?.email,
            nome,
            role
        }
    });
}));
// Logout
router.post('/logout', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        // Supabase nao tem invalidacao de token no server-side
        // O cliente deve remover o token localmente
    }
    const { error } = await supabase_1.supabase.auth.signOut();
    if (error) {
        logger_1.logger.error('Erro no logout:', error);
    }
    res.json({ message: 'Logout realizado com sucesso' });
}));
// Refresh token
router.post('/refresh', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token e obrigatorio' });
    }
    const { data, error } = await supabase_1.supabase.auth.refreshSession({
        refresh_token: refreshToken
    });
    if (error) {
        logger_1.logger.error('Erro ao renovar token:', error);
        return res.status(401).json({ error: 'Token invalido ou expirado' });
    }
    res.json({
        token: data.session?.access_token,
        refreshToken: data.session?.refresh_token,
        expiresAt: data.session?.expires_at
    });
}));
// Verificar token e retornar usuario atual
router.get('/me', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Token nao fornecido' });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase_1.supabase.auth.getUser(token);
    if (error || !user) {
        return res.status(401).json({ error: 'Token invalido' });
    }
    // Buscar dados adicionais
    const { data: userData } = await supabase_1.supabase
        .from('usuarios')
        .select('*')
        .eq('id', user.id)
        .single();
    res.json({
        id: user.id,
        email: user.email,
        nome: userData?.nome || user.email?.split('@')[0] || 'Usuario',
        role: userData?.role || 'corretor',
        ativo: userData?.ativo ?? true
    });
}));
// Solicitar reset de senha
router.post('/forgot-password', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'Email e obrigatorio' });
    }
    const { error } = await supabase_1.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password`
    });
    if (error) {
        logger_1.logger.error('Erro ao solicitar reset de senha:', error);
        return res.status(400).json({ error: error.message });
    }
    res.json({ message: 'Email de recuperacao enviado' });
}));
// Atualizar senha
router.post('/reset-password', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { password } = req.body;
    const authHeader = req.headers.authorization;
    if (!password) {
        return res.status(400).json({ error: 'Nova senha e obrigatoria' });
    }
    if (!authHeader) {
        return res.status(401).json({ error: 'Token nao fornecido' });
    }
    const { error } = await supabase_1.supabase.auth.updateUser({
        password
    });
    if (error) {
        logger_1.logger.error('Erro ao atualizar senha:', error);
        return res.status(400).json({ error: error.message });
    }
    res.json({ message: 'Senha atualizada com sucesso' });
}));
exports.default = router;
