import React, { useState } from 'react'
import { useWorkLogs } from '@hooks/useWorkLogs'
import Button from '@components/ui/Button'
import Input from '@components/ui/Input'
import Select from '@components/ui/Select'
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/Card'
import { Clock, Save, X } from 'lucide-react'

const TimeEntry = ({ onCancel, onSave, initialData = null }) => {
  const [formData, setFormData] = useState({
    taskTitle: initialData?.taskTitle || '',
    taskDescription: initialData?.taskDescription || '',
    workType: initialData?.workType || 'work',
    startTime: initialData?.startTime || new Date().toISOString().slice(0, 16),
    endTime: initialData?.endTime || new Date().toISOString().slice(0, 16),
    isBillable: initialData?.isBillable !== undefined ? initialData.isBillable : true
  })

  const [errors, setErrors] = useState({})
  const { updateWorkLog, isUpdating } = useWorkLogs()

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.taskTitle.trim()) {
      newErrors.taskTitle = 'Task title is required'
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required'
    }

    if (!formData.endTime) {
      newErrors.endTime = 'End time is required'
    }

    if (formData.startTime && formData.endTime) {
      const start = new Date(formData.startTime)
      const end = new Date(formData.endTime)
      
      if (end <= start) {
        newErrors.endTime = 'End time must be after start time'
      }

      // Check for reasonable duration (max 12 hours)
      const durationHours = (end - start) / (1000 * 60 * 60)
      if (durationHours > 12) {
        newErrors.endTime = 'Duration cannot exceed 12 hours'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const calculateDuration = () => {
    if (formData.startTime && formData.endTime) {
      const start = new Date(formData.startTime)
      const end = new Date(formData.endTime)
      const durationMs = end - start
      
      if (durationMs > 0) {
        const hours = Math.floor(durationMs / (1000 * 60 * 60))
        const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
        return `${hours}h ${minutes}m`
      }
    }
    return '0m'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    try {
      const timeEntryData = {
        ...formData,
        duration: calculateDuration()
      }

      if (onSave) {
        await onSave(timeEntryData)
      }
    } catch (error) {
      setErrors({ submit: error.message || 'Failed to save time entry' })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="h-5 w-5 mr-2" />
          {initialData ? 'Edit Time Entry' : 'Add Time Entry'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Task Information */}
          <div className="space-y-4">
            <Input
              label="Task Title"
              required
              value={formData.taskTitle}
              onChange={(e) => handleChange('taskTitle', e.target.value)}
              error={errors.taskTitle}
              placeholder="What did you work on?"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Task Description
                <span className="text-gray-500 font-normal"> (optional)</span>
              </label>
              <textarea
                value={formData.taskDescription}
                onChange={(e) => handleChange('taskDescription', e.target.value)}
                placeholder="Provide more details about the task..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <Select
              label="Work Type"
              value={formData.workType}
              onChange={(e) => handleChange('workType', e.target.value)}
            >
              <option value="work">Regular Work</option>
              <option value="meeting">Meeting/Call</option>
              <option value="break">Break</option>
              <option value="training">Training/Learning</option>
              <option value="other">Other</option>
            </Select>
          </div>

          {/* Time Information */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Start Time"
                type="datetime-local"
                required
                value={formData.startTime}
                onChange={(e) => handleChange('startTime', e.target.value)}
                error={errors.startTime}
              />

              <Input
                label="End Time"
                type="datetime-local"
                required
                value={formData.endTime}
                onChange={(e) => handleChange('endTime', e.target.value)}
                error={errors.endTime}
              />
            </div>

            {/* Duration Display */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Duration:</span>
                <span className="text-lg font-bold text-primary-600">
                  {calculateDuration()}
                </span>
              </div>
            </div>
          </div>

          {/* Additional Options */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="billable"
              checked={formData.isBillable}
              onChange={(e) => handleChange('isBillable', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="billable" className="text-sm text-gray-700">
              This is billable work
            </label>
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
              disabled={isUpdating}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              loading={isUpdating}
              disabled={isUpdating}
            >
              <Save className="h-4 w-4 mr-2" />
              {initialData ? 'Update Entry' : 'Save Entry'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default TimeEntry
