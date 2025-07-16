import React, { useState } from 'react'
import { useWorkLogs } from '@hooks/useWorkLogs'
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/Card'
import Button from '@components/ui/Button'
import Select from '@components/ui/Select'
import { AlertCircle, Send } from 'lucide-react'

const ReasonForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    reason: '',
    customReason: '',
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString()
  })

  const [errors, setErrors] = useState({})
  const { logNonWorkTime, isLoggingNonWork } = useWorkLogs()

  const predefinedReasons = [
    'Sick leave',
    'Personal time off',
    'Training/Meeting (no VM needed)',
    'Administrative work',
    'Client meeting',
    'Documentation work',
    'Planning/Strategy session',
    'Team meeting',
    'Other (specify below)'
  ]

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error when user makes a selection
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.reason) {
      newErrors.reason = 'Please select a reason'
    }

    if (formData.reason === 'Other (specify below)' && !formData.customReason.trim()) {
      newErrors.customReason = 'Please specify the reason'
    }

    if (formData.customReason && formData.customReason.length > 500) {
      newErrors.customReason = 'Reason must not exceed 500 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    try {
      const reasonText = formData.reason === 'Other (specify below)' 
        ? formData.customReason 
        : formData.reason

      await logNonWorkTime({
        reason: reasonText,
        startTime: formData.startTime,
        endTime: formData.endTime
      })

      onSubmit()
    } catch (error) {
      console.error('Failed to log non-work time:', error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <AlertCircle className="h-5 w-5 mr-2 text-warning-600" />
          VM Not Required Today
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Information */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-medium text-amber-900 mb-2">Why is this needed?</h4>
            <p className="text-sm text-amber-700">
              We track all work time to ensure accurate reporting and compliance. 
              If you don't need a VM today, please let us know what you'll be working on instead.
            </p>
          </div>

          {/* Reason Selection */}
          <div>
            <Select
              label="Reason for not using VM"
              required
              value={formData.reason}
              onChange={(e) => handleChange('reason', e.target.value)}
              error={errors.reason}
            >
              <option value="">Select a reason...</option>
              {predefinedReasons.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </Select>
          </div>

          {/* Custom Reason */}
          {formData.reason === 'Other (specify below)' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Please specify
                <span className="text-red-500 ml-1">*</span>
              </label>
              <textarea
                value={formData.customReason}
                onChange={(e) => handleChange('customReason', e.target.value)}
                placeholder="Please provide details about what you'll be working on..."
                rows={3}
                maxLength={500}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              {errors.customReason && (
                <p className="mt-1 text-sm text-red-600">{errors.customReason}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                {formData.customReason.length}/500 characters
              </p>
            </div>
          )}

          {/* Time Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <input
                type="datetime-local"
                value={formData.startTime.slice(0, 16)}
                onChange={(e) => handleChange('startTime', e.target.value + ':00.000Z')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <input
                type="datetime-local"
                value={formData.endTime.slice(0, 16)}
                onChange={(e) => handleChange('endTime', e.target.value + ':00.000Z')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoggingNonWork}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={isLoggingNonWork}
              disabled={isLoggingNonWork}
            >
              <Send className="h-4 w-4 mr-2" />
              Submit Reason
            </Button>
          </div>
        </form>

        {/* Privacy Notice */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Privacy Notice</h4>
          <p className="text-sm text-gray-600">
            This information is used for work tracking and reporting purposes only. 
            Your data is handled in accordance with company privacy policies.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default ReasonForm
