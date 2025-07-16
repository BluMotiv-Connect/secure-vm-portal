import React, { useState, useEffect } from 'react'
import { apiClient } from '../../services/apiClient'
import { 
  CheckSquare, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar,
  Link,
  PlayCircle,
  Clock
} from 'lucide-react'

const TaskList = ({ project, onTaskSelect }) => {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [formData, setFormData] = useState({
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

  useEffect(() => {
    if (project) {
      fetchTasks()
    }
  }, [project])

  const fetchTasks = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get(`/tasks/project/${project.id}`)
      setTasks(response.data.tasks)
    } catch (error) {
      setError('Failed to load tasks')
      console.error('Fetch tasks error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Basic validation
    if (!formData.task_name.trim()) {
      setError('Task name is required')
      return
    }

    if (!project?.id) {
      setError('No project selected')
      return
    }

    try {
      const submitData = {
        ...formData,
        project_id: project.id
      }

      // If status is not 'other', remove the description
      if (submitData.status !== 'other') {
        delete submitData.status_description
      }

      console.log('Submitting task data:', submitData)

      if (editingTask) {
        const response = await apiClient.put(`/tasks/${editingTask.id}`, submitData)
        console.log('Task update response:', response.data)
      } else {
        const response = await apiClient.post('/tasks', submitData)
        console.log('Task create response:', response.data)
      }
      setShowForm(false)
      setEditingTask(null)
      resetForm()
      setError('') // Clear any previous errors
      fetchTasks()
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to save task'
      setError(errorMessage)
      console.error('Save task error:', error)
      console.error('Error response:', error.response?.data)
    }
  }

  const handleEdit = (task) => {
    setEditingTask(task)
    setFormData({
      project_outcome_id: task.project_outcome_id || '',
      task_name: task.task_name,
      dependency: task.dependency || '',
      proposed_start_date: task.proposed_start_date ? task.proposed_start_date.split('T')[0] : '',
      proposed_end_date: task.proposed_end_date ? task.proposed_end_date.split('T')[0] : '',
      actual_start_date: task.actual_start_date ? task.actual_start_date.split('T')[0] : '',
      actual_end_date: task.actual_end_date ? task.actual_end_date.split('T')[0] : '',
      status: task.status || 'pending',
      status_description: task.status_description || '',
      file_link: task.file_link || ''
    })
    setShowForm(true)
  }

  const handleDelete = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) return
    
    try {
      await apiClient.delete(`/tasks/${taskId}`)
      fetchTasks()
    } catch (error) {
      setError('Failed to delete task')
      console.error('Delete task error:', error)
    }
  }

  const resetForm = () => {
    setFormData({
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
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in-progress': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'blocked': return 'bg-red-100 text-red-800'
      case 'other': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            Tasks for {project.name}
          </h3>
          <p className="text-sm text-gray-600">Manage and track your project tasks</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true)
            setEditingTask(null)
            resetForm()
          }}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-medium mb-4">
            {editingTask ? 'Edit Task' : 'Add New Task'}
          </h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task Name *
                </label>
                <input
                  type="text"
                  value={formData.task_name}
                  onChange={(e) => setFormData({...formData, task_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Outcome ID
                </label>
                <input
                  type="text"
                  value={formData.project_outcome_id}
                  onChange={(e) => setFormData({...formData, project_outcome_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dependency
                </label>
                <input
                  type="text"
                  value={formData.dependency}
                  onChange={(e) => setFormData({...formData, dependency: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="blocked">Blocked</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  File Link
                </label>
                <input
                  type="url"
                  value={formData.file_link}
                  onChange={(e) => setFormData({...formData, file_link: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Proposed Start Date
                </label>
                <input
                  type="date"
                  value={formData.proposed_start_date}
                  onChange={(e) => setFormData({...formData, proposed_start_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Proposed End Date
                </label>
                <input
                  type="date"
                  value={formData.proposed_end_date}
                  onChange={(e) => setFormData({...formData, proposed_end_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Actual Start Date
                </label>
                <input
                  type="date"
                  value={formData.actual_start_date}
                  onChange={(e) => setFormData({...formData, actual_start_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Actual End Date
                </label>
                <input
                  type="date"
                  value={formData.actual_end_date}
                  onChange={(e) => setFormData({...formData, actual_end_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            
            {/* Status Description - Only show when status is 'other' */}
            {formData.status === 'other' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status Description *
                </label>
                <textarea
                  value={formData.status_description}
                  onChange={(e) => setFormData({...formData, status_description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows={3}
                  placeholder="Please describe the status..."
                  required={formData.status === 'other'}
                />
              </div>
            )}
            
            <div className="flex space-x-3">
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                {editingTask ? 'Update Task' : 'Add Task'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditingTask(null)
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tasks Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sl.No.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project Outcome ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Task
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dependency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proposed Start
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actual Start
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proposed End
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actual End
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  File Link
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tasks.map((task, index) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {task.project_outcome_id || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-xs truncate">
                      {task.task_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-xs truncate">
                      {task.dependency || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {task.proposed_start_date ? new Date(task.proposed_start_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {task.actual_start_date ? new Date(task.actual_start_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {task.proposed_end_date ? new Date(task.proposed_end_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {task.actual_end_date ? new Date(task.actual_end_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(task.status)}`}>
                      {task.status || 'pending'}
                    </span>
                    {task.status === 'other' && task.status_description && (
                      <div className="text-xs text-gray-600 mt-1 max-w-xs truncate" title={task.status_description}>
                        {task.status_description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {task.file_link ? (
                      <a
                        href={task.file_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Link className="h-4 w-4" />
                      </a>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onTaskSelect(task)}
                        className="text-green-600 hover:text-green-800"
                        title="Start work"
                      >
                        <PlayCircle className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(task)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit task"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete task"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {tasks.length === 0 && !loading && (
        <div className="text-center py-12">
          <CheckSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Tasks Found</h3>
          <p className="text-gray-600 mb-4">Add tasks to start tracking your work</p>
          <button
            onClick={() => {
              setShowForm(true)
              setEditingTask(null)
              resetForm()
            }}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Add First Task
          </button>
        </div>
      )}
    </div>
  )
}

export default TaskList
