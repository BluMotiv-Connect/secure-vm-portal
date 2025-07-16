import React, { useState, useEffect } from 'react'
import { apiClient } from '../../services/apiClient'
import { 
  X, 
  Calendar, 
  Link, 
  User, 
  FolderOpen, 
  Edit, 
  Trash2,
  Clock,
  PlayCircle,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

const TaskDetails = ({ task, onClose, onEdit, onDelete }) => {
  const [workSessions, setWorkSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWorkSessions()
  }, [task.id])

  const fetchWorkSessions = async () => {
    try {
      setLoading(true)
      // For now, we'll get the basic work session data from the task
      // In a more advanced implementation, we'd fetch detailed work sessions
      setWorkSessions([])
    } catch (error) {
      console.error('Failed to fetch work sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in-progress': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'blocked': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5" />
      case 'in-progress': return <PlayCircle className="h-5 w-5" />
      case 'pending': return <Clock className="h-5 w-5" />
      case 'blocked': return <AlertCircle className="h-5 w-5" />
      default: return <Clock className="h-5 w-5" />
    }
  }

  const formatDuration = (minutes) => {
    if (!minutes) return '0h 0m'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getDurationBetweenDates = (startDate, endDate) => {
    if (!startDate || !endDate) return null
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end - start)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const proposedDuration = getDurationBetweenDates(task.proposed_start_date, task.proposed_end_date)
  const actualDuration = getDurationBetweenDates(task.actual_start_date, task.actual_end_date)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center space-x-3">
            {getStatusIcon(task.status)}
            <h3 className="text-xl font-semibold text-gray-900">
              {task.task_name}
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onEdit}
              className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50"
              title="Edit task"
            >
              <Edit className="h-5 w-5" />
            </button>
            <button
              onClick={onDelete}
              className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50"
              title="Delete task"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-50"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Status and Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Status</h4>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
                  {task.status || 'pending'}
                </span>
                {task.active_sessions > 0 && (
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    {task.active_sessions} active session{task.active_sessions > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Work Time</h4>
              <div className="text-lg font-semibold text-gray-900">
                {formatDuration(task.total_work_minutes)}
              </div>
              <div className="text-sm text-gray-600">
                {task.work_session_count} session{task.work_session_count !== 1 ? 's' : ''}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Project Outcome ID</h4>
              <div className="text-lg font-medium text-gray-900">
                {task.project_outcome_id || 'Not assigned'}
              </div>
            </div>
          </div>

          {/* Project and User Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <FolderOpen className="h-5 w-5 text-blue-600" />
                <h4 className="text-sm font-medium text-blue-900">Project</h4>
              </div>
              <div className="text-lg font-semibold text-blue-900 mb-1">
                {task.project_name}
              </div>
              <div className="text-sm text-blue-700">
                Status: {task.project_status}
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <User className="h-5 w-5 text-green-600" />
                <h4 className="text-sm font-medium text-green-900">Assigned User</h4>
              </div>
              <div className="text-lg font-semibold text-green-900 mb-1">
                {task.user_name}
              </div>
              <div className="text-sm text-green-700">
                {task.user_email}
              </div>
            </div>
          </div>

          {/* Dependency */}
          {task.dependency && (
            <div className="bg-yellow-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-yellow-900 mb-2">Dependencies</h4>
              <div className="text-yellow-800">
                {task.dependency}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-4">
              <Calendar className="h-5 w-5 text-gray-600" />
              <h4 className="text-lg font-medium text-gray-900">Timeline</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Proposed Timeline */}
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-3">Proposed</h5>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Start Date:</span>
                    <span className="text-sm font-medium">
                      {formatDate(task.proposed_start_date)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">End Date:</span>
                    <span className="text-sm font-medium">
                      {formatDate(task.proposed_end_date)}
                    </span>
                  </div>
                  {proposedDuration && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Duration:</span>
                      <span className="text-sm font-medium text-blue-600">
                        {proposedDuration} day{proposedDuration !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actual Timeline */}
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-3">Actual</h5>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Start Date:</span>
                    <span className="text-sm font-medium">
                      {formatDate(task.actual_start_date)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">End Date:</span>
                    <span className="text-sm font-medium">
                      {formatDate(task.actual_end_date)}
                    </span>
                  </div>
                  {actualDuration && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Duration:</span>
                      <span className="text-sm font-medium text-green-600">
                        {actualDuration} day{actualDuration !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* File Link */}
          {task.file_link && (
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Link className="h-5 w-5 text-purple-600" />
                <h4 className="text-sm font-medium text-purple-900">Attached File</h4>
              </div>
              <a
                href={task.file_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 hover:text-purple-800 underline break-all"
              >
                {task.file_link}
              </a>
            </div>
          )}

          {/* Timestamps */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Task Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Created:</span>
                <span className="font-medium">
                  {formatDate(task.created_at)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Updated:</span>
                <span className="font-medium">
                  {formatDate(task.updated_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Work Sessions Summary */}
          {task.work_session_count > 0 && (
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-gray-600" />
                  <h4 className="text-lg font-medium text-gray-900">Work Sessions</h4>
                </div>
                <div className="text-sm text-gray-600">
                  Total: {task.work_session_count} session{task.work_session_count !== 1 ? 's' : ''}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {task.work_session_count}
                  </div>
                  <div className="text-sm text-blue-700">Total Sessions</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {formatDuration(task.total_work_minutes)}
                  </div>
                  <div className="text-sm text-green-700">Total Time</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {task.active_sessions || 0}
                  </div>
                  <div className="text-sm text-orange-700">Active Sessions</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-white"
          >
            Close
          </button>
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Edit Task
          </button>
        </div>
      </div>
    </div>
  )
}

export default TaskDetails 