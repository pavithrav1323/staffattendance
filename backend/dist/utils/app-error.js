export class AppError extends Error {
    statusCode;
    code;
    data;
    constructor(statusCode, message, code, data) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.data = data;
    }
}
//# sourceMappingURL=app-error.js.map