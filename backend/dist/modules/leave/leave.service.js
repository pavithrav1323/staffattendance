import { db } from "../../db/connection.js";
import { leaveRequests } from "../../db/schema/leave-requests.js";
import { and, desc, eq, gte, lte, or, } from "drizzle-orm";
5;
import { AppError } from "../../utils/app-error.js";
export async function getMyLeaveRequests(authUser) {
    if (!authUser.companyId) {
        throw new AppError(403, "Company context is required");
    }
    const leaveList = await db
        .select({
        id: leaveRequests.id,
        leaveType: leaveRequests.leaveType,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        reason: leaveRequests.reason,
        status: leaveRequests.status,
        reviewedBy: leaveRequests.reviewedBy,
        reviewedAt: leaveRequests.reviewedAt,
        createdAt: leaveRequests.createdAt,
    })
        .from(leaveRequests)
        .where(and(eq(leaveRequests.employeeId, authUser.userId), eq(leaveRequests.companyId, authUser.companyId)))
        .orderBy(desc(leaveRequests.createdAt));
    return leaveList;
}
export async function createLeaveRequest(authUser, input) {
    if (!authUser.companyId) {
        throw new AppError(403, "Company context is required");
    }
    if (!authUser.departmentId) {
        throw new AppError(403, "Department context is required");
    }
    const [overlappingLeave] = await db
        .select({
        id: leaveRequests.id,
    })
        .from(leaveRequests)
        .where(and(eq(leaveRequests.employeeId, authUser.userId), eq(leaveRequests.companyId, authUser.companyId), or(eq(leaveRequests.status, "PENDING"), eq(leaveRequests.status, "APPROVED")), lte(leaveRequests.startDate, input.endDate), gte(leaveRequests.endDate, input.startDate)))
        .limit(1);
    if (overlappingLeave) {
        throw new AppError(409, "Leave request overlaps with an existing leave");
    }
    const [leaveRequest] = await db
        .insert(leaveRequests)
        .values({
        companyId: authUser.companyId,
        employeeId: authUser.userId,
        departmentId: authUser.departmentId,
        leaveType: input.leaveType,
        startDate: input.startDate,
        endDate: input.endDate,
        reason: input.reason,
        status: "PENDING",
    })
        .returning({
        id: leaveRequests.id,
        leaveType: leaveRequests.leaveType,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        reason: leaveRequests.reason,
        status: leaveRequests.status,
        createdAt: leaveRequests.createdAt,
    });
    return leaveRequest;
}
//# sourceMappingURL=leave.service.js.map