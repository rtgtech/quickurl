import { z } from "zod";
import { CUSTOM_CODE_PATTERN, RESERVED_CODES } from "@/lib/constants";
import type { AccessMode } from "@/lib/types";

export const urlSchema = z.string().regex(/^https?:\/\//i);

export const shortenRequestSchema = z.object({
  url: z.string().min(1),
  custom_code: z.string().optional(),
  code: z.string().optional(),
});

export function validateCustomCode(rawCode: string): string | null {
  const code = rawCode.trim();
  if (!code) {
    return "Custom code cannot be empty";
  }

  if (RESERVED_CODES.has(code.toLowerCase())) {
    return "This code is reserved";
  }

  if (!CUSTOM_CODE_PATTERN.test(code)) {
    return "Custom code must be 2-64 characters: letters and digits only";
  }

  return null;
}

export function validateAccessMode(rawAccessMode: string): AccessMode | null {
  const accessMode = rawAccessMode.trim().toLowerCase();
  if (accessMode === "public" || accessMode === "auth_required") {
    return accessMode;
  }

  return null;
}
