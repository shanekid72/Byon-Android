import { Request, Response, NextFunction } from 'express'
import { logger } from '../../utils/temp-utils'

interface AppError extends Error {
  statusCode?: number
  status?: string
  isOperational?: boolean
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = { ...err }
  error.message = err.message

  // Log error
  logger.error('API Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  })

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found'
    error = { name: 'CastError', message, statusCode: 404 } as AppError
  }

  // Mongoose duplicate key
  if (err.name === 'MongoError' && (err as any).code === 11000) {
    const message = 'Duplicate field value entered'
    error = { name: 'MongoError', message, statusCode: 400 } as AppError
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values((err as any).errors).map((val: any) => val.message).join(', ')
    error = { name: 'ValidationError', message, statusCode: 400 } as AppError
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token'
    error = { name: 'JsonWebTokenError', message, statusCode: 401 } as AppError
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired'
    error = { name: 'TokenExpiredError', message, statusCode: 401 } as AppError
  }

  // Multer errors
  if (err.name === 'MulterError') {
    let message = 'File upload error'
    if ((err as any).code === 'LIMIT_FILE_SIZE') {
      message = 'File too large'
    } else if ((err as any).code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files'
    }
    error = { name: 'MulterError', message, statusCode: 400 } as AppError
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: error 
    })
  })
}

export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const error = new Error(`Not found - ${req.originalUrl}`) as AppError
  error.statusCode = 404
  next(error)
}

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next) 
