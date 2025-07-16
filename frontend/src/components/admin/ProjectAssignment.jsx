import React, { useState, useEffect } from 'react'
import { X, User, UserCheck, Users, AlertCircle, Plus, Minus } from 'lucide-react'

const ProjectAssignment = ({ project, availableUsers, onSubmit, onClose, loading }) => {
  const [selectedUserIds, setSelectedUserIds] = useState([])
  const [multipleMode, setMultipleMode] = useState(false)

  useEffect(() => {
    // Initialize with current assignments if available
    if (project.assigned_users && project.assigned_users.length > 0) {
      setSelectedUserIds(project.assigned_users.map(u => u.id))
      setMultipleMode(project.assigned_users.length > 1)
    } else if (project.user_id) {
      setSelectedUserIds([project.user_id])
    }
  }, [project])

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (selectedUserIds.length === 0) {
      return
    }

    // Check if assignment has actually changed
    const currentUserIds = project.assigned_users 
      ? project.assigned_users.map(u => u.id).sort()
      : project.user_id ? [project.user_id] : []
    
    const newUserIds = [...selectedUserIds].sort()
    const hasChanged = JSON.stringify(currentUserIds) !== JSON.stringify(newUserIds)
    
    if (!hasChanged) {
      return
    }

    if (multipleMode) {
      onSubmit({ user_ids: selectedUserIds })
    } else {
      onSubmit(selectedUserIds[0])
    }
  }

  const toggleUserSelection = (userId) => {
    if (multipleMode) {
      setSelectedUserIds(prev => {
        if (prev.includes(userId)) {
          return prev.filter(id => id !== userId)
        } else {
          return [...prev, userId]
        }
      })
    } else {
      setSelectedUserIds([userId])
    }
  }

  const toggleMode = () => {
    setMultipleMode(!multipleMode)
    if (!multipleMode && selectedUserIds.length > 1) {
      // Switching to single mode - keep only first selected user
      setSelectedUserIds(selectedUserIds.slice(0, 1))
    }
  }

  const currentAssignments = project.assigned_users || (project.user_id ? [{ id: project.user_id, name: project.user_name, email: project.user_email }] : [])
  const selectedUsers = availableUsers.filter(user => selectedUserIds.includes(user.id))
  
  // Check if assignment has changed
  const currentUserIds = currentAssignments.map(u => u.id).sort()
  const newUserIds = [...selectedUserIds].sort()
  const hasChanged = JSON.stringify(currentUserIds) !== JSON.stringify(newUserIds)

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {currentAssignments.length > 0 ? 'Reassign Project' : 'Assign Project to Users'}
            </h3>
            {currentAssignments.length > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                Currently assigned to: <strong>{currentAssignments.map(u => u.name).join(', ')}</strong>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Project Info */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900">{project.name}</h4>
          <p className="text-sm text-gray-600">{project.description || 'No description'}</p>
          
          {currentAssignments.length > 0 && (
            <div className="mt-2 flex items-center text-sm text-gray-600">
              <Users className="h-4 w-4 mr-1" />
              Currently assigned to: 
              <div className="ml-2 flex flex-wrap gap-1">
                {currentAssignments.map(user => (
                  <span key={user.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    {user.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mode Toggle */}
        <div className="mb-4 flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Select User(s) to Assign Project
          </label>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Single user</span>
            <button
              type="button"
              onClick={toggleMode}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                multipleMode ? 'bg-purple-600' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                multipleMode ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
            <span className="text-sm text-gray-600">Multiple users</span>
          </div>
        </div>

        {/* Assignment Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {availableUsers.map(user => {
                const isSelected = selectedUserIds.includes(user.id)
                const isCurrent = currentAssignments.some(u => u.id === user.id)
                
                return (
                  <div
                    key={user.id}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleUserSelection(user.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {multipleMode ? (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // Handled by onClick
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                          />
                        ) : (
                          <input
                            type="radio"
                            name="user"
                            checked={isSelected}
                            onChange={() => {}} // Handled by onClick
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                          />
                        )}
                        <div className="ml-3">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-900">
                              {user.name}
                            </span>
                            {user.role === 'admin' && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                Admin
                              </span>
                            )}
                            {isCurrent && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-sm text-gray-900">
                          {user.active_projects || 0} active
                        </div>
                        <div className="text-xs text-gray-500">
                          {user.current_projects || 0} total
                        </div>
                      </div>
                    </div>
                    
                    {/* Workload indicator */}
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Current workload</span>
                        <span>{user.active_projects || 0}/10 projects</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className={`h-1.5 rounded-full ${
                            (user.active_projects || 0) > 7 
                              ? 'bg-red-500' 
                              : (user.active_projects || 0) > 4 
                              ? 'bg-yellow-500' 
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(((user.active_projects || 0) / 10) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Selected Users Summary */}
          {selectedUsers.length > 0 && (
            <div className={`p-4 border rounded-lg ${
              !hasChanged
                ? 'bg-yellow-50 border-yellow-200' 
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-start">
                <UserCheck className={`h-5 w-5 mr-2 mt-0.5 ${
                  !hasChanged ? 'text-yellow-600' : 'text-blue-600'
                }`} />
                <div className="flex-1">
                  {!hasChanged ? (
                    <div>
                      <p className="text-sm font-medium text-yellow-900">
                        No changes made
                      </p>
                      <p className="text-xs text-yellow-700">
                        The selected assignment is the same as current
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        {currentAssignments.length > 0 ? 'Reassigning to:' : 'Assigning to:'}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedUsers.map(user => (
                          <span key={user.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {user.name}
                            {user.role === 'admin' && ' (Admin)'}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-blue-700 mt-1">
                        {selectedUsers.length} user(s) selected
                      </p>
                      {selectedUsers.some(user => (user.active_projects || 0) > 7) && (
                        <div className="flex items-center mt-1">
                          <AlertCircle className="h-3 w-3 text-yellow-600 mr-1" />
                          <p className="text-xs text-yellow-700">
                            Warning: Some users have high workload
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || selectedUserIds.length === 0 || !hasChanged}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {currentAssignments.length > 0 ? 'Reassigning...' : 'Assigning...'}
                </div>
              ) : (
                `${currentAssignments.length > 0 ? 'Reassign' : 'Assign'} Project (${selectedUserIds.length} user${selectedUserIds.length !== 1 ? 's' : ''})`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProjectAssignment 