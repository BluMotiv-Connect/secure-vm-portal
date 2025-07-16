import React from 'react'
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react'

const EmployeeStatsCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendValue, 
  color = 'blue',
  onClick 
}) => {
  const getColorClasses = (color) => {
    const colors = {
      blue: {
        bg: 'bg-blue-50',
        icon: 'text-blue-600',
        accent: 'text-blue-600'
      },
      green: {
        bg: 'bg-green-50',
        icon: 'text-green-600',
        accent: 'text-green-600'
      },
      purple: {
        bg: 'bg-purple-50',
        icon: 'text-purple-600',
        accent: 'text-purple-600'
      },
      orange: {
        bg: 'bg-orange-50',
        icon: 'text-orange-600',
        accent: 'text-orange-600'
      },
      indigo: {
        bg: 'bg-indigo-50',
        icon: 'text-indigo-600',
        accent: 'text-indigo-600'
      }
    }
    return colors[color] || colors.blue
  }

  const colorClasses = getColorClasses(color)

  const getTrendIcon = () => {
    if (!trend) return null
    
    if (trend === 'up') {
      return <ArrowUpIcon className="h-4 w-4 text-green-500" />
    } else if (trend === 'down') {
      return <ArrowDownIcon className="h-4 w-4 text-red-500" />
    }
    return null
  }

  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600'
    if (trend === 'down') return 'text-red-600'
    return 'text-gray-600'
  }

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all hover:shadow-md ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
          {(trend || trendValue) && (
            <div className="flex items-center mt-2">
              {getTrendIcon()}
              {trendValue && (
                <span className={`text-sm font-medium ml-1 ${getTrendColor()}`}>
                  {trendValue}
                </span>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div className={`w-12 h-12 ${colorClasses.bg} rounded-lg flex items-center justify-center ml-4`}>
            <Icon className={`h-6 w-6 ${colorClasses.icon}`} />
          </div>
        )}
      </div>
    </div>
  )
}

export default EmployeeStatsCard 