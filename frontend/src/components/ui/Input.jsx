import React from 'react'
import { cn } from '@utils/helpers'

const Input = React.forwardRef(({
  className,
  type = 'text',
  error,
  label,
  helperText,
  required,
  ...props
}, ref) => {
  const inputId = props.id || `input-${Math.random().toString(36).substr(2, 9)}`

  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            'block text-sm font-medium text-gray-700',
            required && "after:content-['*'] after:ml-0.5 after:text-error-500"
          )}
        >
          {label}
        </label>
      )}
      
      <input
        type={type}
        id={inputId}
        ref={ref}
        className={cn(
          'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-error-500 focus:ring-error-500',
          className
        )}
        {...props}
      />
      
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

Input.displayName = 'Input'

export default Input
