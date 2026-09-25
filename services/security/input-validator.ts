import { z } from "zod";
import { MAX_INPUT_LENGTHS } from "@/lib/utils/constants";

// URL validation schema
export const urlSchema = z
  .string()
  .trim()
  .min(1, "URL is required")
  .max(MAX_INPUT_LENGTHS.URL, `URL must be less than ${MAX_INPUT_LENGTHS.URL} characters`)
  .refine((url) => {
    try {
      const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
      return ["http:", "https:"].includes(parsed.protocol);
    } catch {
      return false;
    }
  }, "Invalid URL format");

// Message validation schema
export const messageSchema = z
  .string()
  .trim()
  .min(10, "Message must be at least 10 characters")
  .max(MAX_INPUT_LENGTHS.MESSAGE, `Message must be less than ${MAX_INPUT_LENGTHS.MESSAGE} characters`);

// Job description validation schema
export const jobSchema = z
  .string()
  .trim()
  .min(20, "Job description must be at least 20 characters")
  .max(MAX_INPUT_LENGTHS.JOB, `Job description must be less than ${MAX_INPUT_LENGTHS.JOB} characters`);

// Signup validation schema
export const signupSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be less than 100 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters").optional(),
});

// Login validation schema
export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Validate and sanitize URL input
export function validateUrlInput(input: string): { success: true; data: string } | { success: false; error: string } {
  const result = urlSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error.issues[0]?.message || "Invalid URL" };
}

// Validate message input
export function validateMessageInput(input: string): { success: true; data: string } | { success: false; error: string } {
  const result = messageSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error.issues[0]?.message || "Invalid message" };
}

// Validate job description input
export function validateJobInput(input: string): { success: true; data: string } | { success: false; error: string } {
  const result = jobSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error.issues[0]?.message || "Invalid job description" };
}

// Extract URLs from text
export function extractUrlsFromText(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
  const matches = text.match(urlRegex) || [];
  return [...new Set(matches)];
}

// Extract email addresses from text
export function extractEmailsFromText(text: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
  const matches = text.match(emailRegex) || [];
  return [...new Set(matches)];
}

// Extract phone numbers from text
export function extractPhonesFromText(text: string): string[] {
  const phoneRegex = /(?:\+?1[-.]?)?\(?[0-9]{3}\)?[-.]?[0-9]{3}[-.]?[0-9]{4}/g;
  const matches = text.match(phoneRegex) || [];
  return [...new Set(matches)];
}

// Create SHA-256 hash for privacy
export async function hashInput(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Create preview (truncated) of input
export function createInputPreview(input: string, maxLength = 100): string {
  const trimmed = input.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength) + "...";
}
