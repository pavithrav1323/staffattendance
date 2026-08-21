import { z } from "zod";
export const createMasterAdminSchema = z.object({
    employeeId: z.string().trim().min(1),
    name: z.string().trim().min(2),
    email: z.string().trim().email(),
    phone: z.string().trim().min(7).max(30).optional(),
    password: z.string().min(8),
    companyCode: z.string().trim().min(1),
    companyName: z.string().trim().min(2),
});
//# sourceMappingURL=program-owner.schema.js.map