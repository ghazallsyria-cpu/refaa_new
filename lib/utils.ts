import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const normalizeString = (value: string | null | undefined): string | undefined => {
  return value ?? undefined;
};

/**
 * Normalizes a payload for database operations by converting undefined to null
 * for optional fields that should be nullable in the database.
 */
export function normalizePayload<T extends Record<string, any>>(payload: T): T {
  const normalized = { ...payload };
  Object.keys(normalized).forEach((key) => {
    if (normalized[key] === undefined) {
      normalized[key as keyof T] = null as any;
    }
  });
  return normalized;
}

/**
 * Cleans a response from the database by converting null to undefined
 * for fields that should be optional in the UI.
 */
export function cleanResponse<T extends Record<string, any>>(data: T): T {
  const cleaned = { ...data };
  Object.keys(cleaned).forEach((key) => {
    if (cleaned[key] === null) {
      delete cleaned[key];
    }
  });
  return cleaned;
}
