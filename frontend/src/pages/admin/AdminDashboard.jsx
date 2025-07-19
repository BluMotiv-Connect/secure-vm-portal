import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../services/apiClient'
import { Shield, Users, Monitor, BarChart3, LogOut, FolderOpen, Activity } from 'lucide-react'
import ActiveSessionsManager from '../../components/admin/ActiveSessionsManager'

const AdminDashboard = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalVMs: 0,
    activeVMs: 0,
    activeSessions: 0
  })

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const [usersResponse, vmsResponse, activeSessionsResponse] = await Promise.all([
        apiClient.get('/users'),
        apiClient.get('/vms'),
        apiClient.get('/work-sessions/admin/active')
      ])

      const users = usersResponse.data.users
      const vms = vmsResponse.data.vms
      const activeSessions = activeSessionsResponse.data.sessions

      setStats({
        totalUsers: users.length,
        totalVMs: vms.length,
        activeVMs: vms.filter(vm => vm.status === 'online').length,
        activeSessions: activeSessions.length
      })
    } catch (error) {
      console.error('Failed to fetch stats:', error)
      // Fallback to basic stats if active sessions fetch fails
      try {
        const [usersResponse, vmsResponse] = await Promise.all([
          apiClient.get('/users'),
          apiClient.get('/vms')
        ])

        const users = usersResponse.data.users
        const vms = vmsResponse.data.vms

        setStats({
          totalUsers: users.length,
          totalVMs: vms.length,
          activeVMs: vms.filter(vm => vm.status === 'online').length,
          activeSessions: 0 // Default to 0 if we can't fetch active sessions
        })
      } catch (fallbackError) {
        console.error('Failed to fetch fallback stats:', fallbackError)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold">Admin Portal</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user?.name}</span>
              <button
                onClick={logout}
                className="flex items-center bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
            <p className="text-gray-600">Manage users, VMs, and monitor system activity</p>
          </div>

          {/* Admin Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* User Management */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        User Management
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        Add, edit, and manage users
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-3">
                <button 
                  onClick={() => navigate('/admin/users')}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Manage Users →
                </button>
              </div>
            </div>

            {/* VM Management */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Monitor className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        VM Management
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        Configure and assign VMs
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-3">
                <button 
                  onClick={() => navigate('/admin/virtual-machines')}
                  className="text-sm text-green-600 hover:text-green-700 font-medium"
                >
                  Manage VMs →
                </button>
              </div>
            </div>

            {/* Project Management */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <FolderOpen className="h-8 w-8 text-orange-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Project Management
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        Assign and review projects
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-3">
                <button 
                  onClick={() => navigate('/admin/projects')}
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                >
                  Manage Projects →
                </button>
              </div>
            </div>

            {/* Active Sessions Management */}
            <div className="bg-white overflow-hidden shadow rounded-lg border-l-4 border-red-500">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Activity className="h-8 w-8 text-red-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Active Sessions
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        Monitor and manage live sessions
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-red-50 px-6 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-red-600 font-medium">
                    {stats.activeSessions} Active Now
                  </span>
                  <button 
                    onClick={() => document.getElementById('active-sessions-section').scrollIntoView({ behavior: 'smooth' })}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    View Sessions →
                  </button>
                </div>
              </div>
            </div>

            {/* Reports */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <BarChart3 className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Reports & Analytics
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        View usage and export logs
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-3">
                <button 
                  onClick={() => navigate('/admin/reports')}
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  View Reports →
                </button>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-2xl font-bold text-blue-600">{stats.totalUsers}</div>
                <div className="text-sm text-gray-600">Total Users</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-2xl font-bold text-green-600">{stats.activeVMs}</div>
                <div className="text-sm text-gray-600">Active VMs</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-2xl font-bold text-yellow-600">{stats.activeSessions}</div>
                <div className="text-sm text-gray-600">Active Sessions</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-2xl font-bold text-purple-600">{stats.totalVMs}</div>
                <div className="text-sm text-gray-600">Total VMs</div>
              </div>
            </div>
          </div>

          {/* Active Sessions Management */}
          <div id="active-sessions-section" className="mt-8">
            <ActiveSessionsManager />
          </div>
        </div>
      </main>
    </div>
  )
}

export default AdminDashboard
