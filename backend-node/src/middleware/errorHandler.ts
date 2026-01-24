import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { AppError } from "../utils/errors";

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    console.warn("Handled error:", {
      statusCode: err.statusCode,
      message: err.message,
      details: err.details,
      path: _req.originalUrl,
      method: _req.method,
    });
    return res.status(err.statusCode).json({
      message: err.message,
      details: err.details,
    });
  }

  if (err instanceof ZodError) {
    const firstMessage =
      err.issues.find((issue) => typeof issue.message === "string")?.message ??
      "Validation error";
    return res.status(422).json({
      message: firstMessage,
    });
  }

  console.error("Unexpected error:", err);
  return res.status(500).json({
    message: "Internal server error",
  });
};
