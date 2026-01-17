// Structure des logs capturés
interface CapturedLog {
  level: 'error' | 'warn';
  message: string;
  timestamp: string;
  stack?: string;
}

// Buffer circulaire (max 50 entrées)
const logBuffer: CapturedLog[] = [];
const MAX_LOGS = 50;

// Patterns to detect and redact sensitive data
const SENSITIVE_PATTERNS = [
  // API keys and tokens
  /(?:api[_-]?key|apikey|token|bearer|authorization|auth[_-]?token|access[_-]?token|refresh[_-]?token|secret[_-]?key|private[_-]?key)[\s]*[=:]\s*["']?[a-zA-Z0-9_\-\.]+["']?/gi,
  // JWT tokens (header.payload.signature format)
  /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
  // Supabase keys (anon and service role)
  /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
  // Password patterns
  /(?:password|passwd|pwd|pass)[\s]*[=:]\s*["']?[^\s"']+["']?/gi,
  // Email patterns in sensitive contexts
  /(?:email|mail)[\s]*[=:]\s*["']?[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}["']?/gi,
  // Credit card patterns (basic)
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  // OAuth tokens
  /(?:oauth|client[_-]?secret|client[_-]?id)[\s]*[=:]\s*["']?[a-zA-Z0-9_\-\.]+["']?/gi,
  // Battle.net tokens
  /(?:battlenet|bnet)[_-]?(?:token|key|secret)[\s]*[=:]\s*["']?[a-zA-Z0-9_\-\.]+["']?/gi,
];

// Query parameters to strip from URLs
const SENSITIVE_QUERY_PARAMS = [
  'token', 'access_token', 'refresh_token', 'code', 'state',
  'api_key', 'apikey', 'key', 'secret', 'password', 'pwd',
  'auth', 'authorization', 'session', 'sid'
];

/**
 * Sanitize a string by redacting sensitive patterns
 */
function sanitizeString(input: string): string {
  let sanitized = input;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  return sanitized;
}

/**
 * Sanitize a URL by removing sensitive query parameters
 */
export function sanitizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;
    
    for (const param of SENSITIVE_QUERY_PARAMS) {
      if (params.has(param)) {
        params.set(param, '[REDACTED]');
      }
    }
    
    return urlObj.toString();
  } catch {
    // If URL parsing fails, apply basic sanitization
    return sanitizeString(url);
  }
}

// Sauvegarde des fonctions originales
const originalError = console.error;
const originalWarn = console.warn;

function captureLog(level: 'error' | 'warn', args: unknown[], stack?: string) {
  const rawMessage = args.map(a => 
    typeof a === 'object' ? JSON.stringify(a).slice(0, 500) : String(a)
  ).join(' ').slice(0, 1000);

  // Sanitize the message to remove sensitive data
  const message = sanitizeString(rawMessage);
  const sanitizedStack = stack ? sanitizeString(stack.slice(0, 2000)) : undefined;

  logBuffer.push({
    level,
    message,
    timestamp: new Date().toISOString(),
    stack: sanitizedStack
  });

  if (logBuffer.length > MAX_LOGS) logBuffer.shift();
}

// Patch console.error
console.error = (...args: unknown[]) => {
  captureLog('error', args);
  originalError.apply(console, args);
};

// Patch console.warn
console.warn = (...args: unknown[]) => {
  captureLog('warn', args);
  originalWarn.apply(console, args);
};

// Capture des erreurs non gérées
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    captureLog('error', [event.message], event.error?.stack);
  });

  window.addEventListener('unhandledrejection', (event) => {
    captureLog('error', [`Unhandled Promise: ${event.reason}`]);
  });
}

// Fonctions exportées
export function getRecentLogs(): CapturedLog[] {
  // Return a copy with additional sanitization pass
  return logBuffer.map(log => ({
    ...log,
    message: sanitizeString(log.message),
    stack: log.stack ? sanitizeString(log.stack) : undefined
  }));
}

export function getErrorCount(): number {
  return logBuffer.filter(log => log.level === 'error').length;
}

export function getBrowserInfo() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {};
  }
  
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    screenWidth: window.screen?.width,
    screenHeight: window.screen?.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    platform: navigator.platform,
    cookiesEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    deviceMemory: (navigator as { deviceMemory?: number }).deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency
  };
}

export function clearLogs() {
  logBuffer.length = 0;
}
