import React from 'react'
import { 
  X, 
  User, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  BarChart3,
  FileText,
  Target
} from 'lucide-react'

const ProjectDetails = ({ project, onClose }) => {
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
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <Icon className="w-4 h-4 mr-1" />
        {status || 'active'}
      </span>
    )
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const calculateDuration = () => {
    if (!project.start_date || !project.end_date) return 'Not specified'
    
    const start = new Date(project.start_date)
    const end = new Date(project.end_date)
    const diffTime = Math.abs(end - start)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return '1 day'
    if (diffDays < 30) return `${diffDays} days`
    if (diffDays < 365) return `${Math.round(diffDays / 30)} months`
    return `${Math.round(diffDays / 365)} years`
  }

  const getProgressPercentage = () => {
    if (!project.task_count || project.task_count === 0) return 0
    return Math.round((project.completed_tasks / project.task_count) * 100)
  }

  const getTimelineStatus = () => {
    if (!project.start_date || !project.end_date) return null
    
    const now = new Date()
    const start = new Date(project.start_date)
    const end = new Date(project.end_date)
    
    if (end < now && project.status !== 'completed') {
      return { status: 'Overdue', color: 'text-red-600', bg: 'bg-red-50' }
    } else if (start <= now && end >= now) {
      return { status: 'In Progress', color: 'text-green-600', bg: 'bg-green-50' }
    } else if (start > now) {
      return { status: 'Upcoming', color: 'text-blue-600', bg: 'bg-blue-50' }
    }
    return null
  }

  const timelineStatus = getTimelineStatus()

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {project.name}
            </h3>
            <div className="flex items-center space-x-4">
              {getStatusBadge(project.status)}
              {timelineStatus && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${timelineStatus.bg} ${timelineStatus.color}`}>
                  {timelineStatus.status}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Description */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center mb-3">
                <FileText className="h-5 w-5 text-gray-400 mr-2" />
                <h4 className="text-lg font-medium text-gray-900">Description</h4>
              </div>
              <p className="text-gray-700 leading-relaxed">
                {project.description || 'No description provided for this project.'}
              </p>
            </div>

            {/* Progress */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <Target className="h-5 w-5 text-gray-400 mr-2" />
                <h4 className="text-lg font-medium text-gray-900">Progress</h4>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Task Completion</span>
                    <span>{project.completed_tasks || 0} / {project.task_count || 0} tasks</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-purple-600 h-3 rounded-full transition-all duration-300" 
                      style={{ width: `${getProgressPercentage()}%` }}
                    ></div>
                  </div>
                  <div className="text-right text-sm text-gray-500 mt-1">
                    {getProgressPercentage()}% complete
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {project.completed_tasks || 0}
                    </div>
                    <div className="text-sm text-gray-500">Completed Tasks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {(project.task_count || 0) - (project.completed_tasks || 0)}
                    </div>
                    <div className="text-sm text-gray-500">Remaining Tasks</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Work Hours */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <BarChart3 className="h-5 w-5 text-gray-400 mr-2" />
                <h4 className="text-lg font-medium text-gray-900">Work Summary</h4>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round((project.total_work_minutes || 0) / 60)}h
                  </div>
                  <div className="text-sm text-gray-500">Total Work Hours</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {project.active_sessions || 0}
                  </div>
                  <div className="text-sm text-gray-500">Work Sessions</div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Assigned User */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center mb-3">
                <User className="h-5 w-5 text-gray-400 mr-2" />
                <h4 className="text-lg font-medium text-gray-900">Assigned User</h4>
              </div>
              
              {project.user_name ? (
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-purple-600 font-medium">
                      {project.user_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{project.user_name}</div>
                    <div className="text-sm text-gray-500">{project.user_email}</div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 text-center py-4">
                  <User className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No user assigned</p>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center mb-3">
                <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                <h4 className="text-lg font-medium text-gray-900">Timeline</h4>
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-gray-700">Start Date</div>
                  <div className="text-gray-900">{formatDate(project.start_date)}</div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-gray-700">End Date</div>
                  <div className="text-gray-900">{formatDate(project.end_date)}</div>
                </div>
                
                <div className="pt-2 border-t">
                  <div className="text-sm font-medium text-gray-700">Duration</div>
                  <div className="text-gray-900">{calculateDuration()}</div>
                </div>
              </div>
            </div>

            {/* Project Meta */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center mb-3">
                <Clock className="h-5 w-5 text-gray-400 mr-2" />
                <h4 className="text-lg font-medium text-gray-900">Project Info</h4>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Project ID</span>
                  <span className="font-mono text-gray-900">#{project.id}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-500">Created</span>
                  <span className="text-gray-900">
                    {formatDate(project.created_at)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-500">Last Updated</span>
                  <span className="text-gray-900">
                    {formatDate(project.updated_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProjectDetails 