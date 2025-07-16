import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/Card'
import Button from '@components/ui/Button'
import Input from '@components/ui/Input'
import Select from '@components/ui/Select'
import { ArrowLeft, Play } from 'lucide-react'

const TaskForm = ({ vm, onSubmit, onBack, isSubmitting }) => {
  const [formData, setFormData] = useState({
    taskTitle: '',
    taskDescription: '',
    workType: 'work',
    isBillable: true
  })

  const [errors, setErrors] = useState({})

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
    } else if (formData.taskTitle.length < 3) {
      newErrors.taskTitle = 'Task title must be at least 3 characters'
    }

    if (formData.taskDescription && formData.taskDescription.length > 1000) {
      newErrors.taskDescription = 'Description must not exceed 1000 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (validateForm()) {
      onSubmit(formData)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Task Details</CardTitle>
          <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* VM Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Working on:</h4>
            <p className="text-gray-700">{vm.name} ({vm.ipAddress})</p>
          </div>

          {/* Task Title */}
          <Input
            label="Task Title"
            required
            value={formData.taskTitle}
            onChange={(e) => handleChange('taskTitle', e.target.value)}
            error={errors.taskTitle}
            placeholder="e.g., Frontend development, Database optimization, Testing"
            maxLength={255}
          />

          {/* Task Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task Description
              <span className="text-gray-500 font-normal"> (optional)</span>
            </label>
            <textarea
              value={formData.taskDescription}
              onChange={(e) => handleChange('taskDescription', e.target.value)}
              placeholder="Provide more details about what you'll be working on..."
              rows={4}
              maxLength={1000}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            {errors.taskDescription && (
              <p className="mt-1 text-sm text-red-600">{errors.taskDescription}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              {formData.taskDescription.length}/1000 characters
            </p>
          </div>

          {/* Work Type */}
          <Select
            label="Work Type"
            value={formData.workType}
            onChange={(e) => handleChange('workType', e.target.value)}
          >
            <option value="work">Regular Work</option>
            <option value="meeting">Meeting/Call</option>
            <option value="training">Training/Learning</option>
            <option value="other">Other</option>
          </Select>

          {/* Billable */}
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

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              <Play className="h-4 w-4 mr-2" />
              Start Work Session
            </Button>
          </div>
        </form>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Session Information</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Your work session will begin immediately after submission</li>
            <li>• Connection files will be generated automatically</li>
            <li>• Time tracking starts when you click "Start Work Session"</li>
            <li>• You can update task details later if needed</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

export default TaskForm
