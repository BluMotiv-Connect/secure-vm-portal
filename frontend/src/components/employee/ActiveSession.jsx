import React, { useState, useEffect } from 'react'
import { apiClient } from '../../services/apiClient'
import { StopCircle, Clock, Monitor, Laptop, Globe, X } from 'lucide-react'

const ActiveSession = ({ session, onEnd }) => {
  const [elapsedTime, setElapsedTime] = useState(0)
  const [ending, setEnding] = useState(false)

  useEffect(() => {
    if (!session) return

    const startTime = new Date(session.start_time)
    
    const timer = setInterval(() => {
      const now = new Date()
      const elapsed = Math.floor((now - startTime) / 1000)
      setElapsedTime(elapsed)
    }, 1000)

    return () => clearInterval(timer)
  }, [session])

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleEndSession = async () => {
    try {
      setEnding(true)
      await apiClient.post('/work-sessions/end-session')
      
      if (session.session_type === 'vm') {
        alert('VM session ended. Please close your RDP connection.')
      } else {
        alert('Work session ended successfully.')
      }
      
      onEnd()
    } catch (error) {
      console.error('End session error:', error)
      alert('Failed to end session. Please try again.')
    } finally {
      setEnding(false)
    }
  }

  const getSessionIcon = () => {
    switch (session.session_type) {
      case 'vm':
        return <Monitor className="h-5 w-5 text-blue-600" />
      case 'm365':
        return <Globe className="h-5 w-5 text-blue-600" />
      default:
        return <Laptop className="h-5 w-5 text-green-600" />
    }
  }

  const getSessionTypeText = () => {
    switch (session.session_type) {
      case 'vm':
        return `VM: ${session.vm_name || 'Virtual Machine'}`
      case 'm365':
        return 'Microsoft 365 Apps'
      default:
        return 'Personal Computer'
    }
  }

  if (!session) return null

  return (
    <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {getSessionIcon()}
            <div>
              <h3 className="font-semibold text-lg">Active Work Session</h3>
              <p className="text-green-100">{getSessionTypeText()}</p>
            </div>
          </div>
          
          <div className="border-l border-green-300 pl-4">
            <div className="text-sm text-green-100">Working on</div>
            <div className="font-medium">{session.task_name}</div>
            <div className="text-sm text-green-100">Project: {session.project_name}</div>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="text-center">
            <div className="flex items-center space-x-2 text-2xl font-mono font-bold">
              <Clock className="h-6 w-6" />
              <span>{formatTime(elapsedTime)}</span>
            </div>
            <div className="text-sm text-green-100">Elapsed Time</div>
          </div>

          <button
            onClick={handleEndSession}
            disabled={ending}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-colors disabled:opacity-50"
          >
            {ending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Ending...</span>
              </>
            ) : (
              <>
                <StopCircle className="h-5 w-5" />
                <span>End Session</span>
              </>
            )}
          </button>
        </div>
      </div>

      {session.reason && (
        <div className="mt-4 p-3 bg-black bg-opacity-20 rounded">
          <div className="text-sm text-green-100">Reason:</div>
          <div className="text-white">{session.reason}</div>
        </div>
      )}
    </div>
  )
}

export default ActiveSession
