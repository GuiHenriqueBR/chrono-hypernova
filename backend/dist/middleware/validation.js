"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const zod_1 = require("zod");
const errorHandler_1 = require("../middleware/errorHandler");
const validate = (schema) => {
    return (0, errorHandler_1.asyncHandler)(async (req, res, next) => {
        try {
            await schema.parseAsync(req.body);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
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
exports.validate = validate;
