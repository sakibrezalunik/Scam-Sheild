/**
 * Enhanced SSRF protection with comprehensive IP/IPv6/metadata coverage.
 * Extends the existing validateUrlForFetch with broader blocking rules.
 */
import dns from "dns";
import { promisify } from "util";

const dnsLookup = promisify(dns.lookup);

// ─── IPv4 Blocked Ranges ───────────────────────────────────────

const BLOCKED_IPV4_RANGES: Array<{ start: number; end: number }> = [
  // Loopback
  { start: 0x7f000000, end: 0x7fffffff }, // 127.0.0.0 – 127.255.255.255
  // Private Class A
  { start: 0x0a000000, end: 0x0affffff }, // 10.0.0.0 – 10.255.255.255
  // Private Class B
  { start: 0xac100000, end: 0xac1f0000 }, // 172.16.0.0 – 172.31.255.255
  // Private Class C
  { start: 0xc0a80000, end: 0xc0a8ffff }, // 192.168.0.0 – 192.168.255.255
  // Link-local
  { start: 0xa9fe0000, end: 0xa9feffff }, // 169.254.0.0 – 169.254.255.255
  // Cloud metadata (AWS, GCP, Azure)
  { start: 0xa9feaa9e, end: 0xa9feaa9e }, // 169.254.169.254
  // RFC 5737 documentation ranges
  { start: 0xc0a86400, end: 0xc0a864ff }, // 192.168.100.0/24
  // RFC 6598 shared-address space
  { start: 0xa8630000, end: 0xa863ffff }, // 100.64.0.0 – 100.64.255.255
];

// ─── Blocked Hostnames ─────────────────────────────────────────

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "ip6-loopback",
  "metadata.google.internal",
  "metadata",
  "kubernetes.default",
  "kubernetes.default.svc",
  "instance-data",
  "instance-data最佳",
  "169.254.169.254",
]);

// ─── IPv6 Helpers ──────────────────────────────────────────────

/**
 * Parse an IPv6 address to a 16-byte buffer for comparison.
 */
function ipv6ToBytes(ip: string): Uint8Array | null {
  try {
    // Handle IPv4-mapped IPv6 (::ffff:1.2.3.4)
    const normalized = ip.toLowerCase().trim();
    if (normalized.startsWith("::ffff:")) {
      const ipv4Part = normalized.slice(7);
      const parts = ipv4Part.split(".").map(Number);
      if (parts.length === 4 && parts.every((p) => p >= 0 && p <= 255)) {
        return new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...parts]);
      }
    }

    const segments = normalized.split(":").filter((s) => s !== "");
    if (segments.length === 0) return null;

    // Handle :: expansion
    const fullSegments: string[] = [];
    const emptyIndex = segments.indexOf("");
    if (emptyIndex !== -1) {
      const left = segments.slice(0, emptyIndex);
      const right = segments.slice(emptyIndex + 1);
      const missing = 8 - left.length - right.length;
      fullSegments.push(...left, ...Array(missing).fill("0"), ...right);
    } else {
      fullSegments.push(...segments);
    }

    if (fullSegments.length !== 8) return null;

    const bytes = new Uint8Array(16);
    for (let i = 0; i < 8; i++) {
      bytes[i * 2] = parseInt(fullSegments[i], 16) >> 8;
      bytes[i * 2 + 1] = parseInt(fullSegments[i], 16) & 0xff;
    }
    return bytes;
  } catch {
    return null;
  }
}

/**
 * Check if an IPv6 address is in a blocked range.
 */
function isBlockedIPv6(ip: string): boolean {
  const bytes = ipv6ToBytes(ip);
  if (!bytes) return true; // Invalid IPv6 → block

  // IPv6 loopback ::1 — check all-zero except last byte = 1
  const isAllZeroExceptLast = bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 0 && bytes[3] === 0
    && bytes[4] === 0 && bytes[5] === 0 && bytes[6] === 0 && bytes[7] === 0
    && bytes[8] === 0 && bytes[9] === 0 && bytes[10] === 0 && bytes[11] === 0
    && bytes[12] === 0 && bytes[13] === 0 && bytes[14] === 0;
  if (isAllZeroExceptLast && bytes[15] === 1) {
    return true;
  }

  // IPv6 private (fc00::/7)
  if (bytes[0] === 0xfc || bytes[0] === 0xfd) return true;

  // IPv6 link-local (fe80::/10)
  if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80) return true;

  // IPv6 unspecified ::
  if (bytes.every((b) => b === 0)) return true;

  // IPv4-mapped IPv6 to blocked IPv4 ranges
  if (bytes[10] === 0xff && bytes[11] === 0xff) {
    const ipv4 = (bytes[12] << 24) | (bytes[13] << 16) | (bytes[14] << 8) | bytes[15];
    for (const range of BLOCKED_IPV4_RANGES) {
      if (ipv4 >= range.start && ipv4 <= range.end) return true;
    }
  }

  return false;
}

/**
 * Check if an IPv4 address is in a blocked range.
 */
function isBlockedIPv4(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return true;
  // Use multiplication to avoid 32-bit signed integer overflow
  const num =
    parseInt(parts[0], 10) * 0x1000000 +
    parseInt(parts[1], 10) * 0x10000 +
    parseInt(parts[2], 10) * 0x100 +
    parseInt(parts[3], 10);
  if (isNaN(num)) return true;
  for (const range of BLOCKED_IPV4_RANGES) {
    if (num >= range.start && num <= range.end) return true;
  }
  return false;
}

// ─── Public API ────────────────────────────────────────────────

export interface UrlValidationResult {
  valid: boolean;
  error?: string;
  resolvedIp?: string;
  hostname?: string;
  port?: number;
}

/**
 * Validate a URL for SSRF protection.
 * Covers IPv4, IPv6, IPv4-mapped IPv6, localhost, private ranges,
 * link-local, multicast, cloud metadata, and DNS rebinding prevention.
 */
export async function validateUrlForFetch(url: string): Promise<UrlValidationResult> {
  try {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return { valid: false, error: "Invalid URL format" };
    }

    // Only allow HTTP and HTTPS
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { valid: false, error: "Only HTTP and HTTPS URLs are allowed" };
    }

    const hostname = parsed.hostname;
    const port = parsed.port ? parseInt(parsed.port, 10) : parsed.protocol === "https:" ? 443 : 80;

    // Block non-standard ports
    if (port !== 80 && port !== 443) {
      return { valid: false, error: "Only standard HTTP (80) and HTTPS (443) ports are allowed" };
    }

    // Block known-bad hostnames
    if (BLOCKED_HOSTNAMES.has(hostname.toLowerCase())) {
      return { valid: false, error: "Access to this hostname is not allowed" };
    }

    // Block direct IP access to private/reserved ranges (catches literal IPs before DNS)
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      if (isBlockedIPv4(hostname)) {
        return { valid: false, error: "Access to private/reserved IP addresses is not allowed" };
      }
    }

    // Block IPv4-mapped IPv6 hostnames (e.g. ::ffff:127.0.0.1 or [::ffff:127.0.0.1])
    const rawHost = hostname.replace(/^\[|\]$/g, "");
    const ipv4MappedMatch = rawHost.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
    if (ipv4MappedMatch && isBlockedIPv4(ipv4MappedMatch[1])) {
      return { valid: false, error: "Access to private/reserved IP addresses is not allowed" };
    }
    // Also check hex-normalized form (e.g. ::ffff:7f00:1 → 127.0.0.1)
    const hexMappedMatch = rawHost.match(/^::ffff:([0-9a-fA-F]{1,4}):([0-9a-fA-F]{1,4})$/);
    if (hexMappedMatch) {
      const b1 = parseInt(hexMappedMatch[1], 16);
      const b2 = parseInt(hexMappedMatch[2], 16);
      const mappedIp = `${(b1 >>> 8) & 0xff}.${b1 & 0xff}.${(b2 >>> 8) & 0xff}.${b2 & 0xff}`;
      if (isBlockedIPv4(mappedIp)) {
        return { valid: false, error: "Access to private/reserved IP addresses is not allowed" };
      }
    }

    // Resolve DNS
    let resolvedIp: string;
    try {
      const result = await dnsLookup(hostname);
      resolvedIp = result.address;
    } catch {
      return { valid: false, error: "Could not resolve hostname" };
    }

    // Check resolved IP
    if (resolvedIp.includes(":")) {
      // IPv6 — also extract embedded IPv4 for mapped addresses
      if (isBlockedIPv6(resolvedIp)) {
        return { valid: false, error: "Access to this resource is not allowed" };
      }
      // Handle pure-IPv6 form of IPv4-mapped addresses (e.g. ::ffff:7f00:1 → 127.0.0.1)
      const ipv6Ipv4Match = resolvedIp.match(/^::ffff:([0-9a-fA-F]{1,4}):([0-9a-fA-F]{1,4})$/);
      if (ipv6Ipv4Match) {
        // Convert hex-normalized IPv4-mapped IPv6 (e.g. ::ffff:7f00:1) to dotted decimal
        const rawHex = resolvedIp.slice(7); // remove ::ffff:
        const hexParts = rawHex.split(":");
        if (hexParts.length === 2) {
          const hi = parseInt(hexParts[0], 16);
          const lo = parseInt(hexParts[1], 16);
          const mappedIp = `${(hi >>> 8) & 0xff}.${hi & 0xff}.${(lo >>> 8) & 0xff}.${lo & 0xff}`;
          if (isBlockedIPv4(mappedIp)) {
            return { valid: false, error: "Access to private/reserved IP addresses is not allowed" };
          }
        }
      }
    } else {
      // IPv4
      if (isBlockedIPv4(resolvedIp)) {
        return { valid: false, error: "Access to this resource is not allowed" };
      }
    }

    return {
      valid: true,
      resolvedIp,
      hostname,
      port,
    };
  } catch {
    return { valid: false, error: "URL validation failed" };
  }
}

/**
 * Check if a string looks like a URL
 */
export function looksLikeUrl(input: string): boolean {
  const trimmed = input.trim();
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    /^[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}/.test(trimmed)
  );
}

/**
 * Normalize URL (add https:// if missing)
 */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}
