import { z } from "zod";
export const createLeaveRequestSchema = z
    .object({
    leaveType: z.enum([
        "CASUAL",
        "SICK",
        "ANNUAL",
        "UNPAID",
        "OTHER",
    ]),
    startDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be YYYY-MM-DD"),
    endDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be YYYY-MM-DD"),
    reason: z
        .string()
        .trim()
        .min(3, "Reason must contain at least 3 characters")
        .max(1000, "Reason is too long"),
})
    .refine((data) => data.endDate >= data.startDate, {
    message: "End date cannot be before start date",
    path: ["endDate"],
});
//# sourceMappingURL=leave.schema.js.map