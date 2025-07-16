import { useState, useEffect } from 'react'
import { useQuery } from 'react-query'
import { connectionService } from '@services/connectionService'

export const useSessions = () => {
  const [sessions, setSessions] = useState([])
  const [monitoringInterval, setMonitoringInterval] = useState(null)

  // Monitor active sessions
  const startMonitoring = (sessionIds) => {
    if (monitoringInterval) {
      clearInterval(monitoringInterval)
    }

    const interval = setInterval(async () => {
      const updatedSessions = []
      
      for (const sessionId of sessionIds) {
        try {
          const result = await connectionService.monitorSession(sessionId)
          updatedSessions.push(result)
        } catch (error) {
          console.error(`Failed to monitor session ${sessionId}:`, error)
        }
      }
      
      setSessions(updatedSessions)
    }, 30000) // Monitor every 30 seconds

    setMonitoringInterval(interval)
  }

  const stopMonitoring = () => {
    if (monitoringInterval) {
      clearInterval(monitoringInterval)
      setMonitoringInterval(null)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring()
    }
  }, [])

  return {
    sessions,
    startMonitoring,
    stopMonitoring,
    isMonitoring: !!monitoringInterval
  }
}
