import React, { useState, useEffect } from 'react'
import { apiClient } from '../../services/apiClient'
import { X, Calendar, Link, User, FolderOpen } from 'lucide-react'

const TaskForm = ({ task, projects, onClose }) => {
  const [formData, setFormData] = useState({
    project_id: '',
    project_outcome_id: '',
    task_name: '',
    dependency: '',
    proposed_start_date: '',
    proposed_end_date: '',
    actual_start_date: '',
    actual_end_date: '',
    status: 'pending',
    status_description: '',
    file_link: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (task) {
      setFormData({
        project_id: task.project_id || '',
        project_outcome_id: task.project_outcome_id || '',
        task_name: task.task_name || '',
        dependency: task.dependency || '',
        proposed_start_date: task.proposed_start_date ? task.proposed_start_date.split('T')[0] : '',
        proposed_end_date: task.proposed_end_date ? task.proposed_end_date.split('T')[0] : '',
        actual_start_date: task.actual_start_date ? task.actual_start_date.split('T')[0] : '',
        actual_end_date: task.actual_end_date ? task.actual_end_date.split('T')[0] : '',
        status: task.status || 'pending',
        status_description: task.status_description || '',
        file_link: task.file_link || ''
      })
    }
  }, [task])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Basic validation
    if (!formData.task_name.trim()) {
      setError('Task name is required')
      setLoading(false)
      return
    }

    if (!formData.project_id) {
      setError('Project selection is required')
      setLoading(false)
      return
    }

    try {
      console.log('Submitting admin task data:', formData)
      
      if (task) {
        // Update existing task
        const response = await apiClient.put(`/admin/tasks/${task.id}`, formData)
        console.log('Admin task update response:', response.data)
      } else {
        // Create new task
        const response = await apiClient.post('/admin/tasks', formData)
        console.log('Admin task create response:', response.data)
      }
      onClose(true) // Pass success indicator
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to save task'
      setError(errorMessage)
      console.error('Save task error:', error)
      console.error('Error response:', error.response?.data)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const selectedProject = projects.find(p => p.id == formData.project_id)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            {task ? 'Edit Task' : 'Create New Task'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Project Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project *
            </label>
            <select
              value={formData.project_id}
              onChange={(e) => handleChange('project_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={!!task} // Don't allow changing project for existing tasks
            >
              <option value="">Select Project</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name} - {project.user_name} ({project.user_email})
                </option>
              ))}
            </select>
            {selectedProject && (
              <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2 text-sm text-blue-800">
                  <FolderOpen className="h-4 w-4" />
                  <span className="font-medium">Project:</span>
                  <span>{selectedProject.name}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-blue-700 mt-1">
                  <User className="h-4 w-4" />
                  <span>Assigned to:</span>
                  <span>{selectedProject.user_name} ({selectedProject.user_email})</span>
                </div>
              </div>
            )}
          </div>

          {/* Task Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task Name *
              </label>
              <input
                type="text"
                value={formData.task_name}
                onChange={(e) => handleChange('task_name', e.target.value)}
                placeholder="Enter task name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Outcome ID
              </label>
              <input
                type="text"
                value={formData.project_outcome_id}
                onChange={(e) => handleChange('project_outcome_id', e.target.value)}
                placeholder="e.g., PO-001"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="blocked">Blocked</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dependency
              </label>
              <input
                type="text"
                value={formData.dependency}
                onChange={(e) => handleChange('dependency', e.target.value)}
                placeholder="Dependencies or prerequisites"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Status Description - Only show when status is 'other' */}
          {formData.status === 'other' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status Description *
              </label>
              <textarea
                value={formData.status_description}
                onChange={(e) => handleChange('status_description', e.target.value)}
                placeholder="Please describe the status..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required={formData.status === 'other'}
              />
              <p className="text-sm text-gray-500 mt-1">
                Provide details about the custom status
              </p>
            </div>
          )}

          {/* Timeline */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Timeline
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proposed Start Date
                </label>
                <input
                  type="date"
                  value={formData.proposed_start_date}
                  onChange={(e) => handleChange('proposed_start_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proposed End Date
                </label>
                <input
                  type="date"
                  value={formData.proposed_end_date}
                  onChange={(e) => handleChange('proposed_end_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Actual Start Date
                </label>
                <input
                  type="date"
                  value={formData.actual_start_date}
                  onChange={(e) => handleChange('actual_start_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Actual End Date
                </label>
                <input
                  type="date"
                  value={formData.actual_end_date}
                  onChange={(e) => handleChange('actual_end_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* File Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Link className="h-4 w-4 mr-2" />
              File Link
            </label>
            <input
              type="url"
              value={formData.file_link}
              onChange={(e) => handleChange('file_link', e.target.value)}
              placeholder="https://example.com/document.pdf"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Optional link to related documents or resources
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Saving...' : (task ? 'Update Task' : 'Create Task')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TaskForm 