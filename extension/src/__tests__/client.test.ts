/**
 * ScamShield Extension — API Client Tests
 *
 * Tests the extension's API client against the real backend contract.
 * Uses vitest with globalThis.fetch stubbing (no mock of the scanner itself).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateExtensionUrl, scanUrl } from '../api/client';

// Stub global fetch for all tests
const originalFetch = globalThis.fetch;

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ─── URL Validation ───────────────────────────────────────────────────

describe('validateExtensionUrl', () => {
  it('accepts valid https URLs', () => {
    const result = validateExtensionUrl('https://example.com/path');
    expect(result.valid).toBe(true);
    expect(result.normalizedUrl).toBe('https://example.com/path');
  });

  it('accepts valid http URLs', () => {
    const result = validateExtensionUrl('http://example.com');
    expect(result.valid).toBe(true);
    expect(result.normalizedUrl).toBe('http://example.com/');
  });

  it('prepends https:// to bare domains', () => {
    const result = validateExtensionUrl('example.com');
    expect(result.valid).toBe(true);
    expect(result.normalizedUrl).toBe('https://example.com/');
  });

  it('rejects empty string', () => {
    const result = validateExtensionUrl('');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('empty');
  });

  it('rejects unsupported protocols', () => {
    const result = validateExtensionUrl('chrome://extensions');
    expect(result.valid).toBe(false);
  });

  it('rejects file:// URLs', () => {
    const result = validateExtensionUrl('file:///etc/passwd');
    expect(result.valid).toBe(false);
  });

  it('rejects about:blank', () => {
    const result = validateExtensionUrl('about:blank');
    expect(result.valid).toBe(false);
  });

  it('rejects excessively long URLs', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(2100);
    const result = validateExtensionUrl(longUrl);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('long');
  });

  it('trims whitespace', () => {
    const result = validateExtensionUrl('  https://example.com  ');
    expect(result.valid).toBe(true);
    expect(result.normalizedUrl).toBe('https://example.com/');
  });
});

// ─── scanUrl — Happy Path ─────────────────────────────────────────────

describe('scanUrl — success', () => {
  const mockScanResult = {
    id: 'scan-123',
    scanType: 'url' as const,
    inputPreview: 'https://example.com',
    inputHash: 'abc123',
    riskScore: 72,
    riskLevel: 'high' as const,
    category: 'phishing',
    summary: 'Suspicious domain detected.',
    indicators: [],
    recommendations: ['Review before entering data.'],
    createdAt: '2024-01-01T00:00:00Z',
  };

  it('returns success with valid backend response', async () => {
    const mockResponse = { success: true, data: mockScanResult };
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 200,
      json: async () => mockResponse,
    });

    const result = await scanUrl('https://example.com');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.riskScore).toBe(72);
      expect(result.data.riskLevel).toBe('high');
    }

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/scans/url'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('sends the correct URL to the backend', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 200,
      json: async () => ({ success: true, data: mockScanResult }),
    });

    await scanUrl('https://suspicious-site.xyz/login');

    const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(callArgs[1].body as string);
    expect(body.url).toBe('https://suspicious-site.xyz/login');
  });
});

// ─── scanUrl — Error Handling ─────────────────────────────────────────

describe('scanUrl — error cases', () => {
  it('handles 400 validation error', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 400,
      json: async () => ({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid URL format' },
      }),
    });

    const result = await scanUrl('not-a-url');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('Invalid');
    }
  });

  it('handles 401 auth required', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 401,
      json: async () => ({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Auth needed' } }),
    });

    const result = await scanUrl('https://example.com');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('AUTH_REQUIRED');
    }
  });

  it('handles 429 rate limit', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 429,
      json: async () => ({ success: false, error: { code: 'RATE_LIMITED', message: 'Too many scans' } }),
    });

    const result = await scanUrl('https://example.com');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('RATE_LIMITED');
    }
  });

  it('handles 500 server error', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 500,
      json: async () => ({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Server error' },
      }),
    });

    const result = await scanUrl('https://example.com');
    expect(result.success).toBe(false);
  });

  it('handles network failure', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('ENOTFOUND'));

    const result = await scanUrl('https://example.com');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('Network');
    }
  });

  it('handles timeout via AbortSignal', async () => {
    const timeoutError = Object.assign(new Error('timeout'), { name: 'TimeoutError' });
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(timeoutError);

    const result = await scanUrl('https://example.com');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('timed out');
    }
  });

  it('handles malformed JSON response', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 200,
      json: async () => { throw new Error('Invalid JSON'); },
    });

    const result = await scanUrl('https://example.com');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('Invalid response');
    }
  });

  it('validates response shape — missing riskScore', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 200,
      json: async () => ({
        success: true,
        data: { id: 'x', riskLevel: 'high', summary: 'ok' }, // no riskScore
      }),
    });

    const result = await scanUrl('https://example.com');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('Unexpected response');
    }
  });
});

// ─── Integration — Full End-to-End Contract ───────────────────────────

describe('scanUrl — backend contract compliance', () => {
  it('accepts all required fields in scan result', async () => {
    const fullResult = {
      id: 'scan-uuid',
      scanType: 'url',
      inputPreview: 'https://test.com',
      inputHash: 'sha256hash',
      riskScore: 45,
      riskLevel: 'moderate',
      category: 'suspicious_website',
      summary: 'Moderate risk detected.',
      indicators: [
        { severity: 'high', category: 'domain', title: 'Short domain age', description: 'Registered 2 days ago' },
        { severity: 'medium', category: 'ssl', title: 'Self-signed certificate' },
      ],
      recommendations: ['Avoid entering personal information.'],
      urlAnalysis: {
        url: 'https://test.com',
        domain: 'test.com',
        isHttps: true,
        hasValidSsl: false,
        sslIssuer: null,
        domainAgeDays: 2,
        registrar: null,
        ipAddress: '1.2.3.4',
        country: null,
        httpStatus: 200,
        redirectCount: 0,
        redirectChain: [],
        securityHeaders: {},
        hasLoginForm: true,
        hasPaymentForm: false,
        dnsRecords: {},
      },
      createdAt: '2024-01-01T00:00:00Z',
    };

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 200,
      json: async () => ({ success: true, data: fullResult }),
    });

    const result = await scanUrl('https://test.com');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('scan-uuid');
      expect(result.data.riskScore).toBe(45);
      expect(result.data.indicators).toHaveLength(2);
      expect(result.data.urlAnalysis).toBeDefined();
    }
  });
});
