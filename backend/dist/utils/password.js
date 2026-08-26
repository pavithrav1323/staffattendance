import bcrypt from "bcrypt";
const SALT_ROUNDS = 12;
export function validatePassword(password) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&*!])[A-Za-z\d@#$%^&*!]{7,}$/.test(password);
}
export function hashPassword(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
}
export function comparePassword(password, passwordHash) {
    return bcrypt.compare(password, passwordHash);
}
//# sourceMappingURL=password.js.map