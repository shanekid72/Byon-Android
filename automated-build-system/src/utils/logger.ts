import winston from 'winston'
import path from 'path'

// Create logs directory if it doesn't exist
const logDir = process.env.LOG_DIR || './logs'

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
)

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta, null, 2)}`
    }
    
    return log
  })
)

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'lulupay-build-system' },
  transports: [
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // File transport for combined logs
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),
  ],
})

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'debug'
  }))
}

// Add console transport for production with info level
if (process.env.NODE_ENV === 'production' && process.env.LOG_CONSOLE === 'true') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'info'
  }))
}

// Create specialized loggers
export const buildLogger = logger.child({ component: 'build' })
export const apiLogger = logger.child({ component: 'api' })
export const dbLogger = logger.child({ component: 'database' })
export const queueLogger = logger.child({ component: 'queue' })
export const dockerLogger = logger.child({ component: 'docker' })

// Helper functions for structured logging
export const logBuildStart = (buildId: string, partnerId: string) => {
  buildLogger.info('Build started', {
    buildId,
    partnerId,
    event: 'build_start',
    timestamp: new Date().toISOString()
  })
}

export const logBuildProgress = (buildId: string, stage: string, progress: number, message?: string) => {
  buildLogger.info('Build progress', {
    buildId,
    stage,
    progress,
    message,
    event: 'build_progress',
    timestamp: new Date().toISOString()
  })
}

export const logBuildComplete = (buildId: string, status: 'success' | 'failed', buildTime?: number) => {
  buildLogger.info('Build completed', {
    buildId,
    status,
    buildTime,
    event: 'build_complete',
    timestamp: new Date().toISOString()
  })
}

export const logBuildError = (buildId: string, stage: string, error: Error | string) => {
  buildLogger.error('Build error', {
    buildId,
    stage,
    error: typeof error === 'string' ? error : error.message,
    stack: typeof error === 'object' ? error.stack : undefined,
    event: 'build_error',
    timestamp: new Date().toISOString()
  })
}

export const logApiRequest = (method: string, url: string, userId?: string, duration?: number) => {
  apiLogger.info('API request', {
    method,
    url,
    userId,
    duration,
    event: 'api_request',
    timestamp: new Date().toISOString()
  })
}

export const logApiError = (method: string, url: string, error: Error | string, statusCode?: number) => {
  apiLogger.error('API error', {
    method,
    url,
    error: typeof error === 'string' ? error : error.message,
    statusCode,
    event: 'api_error',
    timestamp: new Date().toISOString()
  })
}

export const logDatabaseOperation = (operation: string, collection?: string, duration?: number) => {
  dbLogger.info('Database operation', {
    operation,
    collection,
    duration,
    event: 'db_operation',
    timestamp: new Date().toISOString()
  })
}

export const logQueueOperation = (operation: string, jobId?: string, status?: string) => {
  queueLogger.info('Queue operation', {
    operation,
    jobId,
    status,
    event: 'queue_operation',
    timestamp: new Date().toISOString()
  })
}

export const logDockerOperation = (operation: string, containerId?: string, image?: string) => {
  dockerLogger.info('Docker operation', {
    operation,
    containerId,
    image,
    event: 'docker_operation',
    timestamp: new Date().toISOString()
  })
}

// Performance monitoring
export const createTimer = (label: string) => {
  const start = Date.now()
  
  return {
    end: () => {
      const duration = Date.now() - start
      logger.debug(`Timer: ${label}`, { duration, label })
      return duration
    }
  }
}

// Stream for Morgan HTTP logging
export const morganStream = {
  write: (message: string) => {
    apiLogger.info(message.trim())
  }
}

export default logger 