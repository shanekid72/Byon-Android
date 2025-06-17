import { apiClient, ApiResponse } from './api'
import { PartnerConfig } from '../types'

export interface Partner {
  id: string
  name: string
  companyName: string
  email: string
  phone: string
  website?: string
  status: 'active' | 'inactive' | 'pending'
  createdAt: string
  updatedAt: string
}

export interface PartnerStats {
  totalBuilds: number
  successfulBuilds: number
  failedBuilds: number
  averageBuildTime: number
  lastBuildDate?: string
}

export interface CreatePartnerRequest {
  name: string
  companyName: string
  email: string
  phone: string
  website?: string
}

export interface UpdatePartnerConfigRequest {
  config: Partial<PartnerConfig>
}

class PartnerService {
  /**
   * Register a new partner
   */
  async registerPartner(data: CreatePartnerRequest): Promise<ApiResponse<Partner>> {
    try {
      const response = await apiClient.post('/partners/register', data)
      return response.data
    } catch (error) {
      console.error('Failed to register partner:', error)
      throw error
    }
  }

  /**
   * Get partner details by ID
   */
  async getPartner(partnerId: string): Promise<ApiResponse<Partner>> {
    try {
      const response = await apiClient.get(`/partners/${partnerId}`)
      return response.data
    } catch (error) {
      console.error('Failed to get partner:', error)
      throw error
    }
  }

  /**
   * Update partner configuration
   */
  async updatePartnerConfig(
    partnerId: string, 
    data: UpdatePartnerConfigRequest
  ): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.put(`/partners/${partnerId}/config`, data)
      return response.data
    } catch (error) {
      console.error('Failed to update partner config:', error)
      throw error
    }
  }

  /**
   * Get partner statistics
   */
  async getPartnerStats(partnerId: string): Promise<ApiResponse<PartnerStats>> {
    try {
      const response = await apiClient.get(`/partners/${partnerId}/stats`)
      return response.data
    } catch (error) {
      console.error('Failed to get partner stats:', error)
      throw error
    }
  }

  /**
   * Get partner builds
   */
  async getPartnerBuilds(
    partnerId: string, 
    options?: { limit?: number; offset?: number; status?: string }
  ): Promise<ApiResponse<any[]>> {
    try {
      const params = new URLSearchParams()
      if (options?.limit) params.append('limit', options.limit.toString())
      if (options?.offset) params.append('offset', options.offset.toString())
      if (options?.status) params.append('status', options.status)

      const response = await apiClient.get(`/partners/${partnerId}/builds?${params}`)
      return response.data
    } catch (error) {
      console.error('Failed to get partner builds:', error)
      throw error
    }
  }
}

export const partnerService = new PartnerService()
export default partnerService 