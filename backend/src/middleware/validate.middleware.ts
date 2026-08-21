import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

import { AppError } from "../utils/app-error.js";

export function validateBody(schema: ZodType) {
  return (
    req: Request,
    _res: Response,
    next: NextFunction
  ) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const message =
        result.error.issues[0]?.message ??
        "Invalid request data";

      return next(new AppError(400, message));
    }

    req.body = result.data;
    next();
  };
}