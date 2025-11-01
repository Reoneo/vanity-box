// Shared validation schemas for edge functions
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Subdomain validation schema
export const subdomainSchema = z.string()
  .min(1, "Subdomain cannot be empty")
  .max(63, "Subdomain must be 63 characters or less")
  .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, "Subdomain must contain only lowercase letters, numbers, and hyphens");

// Domain validation schema
export const domainSchema = z.string()
  .min(1, "Domain cannot be empty")
  .max(253, "Domain must be 253 characters or less")
  .regex(/^[a-z0-9$]([a-z0-9$.-]*[a-z0-9$])?(\.[a-z0-9$]([a-z0-9$-]*[a-z0-9$])?)*$/, "Invalid domain format");

// Ethereum address validation schema
export const ethereumAddressSchema = z.string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address format");

// UUID validation schema
export const uuidSchema = z.string()
  .uuid("Invalid UUID format");

// Transaction ID validation schema
export const transactionIdSchema = z.string()
  .min(1, "Transaction ID cannot be empty")
  .max(255, "Transaction ID too long");

// Text records validation schema
export const textRecordsSchema = z.record(
  z.string().max(100, "Text record key too long"),
  z.string().max(1000, "Text record value too long")
).optional();

// Coin types validation schema
export const coinTypesSchema = z.record(
  z.string().regex(/^\d+$/, "Coin type must be numeric"),
  z.string().max(255, "Coin type address too long")
).optional();

// Contenthash validation schema
export const contenthashSchema = z.string()
  .max(500, "Contenthash too long")
  .optional();

// Helper function to safely validate and return errors
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return { success: false, error: firstError.message };
    }
    return { success: false, error: "Invalid input format" };
  }
}
