import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Building2, Mail, Phone, Globe } from 'lucide-react'
import { PartnerConfig } from '../../types'

const basicInfoSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  website: z.string().url('Please enter a valid website URL').optional().or(z.literal('')),
})

type BasicInfoForm = z.infer<typeof basicInfoSchema>

interface BasicInfoStepProps {
  config: PartnerConfig
  onUpdate: (updates: Partial<PartnerConfig>) => void
  onNext: () => void
  onPrev: () => void
}

export function BasicInfoStep({ config, onUpdate, onNext }: BasicInfoStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm<BasicInfoForm>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      name: config.name,
      companyName: config.companyName,
      email: config.email,
      phone: config.phone,
      website: config.website || '',
    },
    mode: 'onChange',
  })

  // Watch form changes and update config in real-time
  React.useEffect(() => {
    const subscription = watch((value) => {
      if (value) {
        onUpdate({
          name: value.name,
          companyName: value.companyName,
          email: value.email,
          phone: value.phone,
          website: value.website,
        })
      }
    })
    return () => subscription.unsubscribe()
  }, [watch, onUpdate])

  const onSubmit = (data: BasicInfoForm) => {
    onUpdate(data)
    onNext()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Person Name */}
        <div>
          <label className="form-label">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-gray-500" />
              <span>Contact Person Name</span>
            </div>
          </label>
          <input
            {...register('name')}
            type="text"
            className={`form-input ${errors.name ? 'border-red-500 focus:ring-red-500' : ''}`}
            placeholder="Enter your full name"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        {/* Company Name */}
        <div>
          <label className="form-label">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-gray-500" />
              <span>Company Name</span>
            </div>
          </label>
          <input
            {...register('companyName')}
            type="text"
            className={`form-input ${errors.companyName ? 'border-red-500 focus:ring-red-500' : ''}`}
            placeholder="Enter your company name"
          />
          {errors.companyName && (
            <p className="mt-1 text-sm text-red-600">{errors.companyName.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="form-label">
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-gray-500" />
              <span>Business Email</span>
            </div>
          </label>
          <input
            {...register('email')}
            type="email"
            className={`form-input ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
            placeholder="business@company.com"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="form-label">
            <div className="flex items-center space-x-2">
              <Phone className="w-4 h-4 text-gray-500" />
              <span>Phone Number</span>
            </div>
          </label>
          <input
            {...register('phone')}
            type="tel"
            className={`form-input ${errors.phone ? 'border-red-500 focus:ring-red-500' : ''}`}
            placeholder="+1 (555) 123-4567"
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
          )}
        </div>

        {/* Website */}
        <div className="md:col-span-2">
          <label className="form-label">
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4 text-gray-500" />
              <span>Website (Optional)</span>
            </div>
          </label>
          <input
            {...register('website')}
            type="url"
            className={`form-input ${errors.website ? 'border-red-500 focus:ring-red-500' : ''}`}
            placeholder="https://www.company.com"
          />
          {errors.website && (
            <p className="mt-1 text-sm text-red-600">{errors.website.message}</p>
          )}
        </div>
      </div>

      {/* Information Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="w-5 h-5 text-blue-600 mt-0.5">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-medium text-blue-900 mb-1">
              Why do we need this information?
            </h4>
            <p className="text-sm text-blue-800">
              This information helps us create your personalized app and ensures proper branding. 
              Your contact details will be used for app store publishing and support purposes.
            </p>
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-500">
          Step 1 of 5 • Basic Information
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-sm text-gray-500">
            {isValid ? 'Ready to continue' : 'Fill in required fields'}
          </div>
          <div className={`w-2 h-2 rounded-full ${isValid ? 'bg-green-500' : 'bg-gray-300'}`} />
        </div>
      </div>
    </form>
  )
} 