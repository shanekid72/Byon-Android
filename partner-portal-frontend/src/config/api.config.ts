// API Configuration for different environments
export interface ApiConfig {
  baseUrl: string
  wsUrl: string
  timeout: number
  enableWebSockets: boolean
  enableRealTimeUpdates: boolean
}

// Development configuration
const development: ApiConfig = {
  baseUrl: 'http://localhost:8080',
  wsUrl: 'ws://localhost:8080/ws',
  timeout: 10000,
  enableWebSockets: true,
  enableRealTimeUpdates: true,
}

// Production configuration
const production: ApiConfig = {
  baseUrl: import.meta.env.VITE_API_URL || 'https://api.lulupay.com',
  wsUrl: import.meta.env.VITE_WS_URL || 'wss://api.lulupay.com/ws',
  timeout: 15000,
  enableWebSockets: true,
  enableRealTimeUpdates: true,
}

// Test configuration
const test: ApiConfig = {
  baseUrl: 'http://localhost:3001',
  wsUrl: 'ws://localhost:3001/ws',
  timeout: 5000,
  enableWebSockets: false,
  enableRealTimeUpdates: false,
}

// Get current environment
const getCurrentEnvironment = (): string => {
  return import.meta.env.MODE || 'development'
}

// Export configuration based on current environment
const getConfig = (): ApiConfig => {
  const env = getCurrentEnvironment()
  
  switch (env) {
    case 'production':
      return production
    case 'test':
      return test
    case 'development':
    default:
      return development
  }
}

export const apiConfig = getConfig()
export default apiConfig

// Helper functions
export const isDevelopment = () => getCurrentEnvironment() === 'development'
export const isProduction = () => getCurrentEnvironment() === 'production'
export const isTest = () => getCurrentEnvironment() === 'test' 