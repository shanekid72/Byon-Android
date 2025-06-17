import mongoose from 'mongoose'
import { createClient } from 'redis'
import { logger, dbLogger } from './logger'

// MongoDB connection
let mongoConnection: typeof mongoose | null = null

// Redis connection
let redisClient: any = null

export const connectDatabase = async (): Promise<void> => {
  // Skip database connections in development if SKIP_DATABASE is set
  if (process.env.SKIP_DATABASE === 'true') {
    dbLogger.info('Skipping database connections (SKIP_DATABASE=true)')
    return
  }

  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lulupay_builds'
    
    mongoose.set('strictQuery', false)
    
    mongoConnection = await mongoose.connect(mongoUri, {
      // Remove deprecated options and use defaults
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })
    
    dbLogger.info('MongoDB connected successfully', { uri: mongoUri.replace(/\/\/.*@/, '//***:***@') })
    
    // Set up MongoDB event listeners
    mongoose.connection.on('error', (error) => {
      dbLogger.error('MongoDB connection error:', error)
    })
    
    mongoose.connection.on('disconnected', () => {
      dbLogger.warn('MongoDB disconnected')
    })
    
    mongoose.connection.on('reconnected', () => {
      dbLogger.info('MongoDB reconnected')
    })
    
  } catch (error) {
    dbLogger.error('Failed to connect to MongoDB:', error)
    throw error
  }
  
  try {
    // Connect to Redis
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
    
    redisClient = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 5000,
      },
    })
    
    redisClient.on('error', (error: Error) => {
      dbLogger.error('Redis connection error:', error)
    })
    
    redisClient.on('connect', () => {
      dbLogger.info('Redis connected successfully')
    })
    
    redisClient.on('reconnecting', () => {
      dbLogger.info('Redis reconnecting...')
    })
    
    redisClient.on('ready', () => {
      dbLogger.info('Redis client ready')
    })
    
    await redisClient.connect()
    
  } catch (error) {
    dbLogger.error('Failed to connect to Redis:', error)
    throw error
  }
}

export const disconnectDatabase = async (): Promise<void> => {
  try {
    // Disconnect MongoDB
    if (mongoConnection) {
      await mongoose.disconnect()
      mongoConnection = null
      dbLogger.info('MongoDB disconnected')
    }
    
    // Disconnect Redis
    if (redisClient) {
      await redisClient.quit()
      redisClient = null
      dbLogger.info('Redis disconnected')
    }
    
  } catch (error) {
    dbLogger.error('Error disconnecting from databases:', error)
    throw error
  }
}

export const getMongoConnection = (): typeof mongoose => {
  if (process.env.SKIP_DATABASE === 'true') {
    dbLogger.warn('MongoDB access attempted but database connections are skipped')
    return null as any
  }
  if (!mongoConnection) {
    throw new Error('MongoDB not connected. Call connectDatabase() first.')
  }
  return mongoConnection
}

export const getRedisClient = (): any => {
  if (process.env.SKIP_DATABASE === 'true') {
    dbLogger.warn('Redis access attempted but database connections are skipped')
    return null
  }
  if (!redisClient) {
    throw new Error('Redis not connected. Call connectDatabase() first.')
  }
  return redisClient
}

// Health check functions
export const checkMongoHealth = async (): Promise<{ status: string; details?: any }> => {
  try {
    if (!mongoConnection) {
      return { status: 'disconnected' }
    }
    
    const state = mongoose.connection.readyState
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    }
    
    if (state === 1) {
      // Test with a simple operation
      if (mongoose.connection.db) {
      await mongoose.connection.db.admin().ping()
      }
      return { 
        status: 'healthy',
        details: {
          state: states[state as keyof typeof states],
          host: mongoose.connection.host,
          port: mongoose.connection.port,
          name: mongoose.connection.name
        }
      }
    }
    
    return { 
      status: states[state as keyof typeof states] || 'unknown',
      details: { state }
    }
    
  } catch (error) {
    return { 
      status: 'error',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}

export const checkRedisHealth = async (): Promise<{ status: string; details?: any }> => {
  try {
    if (!redisClient) {
      return { status: 'disconnected' }
    }
    
    // Test with a simple operation
    const result = await redisClient.ping()
    
    if (result === 'PONG') {
      return {
        status: 'healthy',
        details: {
          response: result,
          isReady: redisClient.isReady,
          isOpen: redisClient.isOpen
        }
      }
    }
    
    return {
      status: 'error',
      details: { response: result }
    }
    
  } catch (error) {
    return {
      status: 'error',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}

// Utility functions for database operations
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      dbLogger.warn(`Database operation failed (attempt ${attempt}/${maxRetries}):`, error)
      
      if (attempt === maxRetries) {
        break
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt))
    }
  }
  
  throw lastError!
}

// Database cleanup utility
export const cleanupOldRecords = async (collection: string, field: string, olderThanDays: number): Promise<number> => {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)
    
    if (!mongoose.connection.db) {
      throw new Error('Database connection not available')
    }
    
    const result = await mongoose.connection.db.collection(collection).deleteMany({
      [field]: { $lt: cutoffDate }
    })
    
    dbLogger.info(`Cleaned up ${result.deletedCount} old records from ${collection}`)
    return result.deletedCount
    
  } catch (error) {
    dbLogger.error(`Failed to cleanup old records from ${collection}:`, error)
    throw error
  }
}

// Set up graceful shutdown for database connections
process.on('SIGINT', async () => {
  dbLogger.info('Received SIGINT. Closing database connections...')
  await disconnectDatabase()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  dbLogger.info('Received SIGTERM. Closing database connections...')
  await disconnectDatabase()
  process.exit(0)
})

export default {
  connect: connectDatabase,
  disconnect: disconnectDatabase,
  getMongoConnection,
  getRedisClient,
  checkMongoHealth,
  checkRedisHealth,
  withRetry,
  cleanupOldRecords
} 