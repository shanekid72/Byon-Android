import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Home, 
  Send, 
  Users, 
  User, 
  Settings,
  ArrowLeft,
  Bell,
  Menu,
  Plus,
  CreditCard,
  Phone,
  Zap
} from 'lucide-react'
import { PartnerConfig, AppScreen } from '../types'

interface AppPreviewProps {
  config: PartnerConfig
  className?: string
}

const screens: { id: AppScreen; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'splash', label: 'Splash', icon: Zap },
  { id: 'login', label: 'Login', icon: User },
  { id: 'home', label: 'Home', icon: Home },
  { id: 'send-money', label: 'Send Money', icon: Send },
  { id: 'recipients', label: 'Recipients', icon: Users },
  { id: 'profile', label: 'Profile', icon: Settings },
]

export function AppPreview({ config, className = '' }: AppPreviewProps) {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('home')
  const [isLoading, setIsLoading] = useState(false)

  const handleScreenChange = (screen: AppScreen) => {
    setIsLoading(true)
    setTimeout(() => {
      setCurrentScreen(screen)
      setIsLoading(false)
    }, 300)
  }

  const primaryColor = config.branding.primaryColor || '#05A8E4'
  const backgroundColor = config.branding.backgroundColor || '#FFFFFF'
  const textColor = config.branding.textColor || '#1F2937'

  const renderScreen = () => {
    switch (currentScreen) {
      case 'splash':
        return (
          <div 
            className="flex flex-col items-center justify-center h-full text-white text-center"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4">
              <Send className="w-8 h-8" style={{ color: primaryColor }} />
            </div>
            <h1 className="text-2xl font-bold mb-2">
              {config.appConfig.appName || 'Your App'}
            </h1>
            <p className="text-sm opacity-90">
              Fast & Secure Money Transfer
            </p>
            <div className="mt-8">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        )

      case 'login':
        return (
          <div className="flex flex-col h-full" style={{ backgroundColor }}>
            <div 
              className="flex-1 flex flex-col justify-center px-6 py-8 text-white"
              style={{ backgroundColor: primaryColor }}
            >
              <div className="text-center mb-8">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send className="w-6 h-6" style={{ color: primaryColor }} />
                </div>
                <h1 className="text-xl font-bold">
                  Welcome to {config.appConfig.appName || 'Your App'}
                </h1>
                <p className="text-sm opacity-90 mt-2">
                  Send money anywhere, anytime
                </p>
              </div>
            </div>
            
            <div className="px-6 py-8">
              <div className="space-y-4">
                <div>
                  <input
                    type="tel"
                    placeholder="Enter phone number"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                    style={{ borderColor: primaryColor, '--tw-ring-color': primaryColor } as any}
                  />
                </div>
                <button
                  className="w-full py-3 rounded-lg font-medium text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  Send OTP
                </button>
                <button
                  className="w-full py-3 rounded-lg font-medium border-2"
                  style={{ borderColor: primaryColor, color: primaryColor }}
                >
                  Use Biometrics
                </button>
              </div>
            </div>
          </div>
        )

      case 'home':
        return (
          <div className="flex flex-col h-full" style={{ backgroundColor }}>
            {/* Header */}
            <div 
              className="px-4 py-6 text-white"
              style={{ backgroundColor: primaryColor }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                    <User className="w-4 h-4" style={{ color: primaryColor }} />
                  </div>
                  <div>
                    <p className="text-sm opacity-90">Welcome back</p>
                    <p className="font-semibold">John Doe</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 bg-white/20 rounded-lg">
                    <Bell className="w-4 h-4" />
                  </button>
                  <button className="p-2 bg-white/20 rounded-lg">
                    <Menu className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="bg-white/20 rounded-lg p-4">
                <p className="text-sm opacity-90 mb-1">Available Balance</p>
                <p className="text-2xl font-bold">$2,459.50</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="px-4 py-6">
              <h3 className="font-semibold mb-4" style={{ color: textColor }}>
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  className="p-4 rounded-lg border-2 flex flex-col items-center space-y-2"
                  style={{ borderColor: primaryColor }}
                >
                  <Send className="w-6 h-6" style={{ color: primaryColor }} />
                  <span className="text-sm font-medium">Send Money</span>
                </button>
                <button
                  className="p-4 rounded-lg border-2 flex flex-col items-center space-y-2"
                  style={{ borderColor: primaryColor }}
                >
                  <CreditCard className="w-6 h-6" style={{ color: primaryColor }} />
                  <span className="text-sm font-medium">Pay Bill</span>
                </button>
                <button
                  className="p-4 rounded-lg border-2 flex flex-col items-center space-y-2"
                  style={{ borderColor: primaryColor }}
                >
                  <Phone className="w-6 h-6" style={{ color: primaryColor }} />
                  <span className="text-sm font-medium">Recharge</span>
                </button>
                <button
                  className="p-4 rounded-lg border-2 flex flex-col items-center space-y-2"
                  style={{ borderColor: primaryColor }}
                >
                  <Plus className="w-6 h-6" style={{ color: primaryColor }} />
                  <span className="text-sm font-medium">More</span>
                </button>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="px-4 pb-6">
              <h3 className="font-semibold mb-4" style={{ color: textColor }}>
                Recent Transactions
              </h3>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <Send className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Money Transfer</p>
                        <p className="text-xs text-gray-500">To John Doe</p>
                      </div>
                    </div>
                    <span className="font-medium text-sm">-$125.00</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case 'send-money':
        return (
          <div className="flex flex-col h-full" style={{ backgroundColor }}>
            {/* Header */}
            <div 
              className="px-4 py-4 text-white flex items-center space-x-3"
              style={{ backgroundColor: primaryColor }}
            >
              <button onClick={() => setCurrentScreen('home')}>
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-lg font-semibold">Send Money</h1>
            </div>

            <div className="flex-1 px-4 py-6">
              <div className="space-y-6">
                {/* Recipient */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: textColor }}>
                    Send to
                  </label>
                  <div className="flex items-center space-x-3 p-3 border border-gray-300 rounded-lg">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">John Doe</p>
                      <p className="text-sm text-gray-500">+1234567890</p>
                    </div>
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: textColor }}>
                    Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-500">$</span>
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg text-lg font-semibold focus:outline-none focus:ring-2"
                      style={{ '--tw-ring-color': primaryColor } as any}
                    />
                  </div>
                </div>

                {/* Purpose */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: textColor }}>
                    Purpose
                  </label>
                  <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2">
                    <option>Family Support</option>
                    <option>Education</option>
                    <option>Medical</option>
                    <option>Business</option>
                  </select>
                </div>
              </div>

              <div className="mt-8">
                <button
                  className="w-full py-3 rounded-lg font-medium text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )

      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: primaryColor }}
              >
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2" style={{ color: textColor }}>
                {screens.find(s => s.id === currentScreen)?.label} Screen
              </h3>
              <p className="text-sm text-gray-500">
                This screen is under development
              </p>
            </div>
          </div>
        )
    }
  }

  return (
    <div className={`${className}`}>
      {/* Screen Selector */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {screens.map((screen) => {
            const Icon = screen.icon
            return (
              <button
                key={screen.id}
                onClick={() => handleScreenChange(screen.id)}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  currentScreen === screen.id
                    ? 'text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                style={{
                  backgroundColor: currentScreen === screen.id ? primaryColor : 'transparent'
                }}
              >
                <Icon className="w-3 h-3" />
                <span>{screen.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Phone Mockup */}
      <div className="flex justify-center">
        <div className="phone-mockup">
          <div className="phone-notch" />
          <div className="phone-screen">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentScreen}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div 
                      className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                      style={{ borderColor: primaryColor }}
                    />
                  </div>
                ) : (
                  renderScreen()
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* App Info */}
      <div className="mt-4 text-center">
        <h4 className="font-semibold text-gray-900">
          {config.appConfig.appName || 'Your App Name'}
        </h4>
        <p className="text-sm text-gray-500 mt-1">
          v{config.appConfig.version} • {config.appConfig.category}
        </p>
      </div>
    </div>
  )
} 