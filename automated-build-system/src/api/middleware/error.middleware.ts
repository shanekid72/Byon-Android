import { Request, Response, NextFunction } from 'express'
import { logger } from '../../utils/logger'

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error('API Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  })

  // Default error
  let status = 500
  let message = 'Internal Server Error'

  // Handle specific error types
  if (error.name === 'ValidationError') {
    status = 400
    message = error.message
  } else if (error.name === 'UnauthorizedError') {
    status = 401
    message = 'Unauthorized'
  } else if (error.status) {
    status = error.status
    message = error.message
  }

  res.status(status).json({
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || 'unknown'
  })
} 