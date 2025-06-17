import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { logger } from '../../utils/logger'

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        partnerId: string;
        email: string;
        isAdmin: boolean;
      };
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and adds user information to request object
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'No authorization header provided'
      })
    }
    
    // Check if token is in correct format
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Invalid authentication format',
        message: 'Authorization header must start with Bearer'
      })
    }
    
    // Extract token from header
    const token = authHeader.split(' ')[1]
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'No token provided'
      })
    }
    
    // Verify token
    const secret = process.env.JWT_SECRET || 'default-secret-key-for-development'
    const decoded = jwt.verify(token, secret) as {
      id: string;
      partnerId: string;
      email: string;
      isAdmin: boolean;
    }
    
    // Add user information to request object
    req.user = decoded
    
    next()
  } catch (error: unknown) {
    logger.error('Authentication error:', error)
    
    if (typeof error === 'object' && error !== null && 'name' in error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token expired',
          message: 'Your session has expired. Please log in again.'
        })
      }
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          error: 'Invalid token',
          message: 'The provided authentication token is invalid.'
        })
      }
    }
    
    return res.status(500).json({
      success: false,
      error: 'Authentication error',
      message: 'An error occurred during authentication.'
    })
  }
}

/**
 * Admin middleware
 * Ensures the authenticated user is an admin
 */
export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'You must be authenticated to access this resource.'
    })
  }
  
  if (!req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'You do not have permission to access this resource.'
    })
  }
  
  next()
} 