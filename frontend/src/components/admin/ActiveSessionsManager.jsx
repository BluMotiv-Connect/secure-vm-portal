import React, { useState, useEffect } from 'react'
import { apiClient } from '../../services/apiClient'
import { Monitor, User, Clock, AlertTriangle, X, RefreshCw, Power } from 'lucide-react'

const ActiveSessionsManager = () => {
  const [activeSessions, setActiveSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [endingSession, setEndingSession] = useState(null)

  useEffect(() => {
    fetchActiveSessions()
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchActiveSessions, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchActiveSessions = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true)
      const response = await apiClient.get('/work-sessions/admin/active')
      setActiveSessions(response.data.sessions || [])
      setError(null)
    } catch (err) {
      console.error('Failed to fetch active sessions:', err)
      setError('Failed to load active sessions')
    } finally {
      setLoading(false)
      if (showRefreshing) setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchActiveSessions(true)
  }

  const formatDuration = (minutes) => {
    if (!minutes) return '0m'
    const hours = Math.floor(minutes / 60)
    const mins = Math.floor(minutes % 60)
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString()
  }

  const handleEndSession = async (sessionId, userName) => {
    if (!confirm(`Are you sure you want to end ${userName}'s active session?`)) {
      return
    }

    try {
      setEndingSession(sessionId)
      await apiClient.post(`/work-sessions/admin/force-end/${sessionId}`)
      
      // Remove the session from the list
      setActiveSessions(prev => prev.filter(session => session.id !== sessionId))
      
      // Show success message
      alert('Session ended successfully')
    } catch (err) {
      console.error('Failed to end session:', err)
      alert('Failed to end session. Please try again.')
    } finally {
      setEndingSession(null)
    }
  }

  const handleBulkEndSessions = async () => {
    if (activeSessions.length === 0) return
    
    if (!confirm(`Are you sure you want to end ALL ${activeSessions.length} active sessions?`)) {
      return
    }

    try {
      setLoading(true)
      const sessionIds = activeSessions.map(session => session.id)
      await apiClient.post('/work-sessions/admin/bulk-end', { sessionIds })
      
      // Clear all sessions
      setActiveSessions([])
      alert(`Successfully ended ${sessionIds.length} sessions`)
    } catch (err) {
      console.error('Failed to bulk end sessions:', err)
      alert('Failed to end sessions. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCleanupStale = async () => {
    if (!confirm('This will clean up stale sessions that have been active for over 1 hour. Continue?')) {
      return
    }

    try {
      setLoading(true)
      const response = await apiClient.post('/work-sessions/cleanup-stale-sessions')
      
      // Refresh the active sessions list
      await fetchActiveSessions()
      
      alert(`Successfully cleaned up ${response.data.sessions?.length || 0} stale sessions`)
    } catch (err) {
      console.error('Failed to cleanup stale sessions:', err)
      alert('Failed to cleanup stale sessions. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDebugSessions = async () => {
    try {
      // Try the simple debug endpoint first
      const response = await apiClient.get('/work-sessions/debug/simple-sessions')
      console.log('Simple Debug Sessions Response:', response.data)
      
      const { activeSessions: activeCount, sessions } = response.data
      
      alert(`Simple Debug Info:
Active Sessions Found: ${activeCount}
Check console for session details.`)
      
      if (activeCount > 0) {
        console.log('Active Sessions Details:', sessions)
        alert(`Found ${activeCount} active sessions! These might be blocking project/task deletion. Use "Cleanup Stale" to remove them.`)
      }
    } catch (err) {
      console.error('Failed to debug sessions:', err)
      alert('Failed to debug sessions. Please try again.')
    }
  }

  const handleForceCleanupAll = async () => {
    if (!confirm('⚠️ WARNING: This will force end ALL active sessions in the system. This should only be used to fix database inconsistencies. Continue?')) {
      return
    }

    try {
      setLoading(true)
      const response = await apiClient.post('/work-sessions/cleanup-all-active')
      
      // Refresh the active sessions list
      await fetchActiveSessions()
      
      alert(`Force cleanup completed! Ended ${response.data.sessions?.length || 0} active sessions.`)
    } catch (err) {
      console.error('Failed to force cleanup all sessions:', err)
      alert('Failed to force cleanup all sessions. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDebugProject = async () => {
    const projectId = prompt('Enter Project ID to debug dependencies:')
    if (!projectId) return

    try {
      const response = await apiClient.get(`/work-sessions/debug/project-dependencies/${projectId}`)
      console.log('Project Dependencies Debug:', response.data)
      
      const { dependencies, totalDependencies } = response.data
      
      alert(`Project ${projectId} Dependencies:
Work Sessions: ${dependencies.workSessions}
Project Assignments: ${dependencies.projectAssignments}
Tasks: ${dependencies.tasks}
Temp Connections: ${dependencies.tempConnections}
Total Dependencies: ${totalDependencies}

Check console for detailed information.`)
      
      if (totalDependencies > 0) {
        if (confirm(`Found ${totalDependencies} dependencies blocking deletion. Clean them up?`)) {
          await handleCleanupProject(projectId)
        }
      }
    } catch (err) {
      console.error('Failed to debug project dependencies:', err)
      alert('Failed to debug project dependencies. Please try again.')
    }
  }

  const handleCleanupProject = async (projectId) => {
    if (!projectId) {
      projectId = prompt('Enter Project ID to cleanup dependencies:')
      if (!projectId) return
    }

    if (!confirm(`⚠️ WARNING: This will delete ALL dependencies for project ${projectId} including work sessions, assignments, and temp connections. This cannot be undone. Continue?`)) {
      return
    }

    try {
      setLoading(true)
      const response = await apiClient.post(`/work-sessions/cleanup-project-dependencies/${projectId}`)
      
      console.log('Project Cleanup Results:', response.data)
      
      const { cleanupResults } = response.data
      const summary = cleanupResults.map(r => `${r.table}: ${r.count}`).join('\n')
      
      alert(`Project ${projectId} cleanup completed!

${summary}

You should now be able to delete the project.`)
      
    } catch (err) {
      console.error('Failed to cleanup project dependencies:', err)
      alert('Failed to cleanup project dependencies. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !refreshing) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-2" />
        <span>Loading active sessions...</span>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Monitor className="h-6 w-6 text-blue-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">
              Active VM Sessions ({activeSessions.length})
            </h3>
          </div>
          
          {/* Organized Button Groups */}
          <div className="flex items-center space-x-3">
            {/* Primary Actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                title="Refresh session list"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              
              {activeSessions.length > 0 && (
                <button
                  onClick={handleBulkEndSessions}
                  className="flex items-center px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  title="End all active sessions"
                >
                  <Power className="h-4 w-4 mr-1" />
                  End All
                </button>
              )}
            </div>

            {/* Maintenance Actions */}
            <div className="flex items-center space-x-2 border-l border-gray-300 pl-3">
              <button
                onClick={handleCleanupStale}
                className="flex items-center px-3 py-2 text-sm bg-orange-600 text-white rounded hover:bg-orange-700"
                title="Clean up stale sessions (1+ hours old)"
              >
                <Power className="h-4 w-4 mr-1" />
                Cleanup Stale
              </button>
              
              <button
                onClick={handleDebugSessions}
                className="flex items-center px-3 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                title="Debug session issues"
              >
                <AlertTriangle className="h-4 w-4 mr-1" />
                Debug
              </button>
            </div>

            {/* Advanced Actions Dropdown */}
            <div className="relative border-l border-gray-300 pl-3">
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleForceCleanupAll}
                  className="flex items-center px-3 py-2 text-sm bg-red-800 text-white rounded hover:bg-red-900"
                  title="⚠️ Emergency: Force end ALL sessions"
                >
                  <Power className="h-4 w-4 mr-1" />
                  Force All
                </button>
                
                <div className="flex items-center space-x-1">
                  <button
                    onClick={handleDebugProject}
                    className="flex items-center px-2 py-2 text-sm bg-purple-600 text-white rounded-l hover:bg-purple-700"
                    title="Debug project dependencies"
                  >
                    <AlertTriangle className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleCleanupProject()}
                    className="flex items-center px-2 py-2 text-sm bg-purple-800 text-white rounded-r hover:bg-purple-900"
                    title="Cleanup project dependencies"
                  >
                    <Power className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="px-6 py-4 bg-red-50 border-l-4 border-red-400">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        {activeSessions.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            <Monitor className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No active VM sessions</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  VM / Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Task
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Started
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activeSessions.map((session) => (
                <tr key={session.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {session.user_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {session.user_email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {session.vm_name || 'Personal Work'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {session.project_name}
                      </div>
                      {session.vm_ip && (
                        <div className="text-xs text-gray-400">
                          {session.vm_ip} • {session.os_type} • {session.cloud_provider}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {session.task_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-sm text-gray-900">
                        {formatTime(session.start_time)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      session.duration_minutes_current > 480 // 8 hours
                        ? 'bg-red-100 text-red-800'
                        : session.duration_minutes_current > 240 // 4 hours
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {formatDuration(session.duration_minutes_current)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEndSession(session.id, session.user_name)}
                      disabled={endingSession === session.id}
                      className="flex items-center px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      {endingSession === session.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <X className="h-4 w-4 mr-1" />
                          End Session
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {activeSessions.length > 0 && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              {activeSessions.length} active session{activeSessions.length !== 1 ? 's' : ''}
            </span>
            <span>
              Auto-refreshes every 30 seconds
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default ActiveSessionsManager