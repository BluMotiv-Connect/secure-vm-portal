import React, { useState, useEffect } from 'react'
import { apiClient } from '../../services/apiClient'
import { Users, Plus, X, Monitor, AlertTriangle, RefreshCw } from 'lucide-react'

const VMAssignmentManager = ({ vm, onClose, onUpdate }) => {
  const [assignments, setAssignments] = useState([])
  const [availableUsers, setAvailableUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    if (vm) {
      fetchAssignments()
      fetchAvailableUsers()
    }
  }, [vm])

  const fetchAssignments = async () => {
    try {
      const response = await apiClient.get(`/vms/${vm.id}/assignments`)
      setAssignments(response.data.assignments || [])
    } catch (err) {
      console.error('Failed to fetch VM assignments:', err)
      setError('Failed to load VM assignments')
    }
  }

  const fetchAvailableUsers = async () => {
    try {
      const response = await apiClient.get('/users')
      setAvailableUsers(response.data.users || [])
    } catch (err) {
      console.error('Failed to fetch users:', err)
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleAssignUser = async () => {
    if (!selectedUserId) return

    try {
      setAssigning(true)
      await apiClient.post(`/vms/${vm.id}/assign`, { user_id: selectedUserId })
      
      // Refresh assignments
      await fetchAssignments()
      setSelectedUserId('')
      setError('')
      
      // Notify parent component
      if (onUpdate) onUpdate()
      
    } catch (err) {
      console.error('Failed to assign user:', err)
      setError(err.response?.data?.error || 'Failed to assign user to VM')
    } finally {
      setAssigning(false)
    }
  }

  const handleUnassignUser = async (userId) => {
    const assignment = assignments.find(a => a.user_id === userId)
    if (!assignment) return

    if (!confirm(`Remove ${assignment.user_name} from ${vm.name}?`)) return

    try {
      await apiClient.delete(`/vms/${vm.id}/assign/${userId}`)
      
      // Refresh assignments
      await fetchAssignments()
      setError('')
      
      // Notify parent component
      if (onUpdate) onUpdate()
      
    } catch (err) {
      console.error('Failed to unassign user:', err)
      setError(err.response?.data?.error || 'Failed to unassign user from VM')
    }
  }

  const getUnassignedUsers = () => {
    const assignedUserIds = assignments.map(a => a.user_id)
    return availableUsers.filter(user => !assignedUserIds.includes(user.id))
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-2" />
            <span>Loading VM assignments...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Monitor className="h-6 w-6 text-blue-600 mr-2" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Manage VM Assignments
              </h3>
              <p className="text-sm text-gray-600">
                {vm.name} ({vm.ip_address})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Add New Assignment */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Assign New User
          </h4>
          <div className="flex items-center space-x-3">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={assigning}
            >
              <option value="">Select a user...</option>
              {getUnassignedUsers().map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email}) - {user.role}
                </option>
              ))}
            </select>
            <button
              onClick={handleAssignUser}
              disabled={!selectedUserId || assigning}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {assigning ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}
              Assign
            </button>
          </div>
          {getUnassignedUsers().length === 0 && (
            <p className="text-sm text-gray-500 mt-2">
              All users are already assigned to this VM
            </p>
          )}
        </div>

        {/* Current Assignments */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Currently Assigned Users ({assignments.length})
          </h4>
          
          {assignments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No users assigned to this VM</p>
            </div>
          ) : (
            <div className="space-y-2">
              {assignments.map((assignment) => (
                <div
                  key={assignment.assignment_id}
                  className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <div className="font-medium text-gray-900">
                        {assignment.user_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {assignment.user_email} • {assignment.user_role}
                      </div>
                      <div className="text-xs text-gray-400">
                        Assigned {new Date(assignment.assigned_at).toLocaleDateString()}
                        {assignment.assigned_by_name && (
                          <span> by {assignment.assigned_by_name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnassignUser(assignment.user_id)}
                    className="flex items-center px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default VMAssignmentManager