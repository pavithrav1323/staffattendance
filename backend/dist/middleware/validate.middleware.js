import { AppError } from "../utils/app-error.js";
export function validateBody(schema) {
    return (req, _res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const message = result.error.issues[0]?.message ??
                "Invalid request data";
            return next(new AppError(400, message));
        }
        req.body = result.data;
        next();
    };
}
//# sourceMappingURL=validate.middleware.js.map