import React from 'react'
import { useTimer } from '@hooks/useTimer'
import { Clock, Play, Pause, Square } from 'lucide-react'

const TimerWidget = ({ 
  workLog, 
  onStart, 
  onPause, 
  onStop, 
  showControls = true,
  size = 'md' 
}) => {
  const getElapsedSeconds = () => {
    if (!workLog?.startTime) return 0
    const start = new Date(workLog.startTime)
    const now = new Date()
    return Math.floor((now - start) / 1000)
  }

  const { 
    time, 
    isRunning, 
    formatTime 
  } = useTimer(getElapsedSeconds(), !!workLog && !workLog.endTime)

  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl'
  }

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  if (!workLog) {
    return (
      <div className="flex items-center space-x-2 text-gray-500">
        <Clock className={iconSizes[size]} />
        <span className={`font-mono ${sizeClasses[size]}`}>00:00</span>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-2">
        <Clock className={`${iconSizes[size]} ${isRunning ? 'text-success-600' : 'text-gray-500'}`} />
        <span className={`font-mono font-bold ${sizeClasses[size]} ${isRunning ? 'text-gray-900' : 'text-gray-600'}`}>
          {formatTime()}
        </span>
      </div>

      {showControls && (
        <div className="flex items-center space-x-1">
          {isRunning ? (
            <button
              onClick={onPause}
              className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
              title="Pause timer"
            >
              <Pause className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={onStart}
              className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
              title="Start timer"
            >
              <Play className="h-4 w-4" />
            </button>
          )}
          
          <button
            onClick={onStop}
            className="p-1 text-red-500 hover:text-red-700 transition-colors"
            title="Stop timer"
          >
            <Square className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}

export default TimerWidget
