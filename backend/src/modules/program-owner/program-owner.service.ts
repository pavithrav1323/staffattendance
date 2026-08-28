import { and, eq, ilike, inArray, sql } from "drizzle-orm";

import { db } from "../../db/connection.js";
import { attendance } from "../../db/schema/attendance.js";
import { companies } from "../../db/schema/companies.js";
import { departments } from "../../db/schema/departments.js";
import { users } from "../../db/schema/users.js";
import { workLocations } from "../../db/schema/work-locations.js";

import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { AppError } from "../../utils/app-error.js";
import { hashPassword } from "../../utils/password.js";
import {
  normalizeEmail,
  normalizeEmployeeId,
  normalizeCompanyCode,
} from "../../utils/normalization.js";
import type { CreateMasterAdminInput } from "./program-owner.schema.js";

type AuthUser = NonNullable<AuthRequest["user"]>;

/**
 * Create Master Admin
 */
export async function createMasterAdmin(
  _authUser: AuthUser,
  input: CreateMasterAdminInput
) {
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

    let companyId: string;

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
    } else {
      // Company exists - check if it already has a Master Admin
      const [existingMasterAdmin] = await tx
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.role, 'MASTER_ADMIN'),
            eq(users.companyId, company.id)
          )
        )
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
      .where(
        and(
          eq(users.companyId, companyId),
          ilike(users.employeeId, normalizedEmployeeId)
        )
      )
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
export async function getMasterAdmins(_authUser: AuthUser) {
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
export async function activateMasterAdmin(
  _authUser: AuthUser,
  userId: string
) {
  const [masterAdmin] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(
      and(
        eq(users.id, userId),
        eq(users.role, "MASTER_ADMIN")
      )
    )
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
export async function deactivateMasterAdmin(
  _authUser: AuthUser,
  userId: string
) {
  const [masterAdmin] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(
      and(
        eq(users.id, userId),
        eq(users.role, "MASTER_ADMIN")
      )
    )
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
export async function deleteMasterAdmin(
  _authUser: AuthUser,
  userId: string
) {
  const [masterAdmin] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(
      and(
        eq(users.id, userId),
        eq(users.role, "MASTER_ADMIN")
      )
    )
    .limit(1);

  if (!masterAdmin) {
    throw new AppError(404, "Master Admin not found");
  }

  await db.delete(users).where(eq(users.id, userId));

  return { success: true };
}

/**
 * Get all companies with summary statistics
 */
export async function getCompanies(_authUser: AuthUser) {
  const allCompanies = await db
    .select({
      id: companies.id,
      companyCode: companies.companyCode,
      companyName: companies.companyName,
      email: companies.email,
      phone: companies.phone,
      isActive: companies.isActive,
      createdAt: companies.createdAt,
    })
    .from(companies)
    .orderBy(companies.companyName);

  if (allCompanies.length === 0) {
    return [];
  }

  const companyIds = allCompanies.map((c) => c.id);

  const counts = await db
    .select({
      companyId: users.companyId,
      masterAdminCount: sql<number>`count(case when ${users.role} = 'MASTER_ADMIN' then 1 end)::int`.as(
        "masterAdminCount"
      ),
      staffCount: sql<number>`count(case when ${users.role} = 'STAFF' then 1 end)::int`.as(
        "staffCount"
      ),
    })
    .from(users)
    .where(inArray(users.companyId, companyIds))
    .groupBy(users.companyId);

  const masterAdmins = await db
    .select({
      companyId: users.companyId,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .where(
      and(
        eq(users.role, "MASTER_ADMIN"),
        inArray(users.companyId, companyIds)
      )
    )
    .orderBy(users.createdAt);

  const countMap = new Map(
    counts.map((c) => [
      c.companyId,
      { masterAdminCount: c.masterAdminCount, staffCount: c.staffCount },
    ])
  );

  const adminMap = new Map(
    masterAdmins.map((m) => [m.companyId, m])
  );

  return allCompanies.map((company) => {
    const stats = countMap.get(company.id) || {
      masterAdminCount: 0,
      staffCount: 0,
    };
    const admin = adminMap.get(company.id);

    return {
      ...company,
      status: company.isActive ? "ACTIVE" : "INACTIVE",
      masterAdminCount: stats.masterAdminCount,
      staffCount: stats.staffCount,
      adminName: admin?.name || null,
      adminEmail: admin?.email || null,
    };
  });
}

/**
 * Get detailed information for a single company
 */
export async function getCompanyDetails(
  _authUser: AuthUser,
  companyId: string
) {
  const [company] = await db
    .select({
      id: companies.id,
      companyCode: companies.companyCode,
      companyName: companies.companyName,
      email: companies.email,
      phone: companies.phone,
      timezone: companies.timezone,
      isActive: companies.isActive,
      createdAt: companies.createdAt,
    })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  if (!company) {
    throw new AppError(404, "Company not found");
  }

  const masterAdmins = await db
    .select({
      id: users.id,
      employeeId: users.employeeId,
      name: users.name,
      email: users.email,
      status: users.status,
    })
    .from(users)
    .where(
      and(
        eq(users.companyId, companyId),
        eq(users.role, "MASTER_ADMIN")
      )
    )
    .orderBy(users.name);

  const staffCount = await db
    .select({
      count: sql<number>`count(*)::int`.as("count"),
    })
    .from(users)
    .where(
      and(
        eq(users.companyId, companyId),
        eq(users.role, "STAFF")
      )
    )
    .then((rows) => rows[0]?.count || 0);

  const departmentList = await db
    .select({
      id: departments.id,
      name: departments.name,
      code: departments.code,
    })
    .from(departments)
    .where(eq(departments.companyId, companyId));

  return {
    company,
    status: company.isActive ? "ACTIVE" : "INACTIVE",
    admin: masterAdmins[0] || null,
    masterAdmins,
    staffCount,
    departments: departmentList,
  };
}

/**
 * Permanently delete a company and all associated data
 */
export async function deleteCompany(
  _authUser: AuthUser,
  companyId: string
) {
  const [company] = await db
    .select({ id: companies.id, companyName: companies.companyName })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  if (!company) {
    throw new AppError(404, "Company not found");
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(attendance)
      .where(eq(attendance.companyId, companyId));

    await tx
      .delete(users)
      .where(eq(users.companyId, companyId));

    await tx
      .delete(workLocations)
      .where(eq(workLocations.companyId, companyId));

    await tx
      .delete(departments)
      .where(eq(departments.companyId, companyId));

    await tx
      .delete(companies)
      .where(eq(companies.id, companyId));
  });

  return {
    success: true,
    message: "Company and all associated records deleted successfully",
  };
}
