import React, { useState } from 'react'
import { useVMs } from '@hooks/useVMs'
import { useConnections } from '@hooks/useConnections'
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/Card'
import Button from '@components/ui/Button'
import Badge from '@components/ui/Badge'
import Modal from '@components/ui/Modal'
import VMCredentialsForm from './VMCredentialsForm'
import { 
  Monitor, 
  User, 
  Activity, 
  Settings, 
  Wifi, 
  WifiOff, 
  Edit, 
  UserPlus,
  TestTube,
  Clock,
  Calendar,
  MapPin,
  HardDrive,
  Key
} from 'lucide-react'

const VMDetails = ({ vm, onEdit, onAssign, onClose }) => {
  const [showCredentialsModal, setShowCredentialsModal] = useState(false)
  const [testingConnectivity, setTestingConnectivity] = useState(false)
  const [connectivityResult, setConnectivityResult] = useState(null)
  const [vmCredentials, setVmCredentials] = useState(null)

  const { testConnectivity, saveCredentials, getCredentials, testCredentials } = useVMs()
  const { activeConnections } = useConnections()

  // Get active sessions for this VM
  const vmActiveSessions = activeConnections.filter(session => session.vmId === vm.id)

  const handleTestConnectivity = async () => {
    setTestingConnectivity(true)
    try {
      const result = await testConnectivity(vm.id)
      setConnectivityResult(result)
    } catch (error) {
      setConnectivityResult({
        success: false,
        error: error.message || 'Connectivity test failed'
      })
    } finally {
      setTestingConnectivity(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'success'
      case 'offline': return 'secondary'
      case 'maintenance': return 'warning'
      case 'error': return 'error'
      default: return 'secondary'
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  const handleManageCredentials = async () => {
    try {
      const credentials = await getCredentials(vm.id)
      setVmCredentials(credentials)
      setShowCredentialsModal(true)
    } catch (error) {
      console.error('Failed to fetch credentials:', error)
      setShowCredentialsModal(true)
    }
  }

  const handleSaveCredentials = async (credentialsData) => {
    try {
      await saveCredentials(credentialsData)
      setShowCredentialsModal(false)
      // Optionally refresh VM data
    } catch (error) {
      console.error('Failed to save credentials:', error)
      throw error
    }
  }

  const handleTestCredentials = async (credentialsData) => {
    try {
      return await testCredentials(credentialsData)
    } catch (error) {
      console.error('Failed to test credentials:', error)
      throw error
    }
  }

  return (
    <div className="space-y-6">
      {/* VM Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-primary-100 rounded-lg">
            <Monitor className="h-8 w-8 text-primary-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{vm.name}</h2>
            <p className="text-gray-600">{vm.description}</p>
            <div className="flex items-center space-x-4 mt-2">
              <Badge variant={getStatusColor(vm.status)}>
                {vm.status === 'online' ? (
                  <Wifi className="h-3 w-3 mr-1" />
                ) : (
                  <WifiOff className="h-3 w-3 mr-1" />
                )}
                {vm.status}
              </Badge>
              {vmActiveSessions.length > 0 && (
                <Badge variant="success">
                  <Activity className="h-3 w-3 mr-1" />
                  {vmActiveSessions.length} Active Session{vmActiveSessions.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={handleTestConnectivity}
            loading={testingConnectivity}
            disabled={testingConnectivity}
          >
            <TestTube className="h-4 w-4 mr-2" />
            Test Connectivity
          </Button>
          <Button
            variant="outline"
            onClick={() => handleManageCredentials()}
          >
            <Key className="h-4 w-4 mr-2" />
            Manage Credentials
          </Button>
          <Button
            variant="outline"
            onClick={onAssign}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Assign User
          </Button>
          <Button onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit VM
          </Button>
        </div>
      </div>

      {/* Connectivity Test Result */}
      {connectivityResult && (
        <Card className={`border-2 ${connectivityResult.success ? 'border-success-200 bg-success-50' : 'border-error-200 bg-error-50'}`}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              {connectivityResult.success ? (
                <div className="w-5 h-5 bg-success-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              ) : (
                <div className="w-5 h-5 bg-error-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              <div>
                <p className={`font-medium ${connectivityResult.success ? 'text-success-900' : 'text-error-900'}`}>
                  {connectivityResult.success ? 'Connectivity Test Passed' : 'Connectivity Test Failed'}
                </p>
                <p className={`text-sm ${connectivityResult.success ? 'text-success-700' : 'text-error-700'}`}>
                  {connectivityResult.success 
                    ? `Response time: ${connectivityResult.responseTime}ms`
                    : connectivityResult.error
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">IP Address</label>
                <p className="text-gray-900 font-mono">{vm.ipAddress}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Operating System</label>
                <p className="text-gray-900">{vm.osType} {vm.osVersion}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <div className="mt-1">
                  <Badge variant={getStatusColor(vm.status)}>
                    {vm.status}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Region</label>
                <p className="text-gray-900 flex items-center">
                  <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                  {vm.region || 'Not specified'}
                </p>
              </div>
            </div>

            {vm.instanceId && (
              <div>
                <label className="text-sm font-medium text-gray-500">Instance ID</label>
                <p className="text-gray-900 font-mono">{vm.instanceId}</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-500">Created</label>
              <p className="text-gray-900 flex items-center">
                <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                {formatDate(vm.createdAt)}
              </p>
            </div>

            {vm.updatedAt && vm.updatedAt !== vm.createdAt && (
              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p className="text-gray-900 flex items-center">
                  <Clock className="h-4 w-4 mr-1 text-gray-400" />
                  {formatDate(vm.updatedAt)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assignment Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Assignment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {vm.assignedUserName ? (
              <div>
                <label className="text-sm font-medium text-gray-500">Assigned To</label>
                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-success-100 rounded-lg">
                      <User className="h-4 w-4 text-success-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{vm.assignedUserName}</p>
                      <p className="text-sm text-gray-600">{vm.assignedUserEmail}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="p-3 bg-gray-100 rounded-lg inline-block mb-3">
                  <User className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-gray-500 mb-3">This VM is not assigned to any user</p>
                <Button variant="outline" onClick={onAssign}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign User
                </Button>
              </div>
            )}

            {/* Active Sessions */}
            <div>
              <label className="text-sm font-medium text-gray-500">Active Sessions</label>
              {vmActiveSessions.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {vmActiveSessions.map((session) => (
                    <div key={session.sessionId} className="p-3 bg-success-50 border border-success-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-success-900">
                            {session.connectionType.toUpperCase()} Session
                          </p>
                          <p className="text-sm text-success-700">
                            Started {formatDate(session.startTime)}
                          </p>
                        </div>
                        <Badge variant="success" className="animate-pulse">
                          Active
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 mt-1">No active sessions</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tags and Metadata */}
      {vm.tags && Object.keys(vm.tags).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <HardDrive className="h-5 w-5 mr-2" />
              Tags & Metadata
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(vm.tags).map(([key, value]) => (
                <div key={key} className="p-3 bg-gray-50 rounded-lg">
                  <label className="text-sm font-medium text-gray-500">{key}</label>
                  <p className="text-gray-900">{value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Usage Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {vm.totalSessions || 0}
              </p>
              <p className="text-sm text-gray-500">Total Sessions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {Math.round((vm.totalUsageMinutes || 0) / 60)}h
              </p>
              <p className="text-sm text-gray-500">Total Usage</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {vm.uniqueUsers || 0}
              </p>
              <p className="text-sm text-gray-500">Unique Users</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {vm.activeDays || 0}
              </p>
              <p className="text-sm text-gray-500">Active Days</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button variant="outline" onClick={onAssign}>
          <UserPlus className="h-4 w-4 mr-2" />
          Manage Assignment
        </Button>
        <Button onClick={onEdit}>
          <Edit className="h-4 w-4 mr-2" />
          Edit VM
        </Button>
      </div>

      {/* VM Credentials Modal */}
      <Modal
        isOpen={showCredentialsModal}
        onClose={() => {
          setShowCredentialsModal(false)
          setVmCredentials(null)
        }}
        title="Manage VM Credentials"
        size="lg"
      >
        <VMCredentialsForm
          vm={vm}
          credentials={vmCredentials}
          onSubmit={handleSaveCredentials}
          onCancel={() => {
            setShowCredentialsModal(false)
            setVmCredentials(null)
          }}
          onTest={handleTestCredentials}
        />
      </Modal>
    </div>
  )
}

export default VMDetails
