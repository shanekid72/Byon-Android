import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Building2, 
  Palette, 
  Smartphone, 
  Settings, 
  Eye,
  ArrowRight, 
  ArrowLeft,
  CheckCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

import { PartnerConfig } from '../types'
import { StepIndicator } from '../components/StepIndicator'
import { BasicInfoStep } from '../components/onboarding/BasicInfoStep'
import { BrandingStep } from '../components/onboarding/BrandingStep'
import { AppConfigStep } from '../components/onboarding/AppConfigStep'
import { FeaturesStep } from '../components/onboarding/FeaturesStep'
import { PreviewStep } from '../components/onboarding/PreviewStep'
import { AppPreview } from '../components/AppPreview'
import { partnerService } from '../services/partnerService'

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  component: React.ComponentType<{
    config: PartnerConfig
    onUpdate: (updates: Partial<PartnerConfig>) => void
    onNext: () => void
    onPrev: () => void
  }>
}

const steps: OnboardingStep[] = [
  {
    id: 'basic-info',
    title: 'Basic Information',
    description: 'Tell us about your company',
    icon: Building2,
    component: BasicInfoStep,
  },
  {
    id: 'branding',
    title: 'Brand Customization',
    description: 'Upload logos and set your colors',
    icon: Palette,
    component: BrandingStep,
  },
  {
    id: 'app-config',
    title: 'App Configuration',
    description: 'Configure your app details',
    icon: Smartphone,
    component: AppConfigStep,
  },
  {
    id: 'features',
    title: 'Features & Services',
    description: 'Choose what features to include',
    icon: Settings,
    component: FeaturesStep,
  },
  {
    id: 'preview',
    title: 'Preview & Generate',
    description: 'Review and generate your app',
    icon: Eye,
    component: PreviewStep,
  },
]

const defaultConfig: PartnerConfig = {
  name: '',
  companyName: '',
  email: '',
  phone: '',
  website: '',
  status: 'draft',
  branding: {
    primaryColor: '#05A8E4',
    secondaryColor: '#0056b3',
    accentColor: '#FF6B35',
    backgroundColor: '#FFFFFF',
    textColor: '#1F2937',
    fontFamily: 'Inter',
    screenshots: [],
  },
  appConfig: {
    appName: '',
    packageName: '',
    bundleId: '',
    version: '1.0.0',
    versionCode: 1,
    description: '',
    shortDescription: '',
    keywords: [],
    category: 'Finance',
    permissions: [],
    supportedCountries: ['AE', 'IN', 'PH', 'BD'],
    supportedLanguages: ['en', 'ar', 'hi', 'ur'],
  },
  features: {
    remittance: true,
    billPayment: true,
    mobileRecharge: true,
    cardServices: false,
    biometricAuth: true,
    pushNotifications: true,
    chatSupport: false,
    loyaltyProgram: false,
    referralProgram: false,
    documentUpload: true,
    facialVerification: true,
    livenessDetection: true,
    bankTransfer: true,
    cardPayment: true,
    digitalWallet: false,
    cryptocurrency: false,
  },
  apiConfig: {
    baseUrl: 'https://api.lulupay.com',
    apiKey: '',
    partnerId: '',
    environment: 'sandbox',
    rateLimits: {
      requestsPerMinute: 100,
      requestsPerHour: 1000,
      requestsPerDay: 10000,
    },
  },
}

export function PartnerOnboarding() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [config, setConfig] = useState<PartnerConfig>(defaultConfig)
  const [isLoading, setIsLoading] = useState(false)

  const updateConfig = useCallback((updates: Partial<PartnerConfig>) => {
    setConfig(prev => ({
      ...prev,
      ...updates,
      branding: updates.branding ? { ...prev.branding, ...updates.branding } : prev.branding,
      appConfig: updates.appConfig ? { ...prev.appConfig, ...updates.appConfig } : prev.appConfig,
      features: updates.features ? { ...prev.features, ...updates.features } : prev.features,
      apiConfig: updates.apiConfig ? { ...prev.apiConfig, ...updates.apiConfig } : prev.apiConfig,
    }))
  }, [])

  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }, [currentStep])

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  const handleComplete = async () => {
    setIsLoading(true)
    try {
      // First, register the partner if not already registered
      let partnerId = config.id
      
      if (!partnerId) {
        toast.loading('Registering partner...', { id: 'partner-registration' })
        
        const registerResponse = await partnerService.registerPartner({
          name: config.name,
          companyName: config.companyName,
          email: config.email,
          phone: config.phone,
          website: config.website,
        })
        
        if (registerResponse.success && registerResponse.data) {
          partnerId = registerResponse.data.id
          toast.success('Partner registered successfully!', { id: 'partner-registration' })
        } else {
          throw new Error('Failed to register partner')
        }
      }
      
      // Update the configuration with partner ID
      const configToSave = {
        ...config,
        id: partnerId,
        status: 'generating' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      
      // Save partner configuration
      toast.loading('Saving configuration...', { id: 'config-save' })
      
      const configResponse = await partnerService.updatePartnerConfig(partnerId!, {
        config: configToSave
      })
      
      if (configResponse.success) {
        toast.success('Configuration saved successfully!', { id: 'config-save' })
        
        // Update local config with the saved data
        setConfig(configToSave)
        
        toast.success('🎉 Your app configuration is ready! Redirecting to app builder...')
        
        // Navigate to app builder with the saved configuration
        setTimeout(() => {
          navigate('/builder', { 
            state: { 
              config: configToSave,
              partnerId: partnerId 
            } 
          })
        }, 2000)
        
      } else {
        throw new Error('Failed to save configuration')
      }
      
    } catch (error: any) {
      console.error('Error in onboarding completion:', error)
      
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred'
      toast.error(`❌ Failed to complete onboarding: ${errorMessage}`)
      
      // If it's a network error, show connection guidance
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        toast.error('🔌 Unable to connect to backend. Please ensure the backend server is running on localhost:8080', {
          duration: 6000
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const currentStepData = steps[currentStep]
  const StepComponent = currentStepData.component

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create Your White-Label App
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Follow these simple steps to create a fully branded remittance app for your business
          </p>
        </div>

        {/* Step Indicator */}
        <StepIndicator
          steps={steps.map((step, index) => ({
            id: step.id,
            title: step.title,
            description: step.description,
            icon: step.icon,
            isActive: index === currentStep,
            isCompleted: index < currentStep,
            isLast: index === steps.length - 1,
          }))}
          currentStep={currentStep}
        />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Form Section */}
          <div className="lg:col-span-2">
            <div className="card p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-6">
                    <div className="flex items-center space-x-3 mb-2">
                      <currentStepData.icon className="w-6 h-6 text-brand-primary" />
                      <h2 className="text-2xl font-bold text-gray-900">
                        {currentStepData.title}
                      </h2>
                    </div>
                    <p className="text-gray-600">
                      {currentStepData.description}
                    </p>
                  </div>

                  <StepComponent
                    config={config}
                    onUpdate={updateConfig}
                    onNext={nextStep}
                    onPrev={prevStep}
                  />
                </motion.div>
              </AnimatePresence>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentStep === 0
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                {currentStep === steps.length - 1 ? (
                  <button
                    onClick={handleComplete}
                    disabled={isLoading}
                    className="flex items-center space-x-2 btn-primary px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Generate App</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={nextStep}
                    className="flex items-center space-x-2 btn-primary px-6 py-3"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Preview Section */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <div className="card p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Eye className="w-5 h-5 text-brand-primary" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Live Preview
                  </h3>
                </div>
                <AppPreview config={config} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 