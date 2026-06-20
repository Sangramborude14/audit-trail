import { StructuredLogger } from './logger';

export interface TraceContext {
  tenantId?: string;
  correlationId?: string;
}

/**
 * High-order function wrapping execution blocks to measure latencies.
 * Captures start/end events, execution durations, database/S3 speeds, and downstream AI response times.
 */
export async function withTracing<T>(
  spanName: string,
  fn: () => Promise<T>,
  context: TraceContext = {}
): Promise<T> {
  const logger = new StructuredLogger(context);
  const start = performance.now();

  logger.info(`[TRACE-START] Starting execution span: ${spanName}`);

  try {
    const result = await fn();
    const duration = performance.now() - start;

    logger.info(`[TRACE-END] Completed execution span: ${spanName}`, {
      durationMs: parseFloat(duration.toFixed(3)),
      success: true,
    });

    return result;
  } catch (error: any) {
    const duration = performance.now() - start;

    logger.error(`[TRACE-ERROR] Exception thrown in span: ${spanName}`, {
      durationMs: parseFloat(duration.toFixed(3)),
      success: false,
      errorMessage: error.message || String(error),
      errorStack: error.stack,
    });

    throw error;
  }
}
