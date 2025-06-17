import { PartnerConfig } from '../../types'

interface FeaturesStepProps {
  config: PartnerConfig
  onUpdate: (updates: Partial<PartnerConfig>) => void
  onNext: () => void
  onPrev: () => void
}

export function FeaturesStep({ config, onUpdate }: FeaturesStepProps) {
  const handleFeatureToggle = (feature: keyof typeof config.features) => {
    onUpdate({
      features: {
        ...config.features,
        [feature]: !config.features[feature],
      }
    })
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Select Features</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(config.features).map(([key, value]) => (
          <label key={key} className="flex items-center space-x-3 p-3 border rounded-lg">
            <input
              type="checkbox"
              checked={value}
              onChange={() => handleFeatureToggle(key as keyof typeof config.features)}
              className="rounded"
            />
            <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
          </label>
        ))}
      </div>
    </div>
  )
} 