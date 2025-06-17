import { PartnerConfig } from '../../types'

interface PreviewStepProps {
  config: PartnerConfig
  onUpdate: (updates: Partial<PartnerConfig>) => void
  onNext: () => void
  onPrev: () => void
}

export function PreviewStep({ config }: PreviewStepProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Review Your Configuration</h3>
      
      <div className="bg-gray-50 rounded-lg p-6 space-y-4">
        <div>
          <h4 className="font-medium text-gray-900">Company Information</h4>
          <p className="text-sm text-gray-600">{config.companyName}</p>
          <p className="text-sm text-gray-600">{config.email}</p>
        </div>
        
        <div>
          <h4 className="font-medium text-gray-900">App Details</h4>
          <p className="text-sm text-gray-600">Name: {config.appConfig.appName}</p>
          <p className="text-sm text-gray-600">Version: {config.appConfig.version}</p>
        </div>
        
        <div>
          <h4 className="font-medium text-gray-900">Branding</h4>
          <div className="flex space-x-2 mt-2">
            <div 
              className="w-6 h-6 rounded border"
              style={{ backgroundColor: config.branding.primaryColor }}
            />
            <div 
              className="w-6 h-6 rounded border"
              style={{ backgroundColor: config.branding.secondaryColor }}
            />
            <div 
              className="w-6 h-6 rounded border"
              style={{ backgroundColor: config.branding.accentColor }}
            />
          </div>
        </div>
      </div>
      
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-sm text-green-800">
          Ready to generate your app! Click "Generate App" to proceed.
        </p>
      </div>
    </div>
  )
} 