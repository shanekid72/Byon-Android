import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { apiConfig } from '../config/api.config'

// Create axios instance using configuration
export const apiClient: AxiosInstance = axios.create({
  // With the Vite proxy configuration, we need to use /api
  // The proxy will rewrite /api to an empty string when forwarding to http://localhost:8080
  baseURL: '/api',
  timeout: apiConfig.timeout,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

// Development helper function to set authentication token
export const setDevelopmentAuthToken = () => {
  // Check if we're in development and no token exists
  if (import.meta.env.DEV && !localStorage.getItem('auth_token')) {
    console.log('Setting development authentication token...');
    // This token is signed with the default development secret key
    const devToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImRldmVsb3BlciIsInBhcnRuZXJJZCI6ImRldmVsb3BlciIsImVtYWlsIjoiZGV2ZWxvcGVyQGx1bHVwYXkuY29tIiwiaXNBZG1pbiI6dHJ1ZSwiaWF0IjoxNjk4NzY1NDMyLCJleHAiOjE3MzAzMDE0MzJ9.qXwvdGdvE2KFhwbM1xTcH9yLH6YX_TYY-UgJJ9wRIY0';
    localStorage.setItem('auth_token', devToken);
    return true;
  }
  return false;
}

// Call this function immediately in development
if (import.meta.env.DEV) {
  setDevelopmentAuthToken();
}

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => {
    console.error('❌ API Request Error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`)
    return response
  },
  (error) => {
    console.error('❌ API Response Error:', error.response?.status, error.response?.data)
    
    // Handle common error cases
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login
      localStorage.removeItem('auth_token')
      // Don't redirect automatically - let the component handle this
      // window.location.href = '/login'
      console.warn('Authentication token expired or invalid')
      
      // In development, try to set a new token and reload
      if (import.meta.env.DEV) {
        if (setDevelopmentAuthToken()) {
          console.log('Development token set. Reloading page...');
          window.location.reload();
          return new Promise(() => {});
        }
      }
    }
    
    return Promise.reject(error)
  }
)

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// Health check function
export const checkBackendHealth = async (): Promise<boolean> => {
  console.log('Checking backend health...');
  
  try {
    // First try: Use the axios client with the proxy
    try {
      const response = await apiClient.get('/v1/health');
      if (response.status === 200) {
        console.log('Backend health check successful with API client');
        return true;
      }
    } catch (apiError) {
      console.warn('Health check failed with API client:', apiError);
    }
    
    // Second try: Direct fetch with CORS mode through proxy
    try {
      const response = await fetch('/api/v1/health', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        console.log('Backend health check successful with fetch API through proxy');
        return true;
      } else {
        console.warn(`Health check failed with status: ${response.status}`);
      }
    } catch (fetchError) {
      console.warn('Health check failed with fetch API through proxy:', fetchError);
    }
    
    // If we get here, all attempts failed
    return false;
  } catch (error) {
    console.error('Backend health check completely failed:', error);
    return false;
  }
}

export default apiClient 