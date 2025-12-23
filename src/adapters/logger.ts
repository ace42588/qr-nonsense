/**
 * Logger adapter implementation
 * Bridges the application logger to the domain logger interface
 */

import { log } from "@/lib/logger";
import { ILogger } from "@/domain/shared/logger";

/**
 * Logger adapter that implements ILogger using the application logger
 */
export const logger: ILogger = {
  debug: (message: string, ...args: any[]) => log.debug(message, ...args),
  info: (message: string, ...args: any[]) => log.info(message, ...args),
  warn: (message: string, ...args: any[]) => log.warn(message, ...args),
  error: (message: string, ...args: any[]) => log.error(message, ...args),
};

