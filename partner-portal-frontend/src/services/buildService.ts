import { apiClient, ApiResponse } from './api'
import { PartnerConfig } from '../types'

export interface BuildRequest {
  partnerConfig: PartnerConfig
  buildOptions?: {
    platform: 'android' | 'ios'
    buildType: 'debug' | 'release'
    enableNotifications?: boolean
    customization?: Record<string, any>
  }
}

export interface Build {
  id: string
  partnerId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  platform: 'android' | 'ios'
  buildType: 'debug' | 'release'
  progress: number
  stage: string
  startTime: string
  endTime?: string
  duration?: number
  downloadUrl?: string
  logs: BuildLog[]
  errors: string[]
  warnings: string[]
}

export interface BuildLog {
  timestamp: string
  level: 'info' | 'warning' | 'error'
  message: string
  stage?: string
}

export interface BuildProgress {
  buildId: string
  status: string
  progress: number
  stage: string
  message: string
  timestamp: string
}

class BuildService {
  /**
   * Create a new build
   */
  async createBuild(data: BuildRequest): Promise<ApiResponse<{ buildId: string }>> {
    try {
      const response = await apiClient.post('/builds/create', data)
      return response.data
    } catch (error) {
      console.error('Failed to create build:', error)
      throw error
    }
  }

  /**
   * Get build status
   */
  async getBuildStatus(buildId: string): Promise<ApiResponse<Build>> {
    try {
      const response = await apiClient.get(`/builds/${buildId}/status`)
      return response.data
    } catch (error) {
      console.error('Failed to get build status:', error)
      throw error
    }
  }

  /**
   * Get build logs
   */
  async getBuildLogs(buildId: string): Promise<ApiResponse<BuildLog[]>> {
    try {
      const response = await apiClient.get(`/builds/${buildId}/logs`)
      return response.data
    } catch (error) {
      console.error('Failed to get build logs:', error)
      throw error
    }
  }

  /**
   * Download generated app
   */
  async downloadApp(buildId: string): Promise<Blob> {
    try {
      const response = await apiClient.get(`/builds/${buildId}/download`, {
        responseType: 'blob'
      })
      return response.data
    } catch (error) {
      console.error('Failed to download app:', error)
      throw error
    }
  }

  /**
   * Cancel build
   */
  async cancelBuild(buildId: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.delete(`/builds/${buildId}/cancel`)
      return response.data
    } catch (error) {
      console.error('Failed to cancel build:', error)
      throw error
    }
  }

  /**
   * List builds with pagination
   */
  async listBuilds(options?: {
    limit?: number
    offset?: number
    status?: string
    partnerId?: string
  }): Promise<ApiResponse<{ builds: Build[]; total: number }>> {
    try {
      const params = new URLSearchParams()
      if (options?.limit) params.append('limit', options.limit.toString())
      if (options?.offset) params.append('offset', options.offset.toString())
      if (options?.status) params.append('status', options.status)
      if (options?.partnerId) params.append('partnerId', options.partnerId)

      const response = await apiClient.get(`/builds?${params}`)
      return response.data
    } catch (error) {
      console.error('Failed to list builds:', error)
      throw error
    }
  }

  /**
   * Create WebSocket connection for real-time build updates
   */
  createWebSocketConnection(buildId: string): WebSocket {
    const wsUrl = `ws://localhost:8080/ws`
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('🔗 WebSocket connected for build:', buildId)
      // Subscribe to build progress
      ws.send(JSON.stringify({
        type: 'subscribe_build',
        buildId: buildId
      }))
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('📡 Build progress update:', data)
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected for build:', buildId)
    }

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error)
    }

    return ws
  }
}

export const buildService = new BuildService()
export default buildService 