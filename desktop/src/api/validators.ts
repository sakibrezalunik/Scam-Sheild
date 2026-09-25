/**
 * ScamShield Desktop — Input Validators
 *
 * Mirrors the backend validation limits so we can give early feedback.
 */

import { MAX_INPUT_LENGTHS } from "../utils/constants";

export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: string;
}

export function validateUrlInput(input: string): ValidationResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { valid: false, error: "Please enter a URL to analyze" };
  }
  if (trimmed.length > MAX_INPUT_LENGTHS.URL) {
    return { valid: false, error: `URL must be under ${MAX_INPUT_LENGTHS.URL} characters` };
  }
  return { valid: true, sanitized: trimmed };
}

export function validateMessageInput(input: string): ValidationResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { valid: false, error: "Please enter a message to analyze" };
  }
  if (trimmed.length > MAX_INPUT_LENGTHS.MESSAGE) {
    return { valid: false, error: `Message must be under ${MAX_INPUT_LENGTHS.MESSAGE} characters` };
  }
  return { valid: true, sanitized: trimmed };
}

export function validateJobInput(input: string): ValidationResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { valid: false, error: "Please paste a job posting to analyze" };
  }
  if (trimmed.length > MAX_INPUT_LENGTHS.JOB) {
    return { valid: false, error: `Job posting must be under ${MAX_INPUT_LENGTHS.JOB} characters` };
  }
  return { valid: true, sanitized: trimmed };
}
