import { useBackendConnection } from '../hooks/useBackendConnection'
import { CheckCircle, XCircle, Loader, RefreshCw } from 'lucide-react'

export function BackendStatus() {
  const { isConnected, isLoading, lastChecked, error, retry } = useBackendConnection()

  const getStatusColor = () => {
    if (isLoading) return 'text-yellow-500'
    if (isConnected) return 'text-green-500'
    return 'text-red-500'
  }

  const getStatusIcon = () => {
    if (isLoading) return <Loader className="w-4 h-4 animate-spin" />
    if (isConnected) return <CheckCircle className="w-4 h-4" />
    return <XCircle className="w-4 h-4" />
  }

  const getStatusText = () => {
    if (isLoading) return 'Checking backend...'
    if (isConnected) return 'Backend connected'
    return 'Backend disconnected'
  }

  return (
    <div className="flex items-center space-x-2 text-sm">
      <div className={`flex items-center space-x-1 ${getStatusColor()}`}>
        {getStatusIcon()}
        <span>{getStatusText()}</span>
      </div>
      
      {lastChecked && (
        <span className="text-gray-500 text-xs">
          {lastChecked.toLocaleTimeString()}
        </span>
      )}

      {error && !isConnected && (
        <button
          onClick={retry}
          className="flex items-center space-x-1 text-xs text-blue-500 hover:text-blue-700 transition-colors"
          title="Retry connection"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Retry</span>
        </button>
      )}

      {/* Detailed error in tooltip or expandable section */}
      {error && (
        <div className="group relative">
          <div className="w-2 h-2 bg-red-500 rounded-full cursor-help"></div>
          <div className="invisible group-hover:visible absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-50">
            {error}
          </div>
        </div>
      )}
    </div>
  )
} 