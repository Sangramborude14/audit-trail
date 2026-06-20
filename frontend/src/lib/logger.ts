export interface LogContext {
  tenantId?: string;
  correlationId?: string;
}

export class StructuredLogger {
  private context: LogContext;

  constructor(context: LogContext = {}) {
    this.context = {
      tenantId: context.tenantId || 'UNKNOWN',
      correlationId: context.correlationId || 'UNKNOWN',
    };
  }

  /**
   * Generates a unique correlation ID (UUID) using native Web Crypto APIs.
   * Works on both Node.js and Edge runtimes.
   */
  static generateCorrelationId(): string {
    return crypto.randomUUID();
  }

  /**
   * Updates active logging context
   */
  setContext(context: Partial<LogContext>) {
    this.context = {
      ...this.context,
      ...context,
    };
  }

  private log(
    level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG',
    message: string,
    meta: Record<string, any> = {}
  ) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      tenantId: this.context.tenantId,
      correlationId: this.context.correlationId,
      ...meta,
    };
    console.log(JSON.stringify(logEntry));
  }

  info(message: string, meta?: Record<string, any>) {
    this.log('INFO', message, meta);
  }

  warn(message: string, meta?: Record<string, any>) {
    this.log('WARN', message, meta);
  }

  error(message: string, meta?: Record<string, any>) {
    this.log('ERROR', message, meta);
  }

  debug(message: string, meta?: Record<string, any>) {
    this.log('DEBUG', message, meta);
  }
}
