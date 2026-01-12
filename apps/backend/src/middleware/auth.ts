import { supabase } from "../services/supabase";
import { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler";

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError("Token de autenticação não fornecido", 401);
    }

    const token = authHeader.substring(7);

    // Validar token diretamente com o Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new AppError("Token inválido ou expirado", 401);
    }

    // Buscar role do usuário na tabela usuarios (opcional, se role for estática, mas seguro confirmar)
    const { data: userData } = await supabase
      .from("usuarios")
      .select("role")
      .eq("id", user.id)
      .single();

    req.userId = user.id;
    // req.userRole = user.app_metadata?.role || 'user'; // Supabase roles padrão
    req.userRole = userData?.role || "corretor";

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError("Falha na autenticação", 401));
    }
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole) {
      return next(new AppError("Não autenticado", 401));
    }

    if (!roles.includes(req.userRole!)) {
      return next(new AppError("Sem permissão para acessar este recurso", 403));
    }

    next();
  };
};
