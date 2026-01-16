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

// Sauvegarde des fonctions originales
const originalError = console.error;
const originalWarn = console.warn;

function captureLog(level: 'error' | 'warn', args: unknown[], stack?: string) {
  const message = args.map(a => 
    typeof a === 'object' ? JSON.stringify(a).slice(0, 500) : String(a)
  ).join(' ').slice(0, 1000);

  logBuffer.push({
    level,
    message,
    timestamp: new Date().toISOString(),
    stack: stack?.slice(0, 2000)
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
  return [...logBuffer];
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
