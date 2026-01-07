import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler';

export const validate = (schema: z.ZodSchema) => {
  return asyncHandler(async (req: Request, res: Response, next: Function) => {
    try {
      await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return res.status(400).json({
          error: 'Erro de validação',
          details: formattedErrors,
        });
      }
      next(error);
    }
  });
};
