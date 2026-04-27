import type { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({ errors: err.issues });
  }

  // Prisma known errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002":
        return res.status(409).json({
          error: `${
            Array.isArray(err.meta?.target)
              ? err.meta.target.join(", ")
              : err.meta?.target
          } already exists`,
        });
      case "P2025":
        return res.status(404).json({ error: "Record not found" });
      case "P2003":
        return res.status(400).json({ error: "Related record does not exist" });
      case "P2023":
        return res.status(400).json({ error: "Invalid request data format" });
      default:
        console.error(`Prisma error ${err.code}:`, err.message, err.meta);
        return res.status(500).json({ error: "Database error", code: err.code, detail: err.message });
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    console.error("Prisma validation error:", err.message);
    return res.status(400).json({ error: "Invalid request data", detail: err.message });
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    console.error("Prisma initialization error:", err.message);
    return res.status(503).json({ error: "Database unavailable" });
  }

  if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    const message = err.message || "";
    console.error("Prisma unknown request error:", message);

    if (message.includes("ECONNRESET")) {
      return res.status(503).json({ error: "Database connection was reset. Please retry." });
    }

    return res.status(500).json({ error: "Database request failed", detail: message });
  }

  // Node/driver-level transient network errors (not wrapped by Prisma classes)
  if (err && typeof err === "object") {
    const maybeCode = (err as { code?: string }).code;
    const maybeMessage =
      typeof (err as { message?: unknown }).message === "string"
        ? ((err as { message?: string }).message ?? "")
        : "";

    if (maybeCode === "ECONNRESET" || maybeMessage.includes("ECONNRESET")) {
      console.error("Connection reset error:", err);
      return res.status(503).json({ error: "Connection reset. Please retry." });
    }

    if (maybeCode === "ETIMEDOUT" || maybeCode === "ECONNREFUSED") {
      console.error("Database/network connection error:", err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  }

  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
}
