import React, { useState, useEffect } from 'react'
import { apiClient } from '../../services/apiClient'
import { dedupeRequest } from '../../utils/debounce'
import { 
  FolderOpen, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar,
  CheckCircle,
  Clock
} from 'lucide-react'

const ProjectList = ({ onProjectSelect }) => {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: ''
  })

  useEffect(() => {
    // Add a small delay to prevent rapid API calls on component mount
    const timeoutId = setTimeout(() => {
      fetchProjects()
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [])

  const fetchProjects = async () => {
    return dedupeRequest('employee-projects', async () => {
      try {
        setLoading(true)
        const response = await apiClient.get('/projects')
        setProjects(response.data.projects)
        setError('') // Clear any previous errors
      } catch (error) {
        setError('Failed to load projects')
        console.error('Fetch projects error:', error)
      } finally {
        setLoading(false)
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingProject) {
        await apiClient.put(`/projects/${editingProject.id}`, formData)
      } else {
        await apiClient.post('/projects', formData)
      }
      setShowForm(false)
      setEditingProject(null)
      resetForm()
      fetchProjects()
    } catch (error) {
      setError('Failed to save project')
      console.error('Save project error:', error)
    }
  }

  const handleEdit = (project) => {
    setEditingProject(project)
    setFormData({
      name: project.name,
      description: project.description || '',
      start_date: project.start_date ? project.start_date.split('T')[0] : '',
      end_date: project.end_date ? project.end_date.split('T')[0] : ''
    })
    setShowForm(true)
  }

  const handleDelete = async (projectId) => {
    if (!confirm('Are you sure you want to delete this project?')) return
    
    try {
      await apiClient.delete(`/projects/${projectId}`)
      fetchProjects()
    } catch (error) {
      setError('Failed to delete project')
      console.error('Delete project error:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      start_date: '',
      end_date: ''
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'on-hold': return 'bg-yellow-100 text-yellow-800'
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
          <h3 className="text-lg font-medium text-gray-900">My Projects</h3>
          <p className="text-sm text-gray-600">Manage your projects and track progress</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true)
            setEditingProject(null)
            resetForm()
          }}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Project
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
            {editingProject ? 'Edit Project' : 'Add New Project'}
          </h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                rows={3}
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                {editingProject ? 'Update Project' : 'Add Project'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditingProject(null)
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <div 
            key={project.id}
            className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1" onClick={() => onProjectSelect(project)}>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    {project.name}
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    {project.description || 'No description provided'}
                  </p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    {project.start_date && (
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(project.start_date).toLocaleDateString()}
                      </div>
                    )}
                    <div className="flex items-center">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {project.task_count || 0} tasks
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEdit(project)
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(project.id)
                    }}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(project.status)}`}>
                  {project.status || 'active'}
                </span>
                <button
                  onClick={() => onProjectSelect(project)}
                  className="text-green-600 hover:text-green-800 text-sm font-medium"
                >
                  View Tasks →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {projects.length === 0 && !loading && (
        <div className="text-center py-12">
          <FolderOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Projects Found</h3>
          <p className="text-gray-600 mb-4">Create your first project to get started</p>
          <button
            onClick={() => {
              setShowForm(true)
              setEditingProject(null)
              resetForm()
            }}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Add First Project
          </button>
        </div>
      )}
    </div>
  )
}

export default ProjectList
