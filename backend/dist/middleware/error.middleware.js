import { AppError } from "../utils/app-error.js";
export const errorHandler = (error, _req, res, _next) => {
    if (error instanceof AppError) {
        const response = {
            success: false,
            message: error.message,
        };
        if (error.code) {
            response.code = error.code;
        }
        if (error.data) {
            response.data = error.data;
        }
        res.status(error.statusCode).json(response);
        return;
    }
    console.error(error);
    res.status(500).json({
        success: false,
        message: "Internal server error",
    });
};
//# sourceMappingURL=error.middleware.js.map