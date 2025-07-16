import React from 'react'
import { cn } from '@utils/helpers'
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react'

const Alert = React.forwardRef(({
  className,
  variant = 'info',
  title,
  children,
  onClose,
  ...props
}, ref) => {
  const variants = {
    info: {
      container: 'bg-blue-50 border-blue-200 text-blue-800',
      icon: Info,
      iconColor: 'text-blue-400'
    },
    success: {
      container: 'bg-success-50 border-success-200 text-success-800',
      icon: CheckCircle,
      iconColor: 'text-success-400'
    },
    warning: {
      container: 'bg-warning-50 border-warning-200 text-warning-800',
      icon: AlertTriangle,
      iconColor: 'text-warning-400'
    },
    error: {
      container: 'bg-error-50 border-error-200 text-error-800',
      icon: AlertCircle,
      iconColor: 'text-error-400'
    }
  }

  const { container, icon: Icon, iconColor } = variants[variant]

  return (
    <div
      ref={ref}
      className={cn(
        'relative rounded-lg border p-4',
        container,
        className
      )}
      {...props}
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={cn('h-5 w-5', iconColor)} />
        </div>
        
        <div className="ml-3 flex-1">
          {title && (
            <h3 className="text-sm font-medium mb-1">
              {title}
            </h3>
          )}
          
          <div className="text-sm">
            {children}
          </div>
        </div>
        
        {onClose && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  'inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2',
                  variant === 'info' && 'text-blue-500 hover:bg-blue-100 focus:ring-blue-600',
                  variant === 'success' && 'text-success-500 hover:bg-success-100 focus:ring-success-600',
                  variant === 'warning' && 'text-warning-500 hover:bg-warning-100 focus:ring-warning-600',
                  variant === 'error' && 'text-error-500 hover:bg-error-100 focus:ring-error-600'
                )}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

Alert.displayName = 'Alert'

export default Alert
