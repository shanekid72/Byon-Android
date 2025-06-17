import { PartnerConfig } from '../../types'

interface AppConfigStepProps {
  config: PartnerConfig
  onUpdate: (updates: Partial<PartnerConfig>) => void
  onNext: () => void
  onPrev: () => void
}

export function AppConfigStep({ config, onUpdate }: AppConfigStepProps) {
  const handleAppConfigChange = (field: string, value: any) => {
    onUpdate({
      appConfig: {
        ...config.appConfig,
        [field]: value,
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">App Name</label>
          <input
            type="text"
            value={config.appConfig.appName}
            onChange={(e) => handleAppConfigChange('appName', e.target.value)}
            className="form-input"
            placeholder="My Remittance App"
          />
        </div>

        <div>
          <label className="form-label">Package Name</label>
          <input
            type="text"
            value={config.appConfig.packageName}
            onChange={(e) => handleAppConfigChange('packageName', e.target.value)}
            className="form-input"
            placeholder="com.company.remittance"
          />
        </div>

        <div>
          <label className="form-label">Version</label>
          <input
            type="text"
            value={config.appConfig.version}
            onChange={(e) => handleAppConfigChange('version', e.target.value)}
            className="form-input"
            placeholder="1.0.0"
          />
        </div>

        <div>
          <label className="form-label">Category</label>
          <select
            value={config.appConfig.category}
            onChange={(e) => handleAppConfigChange('category', e.target.value)}
            className="form-input"
          >
            <option value="Finance">Finance</option>
            <option value="Business">Business</option>
            <option value="Lifestyle">Lifestyle</option>
          </select>
        </div>
      </div>

      <div>
        <label className="form-label">App Description</label>
        <textarea
          value={config.appConfig.description}
          onChange={(e) => handleAppConfigChange('description', e.target.value)}
          className="form-input"
          rows={4}
          placeholder="Describe your app..."
        />
      </div>
    </div>
  )
} 