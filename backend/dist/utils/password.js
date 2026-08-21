import bcrypt from "bcrypt";
const SALT_ROUNDS = 12;
export function validatePassword(password) {
    if (password.length < 8)
        return false;
    if (!/[A-Z]/.test(password))
        return false;
    if (!/[a-z]/.test(password))
        return false;
    if (!/[0-9]/.test(password))
        return false;
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
        return false;
    return true;
}
export function hashPassword(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
}
export function comparePassword(password, passwordHash) {
    return bcrypt.compare(password, passwordHash);
}
//# sourceMappingURL=password.js.map