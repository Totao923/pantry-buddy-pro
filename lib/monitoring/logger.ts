/**
 * Production Logging and Monitoring Utilities
 *
 * Provides structured logging, error tracking, and performance monitoring
 * for production environments.
 */

interface LogLevel {
  ERROR: 'error';
  WARN: 'warn';
  INFO: 'info';
  DEBUG: 'debug';
}

const LOG_LEVELS: LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
};

interface LogEntry {
  timestamp: string;
  level: keyof LogLevel;
  message: string;
  context?: Record<string, any>;
  userId?: string;
  requestId?: string;
  error?: Error;
}

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: string;
  context?: Record<string, any>;
  userId?: string;
}

class Logger {
  private isDevelopment: boolean;
  private enableConsoleOutput: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.enableConsoleOutput = this.isDevelopment || process.env.ENABLE_CONSOLE_LOGS === 'true';
  }

  private formatLog(entry: LogEntry): string {
    const { timestamp, level, message, context, userId, requestId, error } = entry;

    const logData = {
      timestamp,
      level,
      message,
      ...(userId && { userId }),
      ...(requestId && { requestId }),
      ...(context && { context }),
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: this.isDevelopment ? error.stack : undefined,
        },
      }),
    };

    return JSON.stringify(logData);
  }

  private output(entry: LogEntry): void {
    const formattedLog = this.formatLog(entry);

    if (this.enableConsoleOutput) {
      const colors: Record<string, string> = {
        ERROR: '\x1b[31m',
        WARN: '\x1b[33m',
        INFO: '\x1b[34m',
        DEBUG: '\x1b[36m',
        error: '\x1b[31m',
        warn: '\x1b[33m',
        info: '\x1b[34m',
        debug: '\x1b[36m',
        reset: '\x1b[0m',
      };

      const color = colors[entry.level] || colors.info;
      console.log(`${color}[${entry.level.toUpperCase()}]${colors.reset} ${formattedLog}`);
    }

    // In production, send to external logging service
    if (!this.isDevelopment) {
      this.sendToExternalService(entry);
    }
  }

  private async sendToExternalService(entry: LogEntry): Promise<void> {
    // Implement external logging service integration here
    // Examples: Sentry, LogRocket, DataDog, CloudWatch, etc.

    try {
      // Example for webhook-based logging service
      if (process.env.LOGGING_WEBHOOK_URL) {
        await fetch(process.env.LOGGING_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: this.formatLog(entry),
        });
      }
    } catch (error) {
      // Fallback to console if external service fails
      console.error('Failed to send log to external service:', error);
    }
  }

  error(message: string, context?: Record<string, any>, error?: Error): void {
    this.output({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message,
      context,
      error,
    });
  }

  warn(message: string, context?: Record<string, any>): void {
    this.output({
      timestamp: new Date().toISOString(),
      level: 'WARN',
      message,
      context,
    });
  }

  info(message: string, context?: Record<string, any>): void {
    this.output({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message,
      context,
    });
  }

  debug(message: string, context?: Record<string, any>): void {
    if (this.isDevelopment) {
      this.output({
        timestamp: new Date().toISOString(),
        level: 'DEBUG',
        message,
        context,
      });
    }
  }

  // Request-specific logging
  request(
    message: string,
    requestId: string,
    userId?: string,
    context?: Record<string, any>
  ): void {
    this.output({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message,
      context,
      userId,
      requestId,
    });
  }

  // Performance tracking
  performance(metric: PerformanceMetric): void {
    this.output({
      timestamp: metric.timestamp,
      level: 'INFO',
      message: `Performance: ${metric.name} took ${metric.duration}ms`,
      context: {
        metric: metric.name,
        duration: metric.duration,
        ...metric.context,
      },
      userId: metric.userId,
    });
  }
}

// Performance tracking utility
export class PerformanceTracker {
  private startTimes: Map<string, number> = new Map();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  start(name: string): void {
    this.startTimes.set(name, Date.now());
  }

  end(name: string, context?: Record<string, any>, userId?: string): number {
    const startTime = this.startTimes.get(name);
    if (!startTime) {
      this.logger.warn(`Performance tracking: No start time found for ${name}`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.startTimes.delete(name);

    this.logger.performance({
      name,
      duration,
      timestamp: new Date().toISOString(),
      context,
      userId,
    });

    return duration;
  }

  // Utility for timing async operations
  async time<T>(
    name: string,
    operation: () => Promise<T>,
    context?: Record<string, any>,
    userId?: string
  ): Promise<T> {
    this.start(name);
    try {
      const result = await operation();
      this.end(name, context, userId);
      return result;
    } catch (error) {
      this.end(name, { ...context, error: true }, userId);
      throw error;
    }
  }
}

// API Request tracking middleware utility
export function createRequestLogger(logger: Logger) {
  return function logRequest(req: any, res: any, next: () => void) {
    const requestId =
      req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    // Add request ID to request object for use in handlers
    req.requestId = requestId;

    logger.request(`${req.method} ${req.url} - Request started`, requestId, req.user?.id, {
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    });

    // Hook into response to log completion
    const originalSend = res.send;
    res.send = function (data: any) {
      const duration = Date.now() - startTime;

      logger.request(`${req.method} ${req.url} - Request completed`, requestId, req.user?.id, {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        responseSize: data ? Buffer.byteLength(data) : 0,
      });

      return originalSend.call(this, data);
    };

    next();
  };
}

// Error tracking utility
export class ErrorTracker {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  captureException(error: Error, context?: Record<string, any>, userId?: string): void {
    this.logger.error('Exception captured', { ...context, userId }, error);

    // Send to external error tracking service
    if (!process.env.NODE_ENV || process.env.NODE_ENV === 'production') {
      this.sendToErrorService(error, context, userId);
    }
  }

  private async sendToErrorService(
    error: Error,
    context?: Record<string, any>,
    userId?: string
  ): Promise<void> {
    try {
      // Example: Sentry integration
      if (process.env.SENTRY_DSN) {
        // Sentry.captureException(error, { user: { id: userId }, contexts: context });
      }

      // Example: Custom error service
      if (process.env.ERROR_TRACKING_WEBHOOK) {
        await fetch(process.env.ERROR_TRACKING_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: {
              name: error.name,
              message: error.message,
              stack: error.stack,
            },
            context,
            userId,
            timestamp: new Date().toISOString(),
          }),
        });
      }
    } catch (trackingError) {
      this.logger.error('Failed to send error to tracking service', {}, trackingError as Error);
    }
  }
}

// Health check utility
export class HealthChecker {
  private logger: Logger;
  private checks: Map<string, () => Promise<boolean>> = new Map();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  addCheck(name: string, check: () => Promise<boolean>): void {
    this.checks.set(name, check);
  }

  async runChecks(): Promise<{ healthy: boolean; checks: Record<string, boolean> }> {
    const results: Record<string, boolean> = {};
    let healthy = true;

    const checkPromises = Array.from(this.checks.entries()).map(async ([name, check]) => {
      try {
        const result = await check();
        results[name] = result;
        if (!result) healthy = false;
      } catch (error) {
        this.logger.error(`Health check failed: ${name}`, {}, error as Error);
        results[name] = false;
        healthy = false;
      }
    });

    await Promise.all(checkPromises);

    this.logger.info('Health check completed', { healthy, checks: results });
    return { healthy, checks: results };
  }
}

// Singleton instances
export const logger = new Logger();
export const performanceTracker = new PerformanceTracker(logger);
export const errorTracker = new ErrorTracker(logger);
export const healthChecker = new HealthChecker(logger);

// Default health checks
healthChecker.addCheck('database', async () => {
  // Add your database health check here
  return true; // Placeholder
});

healthChecker.addCheck('ai_service', async () => {
  // Add your AI service health check here
  return !!process.env.ANTHROPIC_API_KEY;
});

export default logger;
