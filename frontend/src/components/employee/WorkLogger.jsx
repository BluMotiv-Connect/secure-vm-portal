import React, { useState } from 'react'
import { useWorkLogs } from '@hooks/useWorkLogs'
import { useConnections } from '@hooks/useConnections'
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/Card'
import Button from '@components/ui/Button'
import Input from '@components/ui/Input'
import Select from '@components/ui/Select'
import TaskForm from './TaskForm'
import { ArrowLeft, Play, Monitor, Clock } from 'lucide-react'

const WorkLogger = ({ vm, onWorkStart, onBack }) => {
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskData, setTaskData] = useState({
    taskTitle: '',
    taskDescription: '',
    workType: 'work',
    isBillable: true
  })

  const { startWorkSession, isStarting } = useWorkLogs()
  const { initiateConnection, isInitiating } = useConnections()

  const handleTaskSubmit = async (formData) => {
    try {
      // First initiate VM connection
      const connectionResult = await initiateConnection(vm.id)
      
      if (connectionResult.success) {
        // Then start work session
        await startWorkSession({
          vmId: vm.id,
          sessionId: connectionResult.session.sessionId,
          ...formData
        })
        
        onWorkStart()
      }
    } catch (error) {
      console.error('Failed to start work session:', error)
    }
  }

  if (showTaskForm) {
    return (
      <TaskForm
        vm={vm}
        onSubmit={handleTaskSubmit}
        onBack={() => setShowTaskForm(false)}
        isSubmitting={isStarting || isInitiating}
      />
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Start Work Session</CardTitle>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Selected VM Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
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
        </div>

        {/* Session Information */}
        <div className="space-y-4 mb-6">
          <h4 className="font-medium text-gray-900">What happens next:</h4>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-600 text-sm font-medium">1</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Secure Connection</p>
                <p className="text-sm text-gray-600">
                  A secure connection to the VM will be established through our Bastion host
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-600 text-sm font-medium">2</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Connection File Download</p>
                <p className="text-sm text-gray-600">
                  You'll receive a connection file with embedded credentials
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-600 text-sm font-medium">3</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Work Session Tracking</p>
                <p className="text-sm text-gray-600">
                  Your work time will be automatically tracked for reporting
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-green-900">Secure & Compliant</h4>
              <p className="text-sm text-green-700 mt-1">
                All connections are encrypted and audited. No credentials are exposed to users. 
                Session data is logged for compliance and security purposes.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={() => setShowTaskForm(true)}
            className="px-8"
          >
            <Play className="h-5 w-5 mr-2" />
            Start Work Session
          </Button>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            By starting a work session, you agree to our usage policies and 
            acknowledge that your activity will be monitored for security purposes.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default WorkLogger
