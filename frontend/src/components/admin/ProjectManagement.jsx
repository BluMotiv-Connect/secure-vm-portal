import React, { useState } from 'react'
import { apiClient } from '../../services/apiClient'
import { 
  Plus, 
  Edit, 
  Trash2, 
  UserCheck, 
  Search, 
  Filter,
  Calendar,
  Clock,
  Eye,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  AlertCircle,
  FolderOpen
} from 'lucide-react'
import ProjectForm from './ProjectForm'
import ProjectDetails from './ProjectDetails'
import ProjectAssignment from './ProjectAssignment'

const ProjectManagement = ({ 
  projects, 
  availableUsers, 
  filters, 
  pagination, 
  onFilterChange, 
  onPageChange, 
  onRefresh,
  onProjectUpdate 
}) => {
  const [showForm, setShowForm] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [showAssignment, setShowAssignment] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreateProject = () => {
    setEditingProject(null)
    setShowForm(true)
  }

  const handleEditProject = (project) => {
    setEditingProject(project)
    setShowForm(true)
  }

  const handleViewProject = (project) => {
    setSelectedProject(project)
    setShowDetails(true)
  }

  const handleAssignProject = (project) => {
    setSelectedProject(project)
    setShowAssignment(true)
  }

  const handleDeleteProject = async (project) => {
    if (!confirm(`Are you sure you want to delete project "${project.name}"?`)) return

    try {
      setLoading(true)
      await apiClient.delete(`/admin/projects/${project.id}`)
      onProjectUpdate()
      setError('')
    } catch (error) {
      console.error('Failed to delete project:', error)
      setError(error.response?.data?.error || 'Failed to delete project')
    } finally {
      setLoading(false)
    }
  }

  const handleFormSubmit = async (formData) => {
    try {
      setLoading(true)
      if (editingProject) {
        await apiClient.put(`/admin/projects/${editingProject.id}`, formData)
      } else {
        await apiClient.post('/admin/projects', formData)
      }
      setShowForm(false)
      setEditingProject(null)
      onProjectUpdate()
      setError('')
    } catch (error) {
      console.error('Failed to save project:', error)
      setError(error.response?.data?.error || 'Failed to save project')
    } finally {
      setLoading(false)
    }
  }

  const handleAssignmentSubmit = async (assignmentData) => {
    try {
      setLoading(true)
      
      // Handle both single user (number) and multiple users (object with user_ids)
      const payload = typeof assignmentData === 'number' 
        ? { user_id: assignmentData }
        : assignmentData
      
      await apiClient.post(`/admin/projects/${selectedProject.id}/assign`, payload)
      setShowAssignment(false)
      setSelectedProject(null)
      onProjectUpdate()
      setError('')
    } catch (error) {
      console.error('Failed to assign project:', error)
      setError(error.response?.data?.error || 'Failed to assign project')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      completed: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      'on-hold': { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle }
    }
    
    const config = statusConfig[status] || statusConfig.active
    const Icon = config.icon
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status || 'active'}
      </span>
    )
  }

  const getTimelineStatus = (project) => {
    if (!project.start_date || !project.end_date) return null
    
    const now = new Date()
    const start = new Date(project.start_date)
    const end = new Date(project.end_date)
    
    if (end < now && project.status !== 'completed') {
      return <span className="text-xs text-red-600 font-medium">Overdue</span>
    } else if (start <= now && end >= now) {
      return <span className="text-xs text-green-600 font-medium">Current</span>
    } else if (start > now) {
      return <span className="text-xs text-blue-600 font-medium">Upcoming</span>
    }
    return null
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="p-6">
      {/* Header and Controls */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Projects</h3>
          <p className="text-sm text-gray-600">
            Showing {projects.length} of {pagination.total} projects
          </p>
        </div>
        <button
          onClick={handleCreateProject}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Project
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
          <button
            onClick={() => setError('')}
            className="ml-4 text-red-600 hover:text-red-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <select
          value={filters.user_id}
          onChange={(e) => onFilterChange('user_id', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">All Users</option>
          {availableUsers.map(user => (
            <option key={user.id} value={user.id}>{user.name}</option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(e) => onFilterChange('status', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="on-hold">On Hold</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <input
          type="date"
          placeholder="Start Date"
          value={filters.start_date}
          onChange={(e) => onFilterChange('start_date', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />

        <input
          type="date"
          placeholder="End Date"
          value={filters.end_date}
          onChange={(e) => onFilterChange('end_date', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Projects Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Project
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assigned Users
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Progress
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timeline
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Work Hours
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {projects.map((project) => (
              <tr key={project.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{project.name}</div>
                    <div className="text-sm text-gray-500">{project.description || 'No description'}</div>
                    {getTimelineStatus(project)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    {/* Display multiple assigned users if available */}
                    {project.assigned_user_names && project.assigned_user_names.length > 0 ? (
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {project.assigned_users_count > 1 ? (
                            <span>{project.assigned_users_count} users assigned</span>
                          ) : (
                            project.assigned_user_names[0]
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {project.assigned_users_count > 1 ? (
                            project.assigned_user_names.slice(0, 2).join(', ') + 
                            (project.assigned_user_names.length > 2 ? ` +${project.assigned_user_names.length - 2} more` : '')
                          ) : (
                            project.assigned_user_emails?.[0] || ''
                          )}
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mt-1">
                          {project.assigned_users_count > 1 ? `${project.assigned_users_count} Assigned` : 'Assigned'}
                        </span>
                      </div>
                    ) : project.user_name ? (
                      /* Fallback to single user display */
                      <div>
                        <div className="text-sm font-medium text-gray-900">{project.user_name}</div>
                        <div className="text-sm text-gray-500">{project.user_email || ''}</div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mt-1">
                          Assigned
                        </span>
                      </div>
                    ) : (
                      /* Unassigned state */
                      <div>
                        <div className="text-sm font-medium text-red-600 italic">Unassigned</div>
                        <div className="text-sm text-gray-500">No users assigned</div>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(project.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {project.completed_tasks || 0} / {project.task_count || 0} tasks
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full" 
                      style={{ 
                        width: project.task_count > 0 
                          ? `${(project.completed_tasks / project.task_count) * 100}%` 
                          : '0%' 
                      }}
                    ></div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div>{formatDate(project.start_date)}</div>
                  <div>{formatDate(project.end_date)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {Math.round((project.total_work_minutes || 0) / 60)}h
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => handleViewProject(project)}
                      className="text-blue-600 hover:text-blue-900"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEditProject(project)}
                      className="text-indigo-600 hover:text-indigo-900"
                      title="Edit Project"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleAssignProject(project)}
                      className="text-green-600 hover:text-green-900"
                      title={project.assigned_users_count > 0 || project.user_name 
                        ? `Manage Assignments (Currently: ${project.assigned_users_count || 1} user${(project.assigned_users_count || 1) !== 1 ? 's' : ''})` 
                        : "Assign Users"}
                    >
                      <UserCheck className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProject(project)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete Project"
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

      {/* Empty State */}
      {projects.length === 0 && (
        <div className="text-center py-12">
          <FolderOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects found</h3>
          <p className="text-gray-600 mb-4">Create your first project to get started</p>
          <button
            onClick={handleCreateProject}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            Add First Project
          </button>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing page {pagination.page} of {pagination.totalPages}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const pageNum = i + 1
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`px-3 py-2 text-sm border rounded-lg ${
                    pagination.page === pageNum
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
            
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={!pagination.hasNext}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <ProjectForm
          project={editingProject}
          availableUsers={availableUsers}
          onSubmit={handleFormSubmit}
          onClose={() => {
            setShowForm(false)
            setEditingProject(null)
          }}
          loading={loading}
        />
      )}

      {showDetails && selectedProject && (
        <ProjectDetails
          project={selectedProject}
          onClose={() => {
            setShowDetails(false)
            setSelectedProject(null)
          }}
        />
      )}

      {showAssignment && selectedProject && (
        <ProjectAssignment
          project={selectedProject}
          availableUsers={availableUsers}
          onSubmit={handleAssignmentSubmit}
          onClose={() => {
            setShowAssignment(false)
            setSelectedProject(null)
          }}
          loading={loading}
        />
      )}
    </div>
  )
}

export default ProjectManagement 