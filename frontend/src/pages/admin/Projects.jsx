import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../services/apiClient'
import { 
  FolderOpen, 
  Plus, 
  ArrowLeft,
  Search,
  Filter,
  Download,
  RefreshCw,
  Users,
  Calendar,
  BarChart3
} from 'lucide-react'
import ProjectManagement from '../../components/admin/ProjectManagement'
import ProjectStats from '../../components/admin/ProjectStats'
import TaskManagement from '../../components/admin/TaskManagement'

const Projects = () => {
  const { user: currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('projects')
  
  // Project data
  const [projects, setProjects] = useState([])
  const [stats, setStats] = useState({})
  const [workload, setWorkload] = useState([])
  const [availableUsers, setAvailableUsers] = useState([])
  
  // Filters and pagination
  const [filters, setFilters] = useState({
    search: '',
    user_id: '',
    status: '',
    start_date: '',
    end_date: ''
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  useEffect(() => {
    if (currentUser) {
      initializeData()
    }
  }, [currentUser])

  const initializeData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        fetchProjects(),
        fetchStats(),
        fetchAvailableUsers()
      ])
    } catch (error) {
      console.error('Failed to initialize admin projects data:', error)
      setError('Failed to load project data')
    } finally {
      setLoading(false)
    }
  }

  const fetchProjects = async (customFilters = filters, customPagination = pagination) => {
    try {
      const queryParams = new URLSearchParams({
        page: customPagination.page,
        limit: customPagination.limit,
        ...customFilters
      })
      
      // Remove empty values
      for (let [key, value] of queryParams.entries()) {
        if (!value) queryParams.delete(key)
      }

      const response = await apiClient.get(`/admin/projects?${queryParams.toString()}`)
      setProjects(response.data.projects)
      setPagination(prev => ({
        ...prev,
        ...response.data.pagination
      }))
    } catch (error) {
      console.error('Failed to fetch projects:', error)
      setError('Failed to load projects')
    }
  }

  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/admin/projects/stats')
      setStats(response.data.stats)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const fetchWorkload = async () => {
    try {
      const response = await apiClient.get('/admin/projects/workload')
      setWorkload(response.data.workload)
    } catch (error) {
      console.error('Failed to fetch workload:', error)
    }
  }

  const fetchAvailableUsers = async () => {
    try {
      const response = await apiClient.get('/admin/projects/available-users')
      setAvailableUsers(response.data.users)
    } catch (error) {
      console.error('Failed to fetch available users:', error)
    }
  }

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    setPagination(prev => ({ ...prev, page: 1 }))
    fetchProjects(newFilters, { ...pagination, page: 1 })
  }

  const handlePageChange = (newPage) => {
    const newPagination = { ...pagination, page: newPage }
    setPagination(newPagination)
    fetchProjects(filters, newPagination)
  }

  const handleRefresh = () => {
    initializeData()
  }

  const handleProjectUpdate = () => {
    // Refresh projects with current filters and pagination
    fetchProjects()
    // Also refresh stats to show updated counts
    fetchStats()
  }

  const tabs = [
    { id: 'projects', label: 'Project Management', icon: FolderOpen },
    { id: 'tasks', label: 'Task Management', icon: Calendar },
    { id: 'stats', label: 'Statistics', icon: BarChart3 },
    { id: 'workload', label: 'User Workload', icon: Users }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading project management...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center text-gray-600 hover:text-gray-800 mr-4"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Dashboard
              </button>
              <FolderOpen className="h-8 w-8 text-purple-600 mr-3" />
              <h1 className="text-xl font-semibold">Project Management</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleRefresh}
                className="flex items-center text-gray-600 hover:text-gray-800"
                title="Refresh data"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
              <span className="text-gray-700">Welcome, {currentUser?.name}</span>
              <button
                onClick={logout}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Page Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Project Management</h2>
            <p className="text-gray-600">Manage projects across all users, assign tasks, and track progress</p>
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

          {/* Quick Stats */}
          {stats && Object.keys(stats).length > 0 && (
            <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <FolderOpen className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Projects</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats.total_projects || 0}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Calendar className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Active Projects</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats.active_projects || 0}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Users className="h-8 w-8 text-purple-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Users with Projects</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats.users_with_projects || 0}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <BarChart3 className="h-8 w-8 text-orange-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Work Hours</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats.total_work_hours || 0}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="mb-6">
            <nav className="flex space-x-8" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id)
                      if (tab.id === 'workload') {
                        fetchWorkload()
                      }
                    }}
                    className={`${
                      isActive
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="bg-white shadow rounded-lg">
            {activeTab === 'projects' && (
              <ProjectManagement
                projects={projects}
                availableUsers={availableUsers}
                filters={filters}
                pagination={pagination}
                onFilterChange={handleFilterChange}
                onPageChange={handlePageChange}
                onRefresh={handleRefresh}
                onProjectUpdate={handleProjectUpdate}
              />
            )}

            {activeTab === 'tasks' && (
              <TaskManagement />
            )}

            {activeTab === 'stats' && (
              <ProjectStats
                stats={stats}
                onRefresh={fetchStats}
              />
            )}

            {activeTab === 'workload' && (
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-6">User Workload Summary</h3>
                {workload.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No workload data</h3>
                    <p className="text-gray-600">User workload information will appear here</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Active Projects
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Projects
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Completion Rate
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Work Hours
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {workload.map((user) => (
                          <tr key={user.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {user.active_projects}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {user.total_projects}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {user.project_completion_rate}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {user.total_work_hours}h
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default Projects 