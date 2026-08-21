import type {
  ErrorRequestHandler,
} from "express";

import { AppError } from "../utils/app-error.js";

export const errorHandler: ErrorRequestHandler = (
  error,
  _req,
  res,
  _next
) => {
  if (error instanceof AppError) {
    const response: any = {
      success: false,
      message: error.message,
    };

    if (error.code) {
      response.code = error.code;
    }

    if (error.data) {
      response.data = error.data;
    }

    res.status(error.statusCode).json(response);

    return;
  }

  console.error(error);

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};