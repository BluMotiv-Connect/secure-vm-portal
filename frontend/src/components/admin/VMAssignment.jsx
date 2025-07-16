import React, { useState, useEffect } from 'react'
import { useUsers } from '@hooks/useUsers'
import Button from '@components/ui/Button'
import Select from '@components/ui/Select'
import Input from '@components/ui/Input'
import Badge from '@components/ui/Badge'
import { Card, CardContent } from '@components/ui/Card'
import { Monitor, User, Search, UserPlus, UserMinus, Check } from 'lucide-react'

const VMAssignment = ({ vm, users, onAssign, onUnassign, onClose }) => {
  const [selectedUserIds, setSelectedUserIds] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [isUnassigning, setIsUnassigning] = useState(false)

  // Filter users based on search term
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Get currently assigned users
  const assignedUsers = vm.assignedUsers || []

  // Toggle user selection
  const toggleUserSelection = (userId) => {
    setSelectedUserIds(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId)
      } else {
        return [...prev, userId]
      }
    })
  }

  const handleAssign = async () => {
    if (selectedUserIds.length === 0) return

    setIsAssigning(true)
    try {
      await onAssign({ id: vm.id, userIds: selectedUserIds })
      onClose()
    } catch (error) {
      console.error('Assignment failed:', error)
    } finally {
      setIsAssigning(false)
    }
  }

  const handleUnassign = async () => {
    setIsUnassigning(true)
    try {
      await onUnassign(vm.id)
      onClose()
    } catch (error) {
      console.error('Unassignment failed:', error)
    } finally {
      setIsUnassigning(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* VM Information */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-primary-100 rounded-lg">
              <Monitor className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{vm.name}</h3>
              <p className="text-sm text-gray-600">{vm.ipAddress}</p>
              <p className="text-sm text-gray-500">{vm.osType} {vm.osVersion}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Assignments */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Current Assignments</h4>
        {assignedUsers.length > 0 ? (
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                {assignedUsers.map(user => (
                  <div key={user.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-success-100 rounded-lg">
                        <User className="h-5 w-5 text-success-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <Badge variant="success" size="sm" className="mt-1">
                          Assigned
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUnassign}
                loading={isUnassigning}
                disabled={isUnassigning}
                className="mt-4"
              >
                <UserMinus className="h-4 w-4 mr-1" />
                Unassign All
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-4 text-center">
              <div className="p-3 bg-gray-100 rounded-lg inline-block mb-3">
                <UserMinus className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-gray-500">This VM is not assigned to any users</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* User Selection */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">
          Select Users to Assign
        </h4>
        
        {/* User Search */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* User Selection */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No users found</p>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedUserIds.includes(user.id)
                      ? 'border-primary-300 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => toggleUserSelection(user.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <User className="h-4 w-4 text-gray-600" />
                        </div>
                        {selectedUserIds.includes(user.id) && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary-600 rounded-full flex items-center justify-center">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant={user.role === 'admin' ? 'primary' : 'secondary'} size="sm">
                            {user.role}
                          </Badge>
                          <Badge variant={user.isActive ? 'success' : 'secondary'} size="sm">
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Assignment Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isAssigning}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              loading={isAssigning}
              disabled={selectedUserIds.length === 0 || isAssigning}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {selectedUserIds.length === 1 ? 'Assign User' : `Assign ${selectedUserIds.length} Users`}
            </Button>
          </div>
        </div>
      </div>

      {/* Assignment Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Assignment Information</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Users can only access VMs assigned to them</li>
          <li>• Assignment changes take effect immediately</li>
          <li>• Active sessions will continue until manually ended</li>
          <li>• Only active users can be assigned VMs</li>
          <li>• Multiple users can be assigned to the same VM</li>
        </ul>
      </div>
    </div>
  )
}

export default VMAssignment
