import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import Button from '@components/ui/Button'
import Input from '@components/ui/Input'
import Select from '@components/ui/Select'
import { validateForm } from '@utils/validators'

const UserForm = ({ user, onSubmit, onCancel }) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState({})

  const {
    register,
    handleSubmit,
    formState: { errors: formErrors },
    reset,
    watch
  } = useForm({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      azureId: user?.azureId || '',
      role: user?.role || 'employee',
      isActive: user?.isActive !== undefined ? user.isActive : true
    }
  })

  useEffect(() => {
    if (user) {
      reset({
        name: user.name || '',
        email: user.email || '',
        azureId: user.azureId || '',
        role: user.role || 'employee',
        isActive: user.isActive !== undefined ? user.isActive : true
      })
    }
  }, [user, reset])

  const handleFormSubmit = async (data) => {
    setIsSubmitting(true)
    setErrors({})

    try {
      // Validate form data
      const validation = validateForm(data, {
        name: [
          { validator: (value) => value && value.trim().length >= 2, message: 'Name must be at least 2 characters' },
          { validator: (value) => value && value.trim().length <= 255, message: 'Name must not exceed 255 characters' }
        ],
        email: [
          { validator: (value) => value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), message: 'Valid email is required' }
        ],
        azureId: [
          { validator: (value) => !user && value && value.trim().length > 0, message: 'Azure ID is required for new users', condition: () => !user }
        ]
      })

      if (!validation.isValid) {
        setErrors(validation.errors)
        return
      }

      await onSubmit(data)
    } catch (error) {
      setErrors({ submit: error.message || 'Failed to save user' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Name */}
      <Input
        label="Full Name"
        required
        {...register('name', {
          required: 'Name is required',
          minLength: { value: 2, message: 'Name must be at least 2 characters' },
          maxLength: { value: 255, message: 'Name must not exceed 255 characters' }
        })}
        error={formErrors.name?.message || errors.name?.[0]}
        placeholder="Enter full name"
      />

      {/* Email */}
      <Input
        label="Email Address"
        type="email"
        required
        {...register('email', {
          required: 'Email is required',
          pattern: {
            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: 'Please enter a valid email address'
          }
        })}
        error={formErrors.email?.message || errors.email?.[0]}
        placeholder="Enter email address"
      />

      {/* Azure ID (only for new users) */}
      {!user && (
        <Input
          label="Azure AD ID"
          required
          {...register('azureId', {
            required: 'Azure ID is required'
          })}
          error={formErrors.azureId?.message || errors.azureId?.[0]}
          placeholder="Enter Azure AD user ID"
          helperText="This should be the user's Azure AD object ID"
        />
      )}

      {/* Role */}
      <Select
        label="Role"
        required
        {...register('role', {
          required: 'Role is required'
        })}
        error={formErrors.role?.message || errors.role?.[0]}
      >
        <option value="employee">Employee</option>
        <option value="admin">Administrator</option>
      </Select>

      {/* Active Status */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          Status
        </label>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            {...register('isActive')}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-600">
            User is active and can access the system
          </span>
        </div>
      </div>

      {/* Submit Error */}
      {errors.submit && (
        <div className="text-sm text-error-600 bg-error-50 p-3 rounded-md">
          {errors.submit}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          {user ? 'Update User' : 'Create User'}
        </Button>
      </div>
    </form>
  )
}

export default UserForm
