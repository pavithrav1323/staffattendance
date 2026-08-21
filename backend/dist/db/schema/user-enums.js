import { pgEnum } from "drizzle-orm/pg-core";
export const userRoleEnum = pgEnum("user_role", [
    "PROGRAM_OWNER",
    "MASTER_ADMIN",
    "ADMIN",
    "STAFF",
]);
export const userStatusEnum = pgEnum("user_status", [
    "PENDING",
    "APPROVED",
    "REJECTED",
    "DISABLED",
]);
//# sourceMappingURL=user-enums.js.map