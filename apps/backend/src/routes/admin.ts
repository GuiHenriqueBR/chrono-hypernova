import { Router, Request, Response } from "express";
import { supabase } from "../services/supabase";
import { authenticate, authorize } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { z } from "zod";

const router = Router();

// Schema for creating a new user
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  nome: z.string().min(2),
  role: z.enum(["admin", "corretor", "assistente"]),
});

// List all users
router.get(
  "/users",
  authenticate,
  authorize("admin"),
  async (req: Request, res: Response, next) => {
    try {
      const { data: users, error } = await supabase
        .from("usuarios")
        .select("*")
        .order("nome");

      if (error) throw new Error(error.message);

      res.json(users);
    } catch (error) {
      next(error);
    }
  }
);

// Create a new user (Auth + Public Profile)
router.post(
  "/users",
  authenticate,
  authorize("admin"),
  async (req: Request, res: Response, next) => {
    try {
      const { email, password, nome, role } = createUserSchema.parse(req.body);

      // 1. Create Auth User using Admin API
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

      if (authError) {
        if (authError.message.includes("already registered")) {
          throw new AppError("E-mail já cadastrado (Auth)", 400);
        }
        throw new AppError(`Erro ao criar usuário: ${authError.message}`, 500);
      }

      const userId = authData.user.id;

      // 2. Create Public Profile
      const { error: profileError } = await supabase.from("usuarios").insert({
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
        await supabase.auth.admin.deleteUser(userId);

        if (profileError.code === "23505") {
          // Unique violation
          throw new AppError("Usuário já existe na base de dados.", 400);
        }
        throw new AppError(
          `Erro ao criar perfil: ${profileError.message}`,
          500
        );
      }

      res.status(201).json({
        message: "Usuário criado com sucesso",
        user: { id: userId, email, nome, role },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(
          new AppError(
            "Dados inválidos: " + error.errors.map((e) => e.message).join(", "),
            400
          )
        );
      } else {
        next(error);
      }
    }
  }
);

export default router;
