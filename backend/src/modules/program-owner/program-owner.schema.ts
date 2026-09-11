import { z } from "zod";

import { strongPasswordSchema } from "../../utils/password.js";

export const createMasterAdminSchema = z.object({
  employeeId: z.string().trim().min(1),
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  phone: z.string().trim().min(7).max(30).optional(),
  password: strongPasswordSchema,
  companyCode: z.string().trim().min(1),
  companyName: z.string().trim().min(2),
});

export type CreateMasterAdminInput = z.infer<typeof createMasterAdminSchema>;
