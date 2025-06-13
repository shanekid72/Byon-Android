import { createLogger, format, transports } from 'winston'

// Create a winston logger instance
export const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: { service: 'asset-processor' },
  transports: [
    // Write all logs with importance level of `error` or less to `error.log`
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    // Write all logs with importance level of `info` or less to `combined.log`
    new transports.File({ filename: 'logs/combined.log' }),
  ],
})

// If we're not in production then log to the console too
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: format.combine(
      format.colorize(),
      format.simple()
    )
  }))
}

export default logger 