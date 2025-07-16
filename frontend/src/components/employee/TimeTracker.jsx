import React, { useState, useEffect } from 'react'
import { useTimer } from '@hooks/useTimer'
import { useWorkLogs } from '@hooks/useWorkLogs'
import Button from '@components/ui/Button'
import Badge from '@components/ui/Badge'
import { Play, Pause, Square, Clock, Edit } from 'lucide-react'

const TimeTracker = ({ workLog, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    taskTitle: workLog?.taskTitle || '',
    taskDescription: workLog?.taskDescription || ''
  })

  const { endWorkSession, updateWorkLog } = useWorkLogs()
  
  // Calculate elapsed time from work log start time
  const getElapsedSeconds = () => {
    if (!workLog?.startTime) return 0
    const start = new Date(workLog.startTime)
    const now = new Date()
    return Math.floor((now - start) / 1000)
  }

  const { 
    time, 
    isRunning, 
    start, 
    pause, 
    formatTime 
  } = useTimer(getElapsedSeconds(), true)

  const handleEndSession = async () => {
    try {
      await endWorkSession({ 
        workLogId: workLog.id, 
        endTime: new Date().toISOString() 
      })
    } catch (error) {
      console.error('Failed to end session:', error)
    }
  }

  const handleUpdateTask = async () => {
    try {
      await updateWorkLog({
        id: workLog.id,
        workData: editData
      })
      setIsEditing(false)
      onUpdate?.()
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }

  const formatDuration = () => {
    const hours = Math.floor(time / 3600)
    const minutes = Math.floor((time % 3600) / 60)
    const seconds = time % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  if (!workLog) {
    return null
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      {/* Timer Display */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-success-100 rounded-lg">
            <Clock className="h-5 w-5 text-success-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 font-mono">
              {formatDuration()}
            </p>
            <p className="text-sm text-gray-500">
              Started {new Date(workLog.startTime).toLocaleTimeString()}
            </p>
          </div>
        </div>
        
        <Badge variant="success" className="animate-pulse">
          <div className="w-2 h-2 bg-success-500 rounded-full mr-2"></div>
          Recording
        </Badge>
      </div>

      {/* Task Information */}
      <div className="mb-4">
        {isEditing ? (
          <div className="space-y-3">
            <input
              type="text"
              value={editData.taskTitle}
              onChange={(e) => setEditData(prev => ({ ...prev, taskTitle: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Task title"
            />
            <textarea
              value={editData.taskDescription}
              onChange={(e) => setEditData(prev => ({ ...prev, taskDescription: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Task description"
              rows={2}
            />
            <div className="flex space-x-2">
              <Button size="sm" onClick={handleUpdateTask}>
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">{workLog.taskTitle}</h4>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(true)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
            {workLog.taskDescription && (
              <p className="text-sm text-gray-600 mt-1">{workLog.taskDescription}</p>
            )}
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
              <span>VM: {workLog.vmName}</span>
              <span>Type: {workLog.workType}</span>
              {workLog.isBillable && (
                <Badge variant="primary" size="sm">Billable</Badge>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          {isRunning ? (
            <Button size="sm" variant="outline" onClick={pause}>
              <Pause className="h-4 w-4 mr-1" />
              Pause
            </Button>
          ) : (
            <Button size="sm" onClick={start}>
              <Play className="h-4 w-4 mr-1" />
              Resume
            </Button>
          )}
        </div>
        
        <Button 
          size="sm" 
          variant="danger"
          onClick={handleEndSession}
        >
          <Square className="h-4 w-4 mr-1" />
          End Session
        </Button>
      </div>
    </div>
  )
}

export default TimeTracker
