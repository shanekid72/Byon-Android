import { useState, useEffect, useCallback, useRef } from 'react'
import { checkBackendHealth } from '../services/api'
import toast from 'react-hot-toast'

interface BackendConnectionStatus {
  isConnected: boolean
  isLoading: boolean
  lastChecked: Date | null
  error: string | null
}

export const useBackendConnection = () => {
  const [status, setStatus] = useState<BackendConnectionStatus>({
    isConnected: false,
    isLoading: true,
    lastChecked: null,
    error: null
  })
  
  // Use refs to track previous connection state to avoid excessive notifications
  const prevConnectedRef = useRef<boolean | null>(null);
  const checkAttemptsRef = useRef(0);

  const checkConnection = useCallback(async (showToast = true) => {
    setStatus(prev => ({ ...prev, isLoading: true }))
    
    try {
      const isHealthy = await checkBackendHealth()
      const now = new Date();
      
      setStatus({
        isConnected: isHealthy,
        isLoading: false,
        lastChecked: now,
        error: isHealthy ? null : 'Backend server is not responding'
      })

      // Only show toast notifications when the connection state changes
      // or on first successful connection
      if (showToast) {
        if (isHealthy && (prevConnectedRef.current === false || prevConnectedRef.current === null)) {
          toast.success('✅ Backend connected successfully!', {
            id: 'backend-connection',
            duration: 3000
          })
        } else if (!isHealthy && (prevConnectedRef.current === true || checkAttemptsRef.current >= 2)) {
          // Only show error toast if we were previously connected or after multiple failed attempts
          toast.error('❌ Backend not responding', {
            id: 'backend-connection',
            duration: 5000
          })
        }
      }
      
      // Update previous connection state
      prevConnectedRef.current = isHealthy;
      
      // Reset check attempts on successful connection
      if (isHealthy) {
        checkAttemptsRef.current = 0;
      } else {
        checkAttemptsRef.current++;
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to connect to backend';
      const now = new Date();
      
      setStatus({
        isConnected: false,
        isLoading: false,
        lastChecked: now,
        error: errorMessage
      })

      // Only show error toast if we were previously connected or after multiple failed attempts
      if (showToast && (prevConnectedRef.current === true || checkAttemptsRef.current >= 2)) {
        toast.error(`❌ Backend connection failed`, {
          id: 'backend-connection',
          duration: 5000
        })
      }
      
      // Update previous connection state
      prevConnectedRef.current = false;
      checkAttemptsRef.current++;
    }
  }, [])

  // Initial connection check - don't show toast on first check
  useEffect(() => {
    checkConnection(false);
  }, [checkConnection])

  // Periodic health checks (every 30 seconds if not connected, every 60 seconds if connected)
  useEffect(() => {
    const interval = setInterval(
      () => checkConnection(false), // Don't show toast on periodic checks
      status.isConnected ? 60000 : 30000
    );
    return () => clearInterval(interval);
  }, [status.isConnected, checkConnection])

  // Manual retry function that shows toast notifications
  const retry = useCallback(() => {
    return checkConnection(true); // Show toast on manual retry
  }, [checkConnection]);

  return {
    ...status,
    checkConnection,
    retry
  }
} 