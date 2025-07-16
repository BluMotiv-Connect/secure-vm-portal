import React from 'react'
import Badge from '@components/ui/Badge'
import { Wifi, WifiOff, Settings, AlertTriangle } from 'lucide-react'

const VMStatus = ({ status, size = 'md', showIcon = true, showText = true }) => {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'online':
        return {
          variant: 'success',
          icon: Wifi,
          text: 'Online',
          color: 'text-success-600'
        }
      case 'offline':
        return {
          variant: 'secondary',
          icon: WifiOff,
          text: 'Offline',
          color: 'text-gray-600'
        }
      case 'maintenance':
        return {
          variant: 'warning',
          icon: Settings,
          text: 'Maintenance',
          color: 'text-warning-600'
        }
      case 'error':
        return {
          variant: 'error',
          icon: AlertTriangle,
          text: 'Error',
          color: 'text-error-600'
        }
      default:
        return {
          variant: 'secondary',
          icon: WifiOff,
          text: 'Unknown',
          color: 'text-gray-600'
        }
    }
  }

  const config = getStatusConfig(status)
  const Icon = config.icon

  if (!showText && !showIcon) {
    return <Badge variant={config.variant}>{config.text}</Badge>
  }

  return (
    <div className="flex items-center space-x-1">
      {showIcon && (
        <Icon className={`h-4 w-4 ${config.color}`} />
      )}
      {showText && (
        <Badge variant={config.variant} size={size}>
          {config.text}
        </Badge>
      )}
    </div>
  )
}

export default VMStatus
