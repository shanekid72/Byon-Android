import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import {
  Activity, TrendingUp, TrendingDown, Users, Server, Database,
  Cpu, HardDrive, Network, AlertTriangle, CheckCircle, Clock,
  Settings, Maximize2, Minimize2, RefreshCw, Filter, Download
} from 'lucide-react'

// Types
interface DashboardMetrics {
  builds: {
    total: number
    active: number
    completed: number
    failed: number
    queueLength: number
    averageTime: number
    successRate: number
  }
  
  system: {
    cpuUsage: number
    memoryUsage: number
    diskUsage: number
    networkIO: { in: number; out: number }
    uptime: number
    activeConnections: number
  }
  
  business: {
    activeUsers: number
    totalRevenue: number
    conversionRate: number
    churnRate: number
    growthRate: number
    satisfaction: number
  }
  
  performance: {
    responseTime: number
    p95ResponseTime: number
    errorRate: number
    throughput: number
    cacheHitRatio: number
    apiCallsPerSecond: number
  }
}

interface TimeSeriesData {
  timestamp: string
  value: number
  label?: string
}

interface Widget {
  id: string
  type: 'metric' | 'chart' | 'list' | 'heatmap' | 'gauge'
  title: string
  size: 'small' | 'medium' | 'large' | 'xlarge'
  position: { x: number; y: number }
  data: any
  config: Record<string, any>
  isVisible: boolean
  isMaximized: boolean
}

interface DashboardProps {
  tenantId?: string
  refreshInterval?: number
  enableRealTime?: boolean
  initialWidgets?: Widget[]
  onMetricsUpdate?: (metrics: DashboardMetrics) => void
}

// Color schemes for charts
const chartColors = {
  primary: '#3B82F6',
  secondary: '#10B981',
  accent: '#F59E0B',
  danger: '#EF4444',
  warning: '#F97316',
  info: '#06B6D4',
  success: '#22C55E',
  neutral: '#6B7280'
}

const gradients = {
  blue: ['#3B82F6', '#1D4ED8'],
  green: ['#10B981', '#059669'],
  yellow: ['#F59E0B', '#D97706'],
  red: ['#EF4444', '#DC2626'],
  purple: ['#8B5CF6', '#7C3AED'],
  pink: ['#EC4899', '#DB2777']
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
}

const widgetVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24
    }
  },
  hover: {
    scale: 1.02,
    boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 10
    }
  }
}

const pulseVariants = {
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
}

// Mock data generator
const generateMockMetrics = (): DashboardMetrics => ({
  builds: {
    total: Math.floor(Math.random() * 1000) + 500,
    active: Math.floor(Math.random() * 20) + 5,
    completed: Math.floor(Math.random() * 800) + 400,
    failed: Math.floor(Math.random() * 50) + 10,
    queueLength: Math.floor(Math.random() * 15),
    averageTime: Math.floor(Math.random() * 300) + 180,
    successRate: Math.random() * 10 + 90
  },
  
  system: {
    cpuUsage: Math.random() * 30 + 40,
    memoryUsage: Math.random() * 20 + 60,
    diskUsage: Math.random() * 15 + 45,
    networkIO: {
      in: Math.random() * 100 + 50,
      out: Math.random() * 80 + 40
    },
    uptime: 99.9,
    activeConnections: Math.floor(Math.random() * 100) + 50
  },
  
  business: {
    activeUsers: Math.floor(Math.random() * 500) + 1200,
    totalRevenue: Math.floor(Math.random() * 10000) + 25000,
    conversionRate: Math.random() * 5 + 15,
    churnRate: Math.random() * 2 + 1,
    growthRate: Math.random() * 10 + 5,
    satisfaction: Math.random() * 0.5 + 4.5
  },
  
  performance: {
    responseTime: Math.random() * 100 + 150,
    p95ResponseTime: Math.random() * 200 + 300,
    errorRate: Math.random() * 2 + 0.5,
    throughput: Math.random() * 500 + 1000,
    cacheHitRatio: Math.random() * 10 + 85,
    apiCallsPerSecond: Math.random() * 200 + 800
  }
})

const generateTimeSeriesData = (points: number = 24): TimeSeriesData[] => {
  const data: TimeSeriesData[] = []
  const now = new Date()
  
  for (let i = points - 1; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000)
    data.push({
      timestamp: timestamp.toISOString(),
      value: Math.random() * 100 + 50,
      label: timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    })
  }
  
  return data
}

// Metric Card Component
const MetricCard: React.FC<{
  title: string
  value: string | number
  change?: number
  icon: React.ReactNode
  color: string
  isAnimated?: boolean
}> = ({ title, value, change, icon, color, isAnimated = true }) => {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`
      if (val >= 1000) return `${(val / 1000).toFixed(1)}K`
      return val.toFixed(1)
    }
    return val
  }

  return (
    <motion.div
      variants={widgetVariants}
      whileHover="hover"
      className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {title}
          </p>
          <motion.p
            key={value}
            initial={isAnimated ? { scale: 1.2, opacity: 0.8 } : {}}
            animate={{ scale: 1, opacity: 1 }}
            className="text-3xl font-bold text-gray-900 dark:text-white"
          >
            {formatValue(value)}
          </motion.p>
          {change !== undefined && (
            <div className={`flex items-center mt-2 text-sm ${
              change >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {change >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <span className="ml-1">{Math.abs(change).toFixed(1)}%</span>
            </div>
          )}
        </div>
        <motion.div
          variants={isAnimated ? pulseVariants : {}}
          animate={isAnimated ? "animate" : ""}
          className={`p-3 rounded-full bg-${color}-100 dark:bg-${color}-900/20`}
          style={{ backgroundColor: `${chartColors[color as keyof typeof chartColors]}20` }}
        >
          <div style={{ color: chartColors[color as keyof typeof chartColors] }}>
            {icon}
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

// Chart Components
const RealTimeLineChart: React.FC<{
  data: TimeSeriesData[]
  title: string
  color: string
  height?: number
}> = ({ data, title, color, height = 300 }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis 
            dataKey="label" 
            stroke="#6B7280"
            fontSize={12}
          />
          <YAxis stroke="#6B7280" fontSize={12} />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#1F2937',
              border: 'none',
              borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={chartColors[color as keyof typeof chartColors]}
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6, fill: chartColors[color as keyof typeof chartColors] }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

const GaugeChart: React.FC<{
  value: number
  max: number
  title: string
  color: string
  unit?: string
}> = ({ value, max, title, color, unit = '%' }) => {
  const percentage = (value / max) * 100
  const circumference = 2 * Math.PI * 40
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
        {title}
      </h3>
      <div className="flex items-center justify-center">
        <div className="relative w-32 h-32">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="#E5E7EB"
              strokeWidth="8"
              fill="none"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="40"
              stroke={chartColors[color as keyof typeof chartColors]}
              strokeWidth="8"
              fill="none"
              strokeDasharray={strokeDasharray}
              strokeLinecap="round"
              initial={{ strokeDasharray: `0 ${circumference}` }}
              animate={{ strokeDasharray }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="text-2xl font-bold text-gray-900 dark:text-white"
              >
                {value.toFixed(1)}{unit}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const ActivityFeed: React.FC<{
  activities: Array<{
    id: string
    type: 'build' | 'user' | 'system' | 'error'
    message: string
    timestamp: string
    severity: 'info' | 'warning' | 'error' | 'success'
  }>
}> = ({ activities }) => {
  const getActivityIcon = (type: string, severity: string) => {
    if (severity === 'error') return <AlertTriangle size={16} className="text-red-500" />
    if (severity === 'success') return <CheckCircle size={16} className="text-green-500" />
    if (severity === 'warning') return <Clock size={16} className="text-yellow-500" />
    
    switch (type) {
      case 'build': return <Activity size={16} className="text-blue-500" />
      case 'user': return <Users size={16} className="text-purple-500" />
      case 'system': return <Server size={16} className="text-gray-500" />
      default: return <Activity size={16} className="text-gray-500" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
      case 'warning': return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20'
      case 'success': return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
      default: return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Activity Feed
        </h3>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          <RefreshCw size={16} className="text-gray-600 dark:text-gray-400" />
        </motion.button>
      </div>
      
      <div className="space-y-3 max-h-80 overflow-y-auto">
        <AnimatePresence>
          {activities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-start space-x-3 p-3 rounded-lg border ${getSeverityColor(activity.severity)}`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getActivityIcon(activity.type, activity.severity)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-white">
                  {activity.message}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {new Date(activity.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

// System Status Component
const SystemStatus: React.FC<{
  metrics: DashboardMetrics['system']
}> = ({ metrics }) => {
  const statusItems = [
    { name: 'CPU Usage', value: metrics.cpuUsage, max: 100, color: 'primary', unit: '%' },
    { name: 'Memory Usage', value: metrics.memoryUsage, max: 100, color: 'secondary', unit: '%' },
    { name: 'Disk Usage', value: metrics.diskUsage, max: 100, color: 'warning', unit: '%' },
    { name: 'Uptime', value: metrics.uptime, max: 100, color: 'success', unit: '%' }
  ]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
        System Status
      </h3>
      
      <div className="space-y-4">
        {statusItems.map((item) => (
          <div key={item.name} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {item.name}
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {item.value.toFixed(1)}{item.unit}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <motion.div
                className="h-2 rounded-full"
                style={{ backgroundColor: chartColors[item.color as keyof typeof chartColors] }}
                initial={{ width: 0 }}
                animate={{ width: `${(item.value / item.max) * 100}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Build Queue Component
const BuildQueue: React.FC<{
  builds: Array<{
    id: string
    name: string
    status: 'queued' | 'running' | 'completed' | 'failed'
    progress: number
    estimatedTime: number
  }>
}> = ({ builds }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100 dark:bg-green-900/20'
      case 'running': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20'
      case 'failed': return 'text-red-600 bg-red-100 dark:bg-red-900/20'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle size={16} />
      case 'running': return <Activity size={16} />
      case 'failed': return <AlertTriangle size={16} />
      default: return <Clock size={16} />
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Build Queue
      </h3>
      
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {builds.map((build, index) => (
          <motion.div
            key={build.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50"
          >
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${getStatusColor(build.status)}`}>
                {getStatusIcon(build.status)}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {build.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {build.status === 'running' 
                    ? `${build.estimatedTime}s remaining` 
                    : build.status.charAt(0).toUpperCase() + build.status.slice(1)
                  }
                </p>
              </div>
            </div>
            
            {build.status === 'running' && (
              <div className="w-24">
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <motion.div
                    className="h-2 bg-blue-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${build.progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-1">
                  {build.progress}%
                </p>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// Main Dashboard Component
const RealTimeDashboard: React.FC<DashboardProps> = ({
  tenantId,
  refreshInterval = 5000,
  enableRealTime = true,
  initialWidgets = [],
  onMetricsUpdate
}) => {
  const [metrics, setMetrics] = useState<DashboardMetrics>(generateMockMetrics())
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>(generateTimeSeriesData())
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Sample activity data
  const [activities] = useState([
    {
      id: '1',
      type: 'build' as const,
      message: 'Build #1234 completed successfully',
      timestamp: new Date().toISOString(),
      severity: 'success' as const
    },
    {
      id: '2',
      type: 'user' as const,
      message: 'New user registered: john@example.com',
      timestamp: new Date(Date.now() - 300000).toISOString(),
      severity: 'info' as const
    },
    {
      id: '3',
      type: 'system' as const,
      message: 'CPU usage exceeded 80% threshold',
      timestamp: new Date(Date.now() - 600000).toISOString(),
      severity: 'warning' as const
    },
    {
      id: '4',
      type: 'build' as const,
      message: 'Build #1233 failed - compilation error',
      timestamp: new Date(Date.now() - 900000).toISOString(),
      severity: 'error' as const
    }
  ])

  // Sample build queue data
  const [buildQueue] = useState([
    {
      id: 'build-1',
      name: 'Mobile App v2.1.0',
      status: 'running' as const,
      progress: 65,
      estimatedTime: 120
    },
    {
      id: 'build-2',
      name: 'Web Dashboard v1.5.3',
      status: 'queued' as const,
      progress: 0,
      estimatedTime: 180
    },
    {
      id: 'build-3',
      name: 'API Gateway v3.0.0',
      status: 'completed' as const,
      progress: 100,
      estimatedTime: 0
    },
    {
      id: 'build-4',
      name: 'Analytics Service v1.2.1',
      status: 'failed' as const,
      progress: 45,
      estimatedTime: 0
    }
  ])

  // Real-time data updates
  useEffect(() => {
    if (!enableRealTime) return

    const interval = setInterval(() => {
      setIsLoading(true)
      
      // Simulate API call delay
      setTimeout(() => {
        const newMetrics = generateMockMetrics()
        setMetrics(newMetrics)
        
        // Update time series data
        setTimeSeriesData(prev => {
          const newData = [...prev.slice(1)]
          newData.push({
            timestamp: new Date().toISOString(),
            value: Math.random() * 100 + 50,
            label: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          })
          return newData
        })
        
        setLastUpdate(new Date())
        setIsLoading(false)
        
        if (onMetricsUpdate) {
          onMetricsUpdate(newMetrics)
        }
      }, 500)
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [enableRealTime, refreshInterval, onMetricsUpdate])

  const handleRefresh = useCallback(() => {
    setIsLoading(true)
    setTimeout(() => {
      setMetrics(generateMockMetrics())
      setTimeSeriesData(generateTimeSeriesData())
      setLastUpdate(new Date())
      setIsLoading(false)
    }, 1000)
  }, [])

  const metricCards = useMemo(() => [
    {
      title: 'Active Builds',
      value: metrics.builds.active,
      change: 12.5,
      icon: <Activity size={24} />,
      color: 'primary'
    },
    {
      title: 'Success Rate',
      value: `${metrics.builds.successRate.toFixed(1)}%`,
      change: 2.3,
      icon: <CheckCircle size={24} />,
      color: 'success'
    },
    {
      title: 'Active Users',
      value: metrics.business.activeUsers,
      change: -1.2,
      icon: <Users size={24} />,
      color: 'secondary'
    },
    {
      title: 'Revenue',
      value: `$${(metrics.business.totalRevenue / 1000).toFixed(1)}K`,
      change: 8.7,
      icon: <TrendingUp size={24} />,
      color: 'accent'
    }
  ], [metrics])

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 ${isDarkMode ? 'dark' : ''}`}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Real-Time Dashboard
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
              >
                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                {isDarkMode ? '☀️' : '🌙'}
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                <Settings size={16} className="text-gray-600 dark:text-gray-400" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="p-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {metricCards.map((card, index) => (
              <MetricCard
                key={index}
                title={card.title}
                value={card.value}
                change={card.change}
                icon={card.icon}
                color={card.color}
                isAnimated={!isLoading}
              />
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RealTimeLineChart
              data={timeSeriesData}
              title="Response Time (24h)"
              color="primary"
            />
            
            <div className="grid grid-cols-2 gap-4">
              <GaugeChart
                value={metrics.system.cpuUsage}
                max={100}
                title="CPU Usage"
                color="primary"
                unit="%"
              />
              <GaugeChart
                value={metrics.system.memoryUsage}
                max={100}
                title="Memory Usage"
                color="secondary"
                unit="%"
              />
            </div>
          </div>

          {/* Activity and Status Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ActivityFeed activities={activities} />
            <SystemStatus metrics={metrics.system} />
            <BuildQueue builds={buildQueue} />
          </div>

          {/* Performance Metrics */}
          <motion.div
            variants={widgetVariants}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Performance Overview
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'Response Time', value: `${metrics.performance.responseTime.toFixed(0)}ms`, color: 'blue' },
                { label: 'Throughput', value: `${metrics.performance.throughput.toFixed(0)}/s`, color: 'green' },
                { label: 'Error Rate', value: `${metrics.performance.errorRate.toFixed(2)}%`, color: 'red' },
                { label: 'Cache Hit', value: `${metrics.performance.cacheHitRatio.toFixed(1)}%`, color: 'purple' },
                { label: 'API Calls', value: `${metrics.performance.apiCallsPerSecond.toFixed(0)}/s`, color: 'yellow' },
                { label: 'P95 Time', value: `${metrics.performance.p95ResponseTime.toFixed(0)}ms`, color: 'pink' }
              ].map((metric, index) => (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                >
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    {metric.label}
                  </p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {metric.value}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

export default RealTimeDashboard 