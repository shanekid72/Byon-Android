import { useState } from 'react'
import { Upload, Image } from 'lucide-react'
import { PartnerConfig } from '../../types'

interface BrandingStepProps {
  config: PartnerConfig
  onUpdate: (updates: Partial<PartnerConfig>) => void
}

const colorPresets = [
  { name: 'LuluPay Blue', primary: '#05A8E4', secondary: '#0056b3', accent: '#FF6B35' },
  { name: 'Forest Green', primary: '#10B981', secondary: '#047857', accent: '#F59E0B' },
  { name: 'Royal Purple', primary: '#8B5CF6', secondary: '#6D28D9', accent: '#EF4444' },
  { name: 'Sunset Orange', primary: '#F97316', secondary: '#EA580C', accent: '#06B6D4' },
  { name: 'Rose Gold', primary: '#EC4899', secondary: '#BE185D', accent: '#84CC16' },
  { name: 'Ocean Blue', primary: '#0EA5E9', secondary: '#0284C7', accent: '#F59E0B' },
]

export function BrandingStep({ config, onUpdate }: BrandingStepProps) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)

  const handleColorPreset = (preset: typeof colorPresets[0]) => {
    setSelectedPreset(preset.name)
    onUpdate({
      branding: {
        ...config.branding,
        primaryColor: preset.primary,
        secondaryColor: preset.secondary,
        accentColor: preset.accent,
      }
    })
  }

  const handleColorChange = (colorType: keyof typeof config.branding, color: string) => {
    setSelectedPreset(null) // Clear preset selection when manually changing colors
    onUpdate({
      branding: {
        ...config.branding,
        [colorType]: color,
      }
    })
  }

  return (
    <div className="space-y-8">
      {/* Color Presets */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Choose a Color Scheme</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {colorPresets.map((preset) => (
            <button
              key={preset.name}
              onClick={() => handleColorPreset(preset)}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedPreset === preset.name
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex space-x-2 mb-2">
                <div
                  className="w-6 h-6 rounded"
                  style={{ backgroundColor: preset.primary }}
                />
                <div
                  className="w-6 h-6 rounded"
                  style={{ backgroundColor: preset.secondary }}
                />
                <div
                  className="w-6 h-6 rounded"
                  style={{ backgroundColor: preset.accent }}
                />
              </div>
              <p className="text-sm font-medium text-left">{preset.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Colors */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Custom Colors</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="form-label">Primary Color</label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={config.branding.primaryColor}
                onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                className="w-12 h-10 rounded border border-gray-300"
              />
              <input
                type="text"
                value={config.branding.primaryColor}
                onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                className="form-input flex-1"
                placeholder="#05A8E4"
              />
            </div>
          </div>

          <div>
            <label className="form-label">Secondary Color</label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={config.branding.secondaryColor}
                onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                className="w-12 h-10 rounded border border-gray-300"
              />
              <input
                type="text"
                value={config.branding.secondaryColor}
                onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                className="form-input flex-1"
                placeholder="#0056b3"
              />
            </div>
          </div>

          <div>
            <label className="form-label">Accent Color</label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={config.branding.accentColor}
                onChange={(e) => handleColorChange('accentColor', e.target.value)}
                className="w-12 h-10 rounded border border-gray-300"
              />
              <input
                type="text"
                value={config.branding.accentColor}
                onChange={(e) => handleColorChange('accentColor', e.target.value)}
                className="form-input flex-1"
                placeholder="#FF6B35"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Logo Upload */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Logo & Assets</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="form-label">App Logo</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">Upload your logo</p>
              <p className="text-xs text-gray-500">PNG, JPG up to 2MB</p>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    // Handle file upload here
                    console.log('Logo file:', file)
                  }
                }}
              />
            </div>
          </div>

          <div>
            <label className="form-label">App Icon</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <Image className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">Upload app icon</p>
              <p className="text-xs text-gray-500">PNG, 1024x1024px</p>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    // Handle file upload here
                    console.log('Icon file:', file)
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Typography */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Typography</h3>
        <div>
          <label className="form-label">Font Family</label>
          <select
            value={config.branding.fontFamily}
            onChange={(e) => onUpdate({
              branding: {
                ...config.branding,
                fontFamily: e.target.value,
              }
            })}
            className="form-input"
          >
            <option value="Inter">Inter (Default)</option>
            <option value="Roboto">Roboto</option>
            <option value="Open Sans">Open Sans</option>
            <option value="Lato">Lato</option>
            <option value="Montserrat">Montserrat</option>
            <option value="Poppins">Poppins</option>
          </select>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-500">
          Step 2 of 5 • Brand Customization
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-sm text-gray-500">
            Branding configured
          </div>
          <div className="w-2 h-2 rounded-full bg-green-500" />
        </div>
      </div>
    </div>
  )
} 