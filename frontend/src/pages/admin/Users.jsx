import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { apiClient } from '../../services/apiClient'
import { 
  Users as UsersIcon, 
  Plus, 
  Edit, 
  Trash2, 
  UserCheck, 
  UserX,
  ArrowLeft,
  Bug,
  Database,
  RefreshCw,
  Eye
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const Users = () => {
  const { user: currentUser, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddUser, setShowAddUser] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [debugInfo, setDebugInfo] = useState(null)

  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'employee',
    is_active: true
  })

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      console.log('[Users] Component mounted, user authenticated:', currentUser)
      fetchUsers()
    } else {
      console.log('[Users] Waiting for authentication...', { isAuthenticated, currentUser: !!currentUser })
    }
  }, [isAuthenticated, currentUser])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError('')
      
      console.log('[Users] About to fetch users...')
      console.log('[Users] Token in localStorage:', !!localStorage.getItem('authToken'))
      console.log('[Users] User in localStorage:', !!localStorage.getItem('user'))
      console.log('[Users] Current user from context:', currentUser)
      
      const response = await apiClient.get('/users')
      console.log('[Users] Users response:', response.data)
      
      setUsers(response.data.users || [])
    } catch (error) {
      console.error('[Users] Fetch users error:', error)
      console.error('[Users] Error response:', error.response?.data)
      setError(error.response?.data?.error || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setError('')
      
      console.log('[Users] Submitting user form:', formData)
      
      if (editingUser) {
        await apiClient.put(`/users/${editingUser.id}`, formData)
        console.log('[Users] User updated successfully')
      } else {
        await apiClient.post('/users', formData)
        console.log('[Users] User created successfully')
      }
      
      setShowAddUser(false)
      setEditingUser(null)
      resetForm()
      fetchUsers()
    } catch (error) {
      console.error('[Users] Save user error:', error)
      setError(error.response?.data?.error || 'Failed to save user')
    }
  }

  const resetForm = () => {
    setFormData({
      email: '',
      name: '',
      role: 'employee',
      is_active: true
    })
  }

  const handleEdit = (user) => {
    console.log('[Users] Editing user:', user)
    setEditingUser(user)
    setFormData({
      email: user.email,
      name: user.name,
      role: user.role,
      is_active: user.is_active
    })
    setShowAddUser(true)
  }

  const handleDelete = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    
    try {
      console.log('[Users] Deleting user:', userId)
      await apiClient.delete(`/users/${userId}`)
      console.log('[Users] User deleted successfully')
      fetchUsers()
    } catch (error) {
      console.error('[Users] Delete user error:', error)
      setError(error.response?.data?.error || 'Failed to delete user')
    }
  }

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const user = users.find(u => u.id === userId)
      console.log('[Users] Toggling user status:', { userId, currentStatus, user })
      
      await apiClient.put(`/users/${userId}`, {
        ...user,
        is_active: !currentStatus
      })
      console.log('[Users] User status updated successfully')
      fetchUsers()
    } catch (error) {
      console.error('[Users] Toggle user status error:', error)
      setError('Failed to update user status')
    }
  }

  const debugAuth = async () => {
    console.log('=== COMPREHENSIVE AUTH DEBUG ===')
    
    const authToken = localStorage.getItem('authToken')
    const userString = localStorage.getItem('user')
    
    console.log('1. LocalStorage Data:')
    console.log('   - Token exists:', !!authToken)
    console.log('   - Token preview:', authToken?.substring(0, 50) + '...')
    console.log('   - User exists:', !!userString)
    console.log('   - User data:', userString ? JSON.parse(userString) : null)
    
    console.log('2. Context Data:')
    console.log('   - Current user:', currentUser)
    console.log('   - Is authenticated:', isAuthenticated)
    
    console.log('3. Component State:')
    console.log('   - Users:', users)
    console.log('   - Loading:', loading)
    console.log('   - Error:', error)
    
    // Test API endpoints
    try {
      console.log('4. Testing API Endpoints:')
      
      // Test debug endpoint
      const debugResponse = await apiClient.get('/users/debug')
      console.log('   - Debug endpoint:', debugResponse.data)
      
      // Test health endpoint
      const healthResponse = await apiClient.get('/users/health')
      console.log('   - Health endpoint:', healthResponse.data)
      
      setDebugInfo({
        localStorage: {
          hasToken: !!authToken,
          hasUser: !!userString,
          user: userString ? JSON.parse(userString) : null
        },
        context: {
          currentUser,
          isAuthenticated
        },
        api: {
          debug: debugResponse.data,
          health: healthResponse.data
        }
      })
      
    } catch (error) {
      console.error('   - API test failed:', error)
      setDebugInfo({
        error: error.response?.data || error.message
      })
    }
    
    console.log('================================')
  }

  const checkDatabase = async () => {
    try {
      console.log('[Database Check] Testing database connection...')
      
      const healthResponse = await apiClient.get('/users/health')
      console.log('[Database Check] Health response:', healthResponse.data)
      
      alert(`Database Status: ${healthResponse.data.database}\nUser Count: ${healthResponse.data.userCount}`)
      
    } catch (error) {
      console.error('[Database Check] Failed:', error)
      alert(`Database check failed: ${error.response?.data?.error || error.message}`)
    }
  }

  const testUserCreation = async () => {
    try {
      console.log('[Test] Creating test user...')
      
      const testUser = {
        email: 'test@blumotiv.com',
        name: 'Test Employee',
        role: 'employee',
        is_active: true
      }
      
      const response = await apiClient.post('/users', testUser)
      console.log('[Test] Test user created:', response.data)
      
      alert('Test user created successfully!')
      fetchUsers()
      
    } catch (error) {
      console.error('[Test] Failed to create test user:', error)
      alert(`Failed to create test user: ${error.response?.data?.error || error.message}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading users...</p>
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
              <UsersIcon className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold">User Management</h1>
            </div>
            <div className="flex items-center space-x-4">
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
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Users</h2>
              <p className="text-gray-600">Manage user accounts and permissions. Only added users can log in as employees.</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={debugAuth}
                className="bg-yellow-500 text-white px-3 py-2 rounded hover:bg-yellow-600 flex items-center text-sm"
              >
                <Bug className="h-4 w-4 mr-1" />
                Debug Auth
              </button>
              <button
                onClick={checkDatabase}
                className="bg-purple-500 text-white px-3 py-2 rounded hover:bg-purple-600 flex items-center text-sm"
              >
                <Database className="h-4 w-4 mr-1" />
                Check DB
              </button>
              <button
                onClick={testUserCreation}
                className="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600 flex items-center text-sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Test User
              </button>
              <button
                onClick={fetchUsers}
                className="bg-gray-500 text-white px-3 py-2 rounded hover:bg-gray-600 flex items-center text-sm"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </button>
              <button
                onClick={() => {
                  setShowAddUser(true)
                  setEditingUser(null)
                  resetForm()
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </button>
            </div>
          </div>

          {/* Debug Info Display */}
          {debugInfo && (
            <div className="bg-gray-100 border border-gray-300 rounded p-4 mb-6">
              <h3 className="text-lg font-medium mb-2 flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                Debug Information
              </h3>
              <pre className="text-xs overflow-auto max-h-64 bg-white p-3 rounded border">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
              <button
                onClick={() => setDebugInfo(null)}
                className="mt-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Close Debug Info
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">
                    {error}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add/Edit User Form */}
          {showAddUser && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-medium mb-4">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="user@blumotiv.com"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Only this email can log in as employee</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="employee">Employee</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                      className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="is_active" className="text-sm text-gray-700">
                      Active User
                    </label>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    {editingUser ? 'Update User' : 'Add User'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddUser(false)
                      setEditingUser(null)
                      setError('')
                    }}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Users Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Users ({users.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEdit(user)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                            title="Edit user"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => toggleUserStatus(user.id, user.is_active)}
                            className="text-yellow-600 hover:text-yellow-900 p-1 rounded hover:bg-yellow-50"
                            title={user.is_active ? 'Deactivate user' : 'Activate user'}
                          >
                            {user.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </button>
                          {user.email !== currentUser?.email && (
                            <button
                              onClick={() => handleDelete(user.id)}
                              className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                              title="Delete user"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {users.length === 0 && !loading && (
            <div className="text-center py-12">
              <UsersIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Users Found</h3>
              <p className="text-gray-600 mb-4">
                {error ? 'There was an error loading users. Use the debug buttons above to investigate.' : 'Start by adding users who can access the system.'}
              </p>
              <div className="space-x-3">
                <button
                  onClick={() => {
                    setShowAddUser(true)
                    setEditingUser(null)
                    resetForm()
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Add First User
                </button>
                <button
                  onClick={fetchUsers}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Retry Loading
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default Users
