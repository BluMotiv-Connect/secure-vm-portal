import React from 'react'
import { useUsers } from '@hooks/useUsers'
import Button from '@components/ui/Button'
import Badge from '@components/ui/Badge'
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/Card'
import LoadingSpinner from '@components/common/LoadingSpinner'
import { formatDate, formatTimeAgo } from '@utils/formatters'
import { Edit, Mail, Calendar, Activity, Monitor, Clock } from 'lucide-react'

const UserDetails = ({ user, onEdit, onClose }) => {
  const { useUser } = useUsers()
  const { data: userDetails, isLoading } = useUser(user.id)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const userData = userDetails?.user || user
  const assignedVMs = userDetails?.assignedVMs || []
  const activeSessions = userDetails?.activeSessions || []
  const workLogsSummary = userDetails?.workLogsSummary || []

  return (
    <div className="space-y-6">
      {/* User Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <div className="h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-700 font-bold text-xl">
              {userData.name?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{userData.name}</h2>
            <p className="text-gray-600 flex items-center">
              <Mail className="h-4 w-4 mr-1" />
              {userData.email}
            </p>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant={userData.role === 'admin' ? 'primary' : 'secondary'}>
                {userData.role}
              </Badge>
              <Badge variant={userData.isActive ? 'success' : 'secondary'}>
                {userData.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </div>

        <Button onClick={onEdit}>
          <Edit className="h-4 w-4 mr-2" />
          Edit User
        </Button>
      </div>

      {/* User Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">Created</label>
              <p className="text-gray-900">{formatDate(userData.createdAt)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Last Login</label>
              <p className="text-gray-900">
                {userData.lastLogin ? formatTimeAgo(userData.lastLogin) : 'Never'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Azure ID</label>
              <p className="text-gray-900 font-mono text-sm">{userData.azureId}</p>
            </div>
          </CardContent>
        </Card>

        {/* Activity Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Activity Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Assigned VMs</span>
              <span className="font-medium">{assignedVMs.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Active Sessions</span>
              <span className="font-medium">{activeSessions.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Total Work Sessions</span>
              <span className="font-medium">
                {workLogsSummary.reduce((sum, log) => sum + log.sessionCount, 0)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assigned VMs */}
      {assignedVMs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Monitor className="h-5 w-5 mr-2" />
              Assigned Virtual Machines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignedVMs.map((vm) => (
                <div
                  key={vm.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{vm.name}</h4>
                      <p className="text-sm text-gray-500">{vm.ip_address}</p>
                      <p className="text-sm text-gray-500">{vm.os_type}</p>
                    </div>
                    <Badge variant={vm.status === 'online' ? 'success' : 'secondary'}>
                      {vm.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Active Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{session.vm_name}</p>
                    <p className="text-sm text-gray-500">{session.ip_address}</p>
                    <p className="text-sm text-gray-500">
                      Started {formatTimeAgo(session.start_time)}
                    </p>
                  </div>
                  <Badge variant="success">Active</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Work Activity */}
      {workLogsSummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Work Activity (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {workLogsSummary.slice(0, 10).map((log, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
                >
                  <span className="text-sm text-gray-600">
                    {formatDate(log.date)}
                  </span>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {log.sessionCount} sessions
                    </p>
                    <p className="text-xs text-gray-500">
                      {Math.round(log.totalMinutes / 60)}h {log.totalMinutes % 60}m
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  )
}

export default UserDetails
