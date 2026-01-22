import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env file
dotenv.config();

export interface AgentConfig {
  watchDir: string;
  apiBaseUrl: string;
  sessionCookie: string;
  pollInterval: number;
  debounceDelay: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

function validateConfig(): AgentConfig {
  const watchDir = process.env.WATCH_DIR;
  const apiBaseUrl = process.env.API_BASE_URL;
  const sessionCookie = process.env.SESSION_COOKIE;

  // Validate required fields
  if (!watchDir) {
    throw new Error('WATCH_DIR environment variable is required');
  }

  if (!apiBaseUrl) {
    throw new Error('API_BASE_URL environment variable is required');
  }

  if (!sessionCookie) {
    throw new Error('SESSION_COOKIE environment variable is required (get from browser after auth)');
  }

  // Expand relative path to absolute
  const resolvedWatchDir = path.isAbsolute(watchDir)
    ? watchDir
    : path.resolve(process.cwd(), watchDir);

  // Create watch directory if it doesn't exist
  if (!fs.existsSync(resolvedWatchDir)) {
    console.log(`[Config] Creating watch directory: ${resolvedWatchDir}`);
    fs.mkdirSync(resolvedWatchDir, { recursive: true });
  }

  const config: AgentConfig = {
    watchDir: resolvedWatchDir,
    apiBaseUrl: apiBaseUrl.replace(/\/$/, ''), // Remove trailing slash
    sessionCookie,
    pollInterval: parseInt(process.env.POLL_INTERVAL || '0', 10),
    debounceDelay: parseInt(process.env.DEBOUNCE_DELAY || '500', 10),
    logLevel: (process.env.LOG_LEVEL as any) || 'info',
  };

  return config;
}

export const config = validateConfig();

export function logMessage(level: string, message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
}

export function log(message: string): void {
  logMessage('info', message);
}

export function logDebug(message: string): void {
  if (config.logLevel === 'debug') {
    logMessage('debug', message);
  }
}

export function logError(message: string, error?: Error): void {
  logMessage('error', message);
  if (error) {
    console.error(error);
  }
}

export function logWarn(message: string): void {
  logMessage('warn', message);
}
