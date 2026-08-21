import { and, eq, ilike } from "drizzle-orm";
import { db } from "../../db/connection.js";
import { companies } from "../../db/schema/companies.js";
import { users } from "../../db/schema/users.js";
import { AppError } from "../../utils/app-error.js";
import { hashPassword } from "../../utils/password.js";
import { normalizeEmail, normalizeEmployeeId, normalizeCompanyCode, } from "../../utils/normalization.js";
/**
 * Create Master Admin
 */
export async function createMasterAdmin(_authUser, input) {
    const normalizedCompanyCode = normalizeCompanyCode(input.companyCode);
    const normalizedEmail = normalizeEmail(input.email);
    const normalizedEmployeeId = normalizeEmployeeId(input.employeeId);
    const normalizedCompanyName = input.name.trim();
    // Check email uniqueness first (outside transaction for early validation)
    const [existingUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);
    if (existingUser) {
        throw new AppError(409, "Email already registered");
    }
    // Use transaction to ensure atomic company + master admin creation
    return db.transaction(async (tx) => {
        // Step 1: Check if company exists
        const [company] = await tx
            .select({
            id: companies.id,
            companyCode: companies.companyCode,
        })
            .from(companies)
            .where(eq(companies.companyCode, normalizedCompanyCode))
            .limit(1);
        let companyId;
        if (!company) {
            // Company does not exist - create it
            const [newCompany] = await tx
                .insert(companies)
                .values({
                companyCode: normalizedCompanyCode,
                companyName: input.companyName.trim(),
                timezone: "UTC", // Default timezone, can be made configurable later
                isActive: true,
            })
                .returning({
                id: companies.id,
                companyCode: companies.companyCode,
            });
            companyId = newCompany.id;
        }
        else {
            // Company exists - check if it already has a Master Admin
            const [existingMasterAdmin] = await tx
                .select({ id: users.id })
                .from(users)
                .where(and(eq(users.role, 'MASTER_ADMIN'), eq(users.companyId, company.id)))
                .limit(1);
            if (existingMasterAdmin) {
                throw new AppError(409, "A Master Admin already exists for this company");
            }
            companyId = company.id;
        }
        // Step 2: Check employeeId uniqueness within the company
        const [existingEmployee] = await tx
            .select({ id: users.id })
            .from(users)
            .where(and(eq(users.companyId, companyId), ilike(users.employeeId, normalizedEmployeeId)))
            .limit(1);
        if (existingEmployee) {
            throw new AppError(409, "Employee ID already exists in this company");
        }
        // Step 3: Create Master Admin
        const passwordHash = await hashPassword(input.password);
        const [masterAdmin] = await tx
            .insert(users)
            .values({
            companyId: companyId,
            departmentId: null,
            workLocationId: null,
            employeeId: normalizedEmployeeId,
            name: input.name.trim(),
            email: normalizedEmail,
            phone: input.phone,
            passwordHash,
            role: "MASTER_ADMIN",
            status: "APPROVED",
        })
            .returning({
            id: users.id,
            employeeId: users.employeeId,
            name: users.name,
            email: users.email,
            phone: users.phone,
            status: users.status,
            companyId: users.companyId,
            createdAt: users.createdAt,
        });
        return {
            ...masterAdmin,
            companyCode: normalizedCompanyCode,
        };
    });
}
/**
 * Get company Master Admins
 */
export async function getMasterAdmins(_authUser) {
    return db
        .select({
        id: users.id,
        employeeId: users.employeeId,
        name: users.name,
        email: users.email,
        phone: users.phone,
        status: users.status,
        companyId: users.companyId,
        companyCode: companies.companyCode,
        companyName: companies.companyName,
        createdAt: users.createdAt,
    })
        .from(users)
        .leftJoin(companies, eq(users.companyId, companies.id))
        .where(eq(users.role, "MASTER_ADMIN"))
        .orderBy(users.createdAt);
}
/**
 * Activate Master Admin
 */
export async function activateMasterAdmin(_authUser, userId) {
    const [masterAdmin] = await db
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(and(eq(users.id, userId), eq(users.role, "MASTER_ADMIN")))
        .limit(1);
    if (!masterAdmin) {
        throw new AppError(404, "Master Admin not found");
    }
    await db
        .update(users)
        .set({ status: "APPROVED", updatedAt: new Date() })
        .where(eq(users.id, userId));
    return { success: true };
}
/**
 * Deactivate Master Admin
 */
export async function deactivateMasterAdmin(_authUser, userId) {
    const [masterAdmin] = await db
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(and(eq(users.id, userId), eq(users.role, "MASTER_ADMIN")))
        .limit(1);
    if (!masterAdmin) {
        throw new AppError(404, "Master Admin not found");
    }
    await db
        .update(users)
        .set({ status: "DISABLED", updatedAt: new Date() })
        .where(eq(users.id, userId));
    return { success: true };
}
/**
 * Delete Master Admin
 */
export async function deleteMasterAdmin(_authUser, userId) {
    const [masterAdmin] = await db
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(and(eq(users.id, userId), eq(users.role, "MASTER_ADMIN")))
        .limit(1);
    if (!masterAdmin) {
        throw new AppError(404, "Master Admin not found");
    }
    await db.delete(users).where(eq(users.id, userId));
    return { success: true };
}
//# sourceMappingURL=program-owner.service.js.map