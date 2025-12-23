/**
 * Logger interface for domain modules
 * Domain code should use this interface instead of concrete logger implementations
 * This allows domain code to be tested and reused in different environments
 */

export interface ILogger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

/**
 * No-op logger implementation for use when logging is not needed
 */
export const noOpLogger: ILogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

