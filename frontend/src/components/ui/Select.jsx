import React from 'react'
import { cn } from '@utils/helpers'
import { ChevronDown } from 'lucide-react'

const Select = React.forwardRef(({
  className,
  children,
  label,
  error,
  helperText,
  required,
  placeholder,
  ...props
}, ref) => {
  const selectId = props.id || `select-${Math.random().toString(36).substr(2, 9)}`

  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={selectId}
          className={cn(
            'block text-sm font-medium text-gray-700',
            required && "after:content-['*'] after:ml-0.5 after:text-error-500"
          )}
        >
          {label}
        </label>
      )}
      
      <div className="relative">
        <select
          id={selectId}
          ref={ref}
          className={cn(
            'flex h-10 w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-error-500 focus:ring-error-500',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children}
        </select>
        
        <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
      
      {(error || helperText) && (
        <p className={cn(
          'text-xs',
          error ? 'text-error-600' : 'text-gray-500'
        )}>
          {error || helperText}
        </p>
      )}
    </div>
  )
})

Select.displayName = 'Select'

export default Select
