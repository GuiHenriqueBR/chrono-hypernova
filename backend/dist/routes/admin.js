"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../services/supabase");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
// Schema for creating a new user
const createUserSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    nome: zod_1.z.string().min(2),
    role: zod_1.z.enum(["admin", "corretor", "assistente"]),
});
// List all users
router.get("/users", auth_1.authenticate, (0, auth_1.authorize)("admin"), async (req, res, next) => {
    try {
        const { data: users, error } = await supabase_1.supabase
            .from("usuarios")
            .select("*")
            .order("nome");
        if (error)
            throw new Error(error.message);
        res.json(users);
    }
    catch (error) {
        next(error);
    }
});
// Create a new user (Auth + Public Profile)
router.post("/users", auth_1.authenticate, (0, auth_1.authorize)("admin"), async (req, res, next) => {
    try {
        const { email, password, nome, role } = createUserSchema.parse(req.body);
        // 1. Create Auth User using Admin API
        const { data: authData, error: authError } = await supabase_1.supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        });
        if (authError) {
            if (authError.message.includes("already registered")) {
                throw new errorHandler_1.AppError("E-mail já cadastrado (Auth)", 400);
            }
            throw new errorHandler_1.AppError(`Erro ao criar usuário: ${authError.message}`, 500);
        }
        const userId = authData.user.id;
        // 2. Create Public Profile
        const { error: profileError } = await supabase_1.supabase.from("usuarios").insert({
            id: userId,
            email,
            nome,
            role,
            ativo: true,
        });
        if (profileError) {
            // Rollback auth user creation if profile fails?
            // Ideally yes, but Supabase doesn't support transactions across Auth/Public easily via client.
            // We will try to delete auth user.
            await supabase_1.supabase.auth.admin.deleteUser(userId);
            if (profileError.code === "23505") {
                // Unique violation
                throw new errorHandler_1.AppError("Usuário já existe na base de dados.", 400);
            }
            throw new errorHandler_1.AppError(`Erro ao criar perfil: ${profileError.message}`, 500);
        }
        res.status(201).json({
            message: "Usuário criado com sucesso",
            user: { id: userId, email, nome, role },
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            next(new errorHandler_1.AppError("Dados inválidos: " + error.errors.map((e) => e.message).join(", "), 400));
        }
        else {
            next(error);
        }
    }
});
exports.default = router;
