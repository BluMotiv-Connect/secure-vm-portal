import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import Button from '@components/ui/Button'
import Input from '@components/ui/Input'
import Select from '@components/ui/Select'
import { validateForm } from '@utils/validators'

const VMForm = ({ vm, onSubmit, onCancel }) => {
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
      name: vm?.name || '',
      description: vm?.description || '',
      ipAddress: vm?.ipAddress || '',
      osType: vm?.osType || 'windows',
      osVersion: vm?.osVersion || '',
      status: vm?.status || 'offline',
      region: vm?.region || '',
      instanceId: vm?.instanceId || '',
      tags: vm?.tags ? JSON.stringify(vm.tags, null, 2) : '{}'
    }
  })

  useEffect(() => {
    if (vm) {
      reset({
        name: vm.name || '',
        description: vm.description || '',
        ipAddress: vm.ipAddress || '',
        osType: vm.osType || 'windows',
        osVersion: vm.osVersion || '',
        status: vm.status || 'offline',
        region: vm.region || '',
        instanceId: vm.instanceId || '',
        tags: vm.tags ? JSON.stringify(vm.tags, null, 2) : '{}'
      })
    }
  }, [vm, reset])

  const handleFormSubmit = async (data) => {
    setIsSubmitting(true)
    setErrors({})

    try {
      // Parse tags JSON
      let parsedTags = {}
      if (data.tags.trim()) {
        try {
          parsedTags = JSON.parse(data.tags)
        } catch (e) {
          setErrors({ tags: ['Invalid JSON format'] })
          setIsSubmitting(false)
          return
        }
      }

      // Validate form data
      const validation = validateForm(data, {
        name: [
          { validator: (value) => value && value.trim().length >= 2, message: 'Name must be at least 2 characters' },
          { validator: (value) => value && value.trim().length <= 255, message: 'Name must not exceed 255 characters' }
        ],
        ipAddress: [
          { validator: (value) => value && /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(value), message: 'Valid IP address is required' }
        ],
        osType: [
          { validator: (value) => ['windows', 'linux', 'macos'].includes(value), message: 'Valid OS type is required' }
        ]
      })

      if (!validation.isValid) {
        setErrors(validation.errors)
        return
      }

      const submitData = {
        ...data,
        tags: parsedTags
      }

      await onSubmit(submitData)
    } catch (error) {
      setErrors({ submit: error.message || 'Failed to save VM' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="VM Name"
            required
            {...register('name', {
              required: 'VM name is required',
              minLength: { value: 2, message: 'Name must be at least 2 characters' },
              maxLength: { value: 255, message: 'Name must not exceed 255 characters' }
            })}
            error={formErrors.name?.message || errors.name?.[0]}
            placeholder="e.g., DEV-WEB-01"
          />

          <Input
            label="IP Address"
            required
            {...register('ipAddress', {
              required: 'IP address is required',
              pattern: {
                value: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
                message: 'Please enter a valid IP address'
              }
            })}
            error={formErrors.ipAddress?.message || errors.ipAddress?.[0]}
            placeholder="192.168.1.100"
          />
        </div>

        <Input
          label="Description"
          {...register('description', {
            maxLength: { value: 1000, message: 'Description must not exceed 1000 characters' }
          })}
          error={formErrors.description?.message}
          placeholder="Brief description of the VM purpose"
        />
      </div>

      {/* System Configuration */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">System Configuration</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Operating System"
            required
            {...register('osType', {
              required: 'OS type is required'
            })}
            error={formErrors.osType?.message}
          >
            <option value="windows">Windows</option>
            <option value="linux">Linux</option>
            <option value="macos">macOS</option>
          </Select>

          <Input
            label="OS Version"
            {...register('osVersion', {
              maxLength: { value: 100, message: 'OS version must not exceed 100 characters' }
            })}
            error={formErrors.osVersion?.message}
            placeholder="e.g., Windows Server 2019, Ubuntu 20.04"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Status"
            {...register('status')}
            error={formErrors.status?.message}
          >
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="maintenance">Maintenance</option>
            <option value="error">Error</option>
          </Select>

          <Input
            label="Region"
            {...register('region', {
              maxLength: { value: 100, message: 'Region must not exceed 100 characters' }
            })}
            error={formErrors.region?.message}
            placeholder="e.g., us-east-1, westeurope"
          />
        </div>

        <Input
          label="Instance ID"
          {...register('instanceId', {
            maxLength: { value: 255, message: 'Instance ID must not exceed 255 characters' }
          })}
          error={formErrors.instanceId?.message}
          placeholder="Cloud provider instance ID"
          helperText="Optional: AWS instance ID, Azure VM ID, etc."
        />
      </div>

      {/* Metadata */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Metadata</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tags (JSON format)
          </label>
          <textarea
            {...register('tags')}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
            placeholder='{"environment": "development", "team": "frontend", "cost-center": "engineering"}'
          />
          {(formErrors.tags?.message || errors.tags?.[0]) && (
            <p className="mt-1 text-sm text-red-600">
              {formErrors.tags?.message || errors.tags?.[0]}
            </p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            Optional: Add metadata as JSON key-value pairs
          </p>
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
          {vm ? 'Update VM' : 'Create VM'}
        </Button>
      </div>
    </form>
  )
}

export default VMForm
