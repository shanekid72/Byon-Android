import mongoose from 'mongoose'
import redis from 'redis'
import { logger } from './temp-utils'

let redisClient: any = null
let mongoConnection: typeof mongoose | null = null

// MongoDB connection configuration
const mongoConfig = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4, // Use IPv4, skip trying IPv6
}

// Redis connection configuration
const redisConfig = {
  socket: {
    connectTimeout: 60000,
    lazyConnect: true,
    reconnectStrategy: (retries: number) => Math.min(retries * 50, 500)
  },
  retry_strategy: (options: any) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      return new Error('The server refused the connection')
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      return new Error('Retry time exhausted')
    }
    if (options.attempt > 10) {
      return undefined
    }
    return Math.min(options.attempt * 100, 3000)
  }
}

// MongoDB connection
export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lulupay_builds'
    
    mongoose.set('strictQuery', false)
    
    const conn = await mongoose.connect(mongoUri, mongoConfig)
    mongoConnection = conn
    
    logger.info(`MongoDB Connected: ${conn.connection.host}`)
    
    // Set up connection event listeners
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err)
    })
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected')
    })
    
    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected')
    })
    
  } catch (error) {
    logger.error('MongoDB connection failed:', error)
    // Don't exit in development, just log the error
    if (process.env.NODE_ENV === 'production') {
      process.exit(1)
    }
  }
}

// Redis connection
export const connectRedis = async (): Promise<any> => {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
    
    redisClient = redis.createClient({
      url: redisUrl,
      ...redisConfig
    })

    redisClient.on('error', (err: Error) => {
      logger.error('Redis connection error:', err)
    })

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully')
    })
    
    redisClient.on('ready', () => {
      logger.info('Redis ready to receive commands')
    })

    redisClient.on('reconnecting', () => {
      logger.info('Redis reconnecting...')
    })

    await redisClient.connect()
    return redisClient
  } catch (error) {
    logger.error('Redis connection failed:', error)
    // Don't throw in development
    if (process.env.NODE_ENV === 'production') {
      throw error
    }
    return null
  }
}

// Health check functions
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    if (!mongoConnection) {
      return false
    }
    
    const state = mongoose.connection.readyState
    return state === 1 // 1 = connected
  } catch (error) {
    logger.error('Database health check failed:', error)
    return false
  }
}

export const checkRedisConnection = async (): Promise<boolean> => {
  try {
    if (!redisClient || !redisClient.isOpen) {
      return false
    }
    
    const result = await redisClient.ping()
    return result === 'PONG'
  } catch (error) {
    logger.error('Redis health check failed:', error)
    return false
  }
}

// Database operations helpers
export const getDatabaseStats = async () => {
  try {
    const mongoStats = await mongoose.connection.db?.stats()
    const redisInfo = redisClient ? await redisClient.info() : null
    
    return {
      mongodb: {
        connected: mongoose.connection.readyState === 1,
        database: mongoose.connection.name,
        collections: mongoStats?.collections || 0,
        dataSize: mongoStats?.dataSize || 0,
        indexSize: mongoStats?.indexSize || 0
      },
      redis: {
        connected: redisClient?.isOpen || false,
        info: redisInfo ? redisInfo.split('\r\n').slice(0, 5) : []
      }
    }
  } catch (error) {
    logger.error('Failed to get database stats:', error)
    return null
  }
}

// Get connections
export const getMongoConnection = () => mongoConnection
export const getRedisClient = () => redisClient

// Close connections gracefully
export const closeConnections = async (): Promise<void> => {
  try {
    if (mongoConnection) {
      await mongoose.connection.close()
      mongoConnection = null
      logger.info('MongoDB connection closed')
    }
    
    if (redisClient && redisClient.isOpen) {
      await redisClient.quit()
      redisClient = null
      logger.info('Redis connection closed')
    }
  } catch (error) {
    logger.error('Error closing database connections:', error)
  }
}

// Initialize all database connections
export const initializeDatabases = async (): Promise<void> => {
  logger.info('Initializing database connections...')
  
  await Promise.allSettled([
    connectDatabase(),
    connectRedis()
  ])
  
  logger.info('Database initialization completed')
} 