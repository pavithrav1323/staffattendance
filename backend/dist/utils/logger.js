const isDev = process.env.NODE_ENV !== "production";
export const logger = {
    info: (message, ...args) => {
        if (isDev) {
            console.log(`[INFO] ${message}`, ...args);
        }
    },
    warn: (message, ...args) => {
        console.warn(`[WARN] ${message}`, ...args);
    },
    error: (message, ...args) => {
        console.error(`[ERROR] ${message}`, ...args);
    },
    debug: (message, ...args) => {
        if (isDev) {
            console.debug(`[DEBUG] ${message}`, ...args);
        }
    },
};
//# sourceMappingURL=logger.js.map