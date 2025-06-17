import { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '../../utils/logger'

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  // Add request ID
  req.headers['x-request-id'] = req.headers['x-request-id'] || uuidv4()
  
  const start = Date.now()
  
  res.on('finish', () => {
    const duration = Date.now() - start
    
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      requestId: req.headers['x-request-id']
    })
  })
  
  next()
} 