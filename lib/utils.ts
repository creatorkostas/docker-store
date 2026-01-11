import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    
    const hostname = parsed.hostname;
    
    // Check for localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return false;
    
    // Check for private IPs (basic string check)
    if (hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('0.0.0.0')) return false;
    
    // 172.16.x.x to 172.31.x.x
    if (hostname.startsWith('172.')) {
        const parts = hostname.split('.');
        if (parts.length === 4) {
            const second = parseInt(parts[1], 10);
            if (second >= 16 && second <= 31) return false;
        }
    }

    return true;
  } catch (e) {
    return false;
  }
}