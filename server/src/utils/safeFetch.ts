import dns from 'node:dns/promises';
import net from 'node:net';
import { AppError } from '../errors.js';

const PRIVATE_RANGES = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^0\./,
];

function isBlockedIp(address: string): boolean {
  if (net.isIPv4(address)) return PRIVATE_RANGES.some((range) => range.test(address));
  if (net.isIPv6(address)) {
    return address === '::1' || address.startsWith('fc') || address.startsWith('fd') || address.startsWith('fe80');
  }
  return true;
}

async function assertSafeUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new AppError(400, 'invalid_url', 'The URL is invalid.');
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new AppError(400, 'invalid_url_protocol', 'Only HTTP and HTTPS URLs are allowed.');
  }
  if (url.username || url.password) throw new AppError(400, 'invalid_url_credentials', 'URLs with credentials are not allowed.');
  if (url.port && !['80', '443'].includes(url.port)) throw new AppError(400, 'invalid_url_port', 'Non-standard ports are not allowed.');
  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.local')) {
    throw new AppError(400, 'blocked_host', 'Private hostnames are not allowed.');
  }
  if (net.isIP(hostname)) {
    if (isBlockedIp(hostname)) throw new AppError(400, 'blocked_host', 'Private IP addresses are not allowed.');
    return url;
  }
  let addresses: Array<{ address: string }>;
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch {
    throw new AppError(400, 'dns_lookup_failed', `Could not resolve ${hostname}.`);
  }
  if (addresses.length === 0 || addresses.some((entry) => isBlockedIp(entry.address))) {
    throw new AppError(400, 'blocked_host', 'The host resolves to a private or invalid address.');
  }
  return url;
}

export interface SafeFetchResult {
  url: string;
  status: number;
  title: string | null;
  text: string;
  contentType: string | null;
}

export async function safeFetch(rawUrl: string, options: { maxBytes?: number; timeoutMs?: number } = {}): Promise<SafeFetchResult> {
  let current = await assertSafeUrl(rawUrl);
  const maxBytes = options.maxBytes || 512 * 1024;
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const response = await fetch(current, {
      redirect: 'manual',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'AI-Job-Hunter/2.0 (company verification; +https://github.com/vijaymahes9080)',
      },
      signal: AbortSignal.timeout(options.timeoutMs || 8000),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error('Redirect without Location header');
      current = await assertSafeUrl(new URL(location, current).toString());
      continue;
    }
    const contentType = response.headers.get('content-type');
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > maxBytes) throw new Error('Response exceeded the verification size limit');
    const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer).slice(0, maxBytes);
    const titleMatch = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim().slice(0, 200) : null;
    return { url: current.toString(), status: response.status, title, text, contentType };
  }
  throw new Error('Too many redirects');
}
