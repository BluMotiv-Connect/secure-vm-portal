import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/Card'
import Badge from '@components/ui/Badge'
import Pagination from '@components/ui/Pagination'
import LoadingSpinner from '@components/common/LoadingSpinner'
import { Clock, Monitor, Edit, Calendar } from 'lucide-react'

const WorkLogHistory = ({ workLogs, pagination, loading, onPageChange }) => {
  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const getWorkTypeColor = (workType) => {
    switch (workType) {
      case 'work': return 'success'
      case 'break': return 'warning'
      case 'meeting': return 'primary'
      case 'training': return 'secondary'
      default: return 'secondary'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading work logs...</p>
        </CardContent>
      </Card>
    )
  }

  if (!workLogs || workLogs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Work Log History
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12">
          <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Work Logs Found
          </h3>
          <p className="text-gray-600 mb-6">
            No work sessions found for the selected period. Start working to see your logs here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Work Log History
          </div>
          <span className="text-sm font-normal text-gray-500">
            {pagination?.total || 0} total sessions
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {workLogs.map((log) => (
            <div
              key={log.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="font-semibold text-gray-900">{log.taskTitle}</h4>
                    <Badge variant={getWorkTypeColor(log.workType)}>
                      {log.workType}
                    </Badge>
                    {log.isBillable && (
                      <Badge variant="primary" size="sm">
                        Billable
                      </Badge>
                    )}
                  </div>

                  {log.taskDescription && (
                    <p className="text-gray-600 mb-3 line-clamp-2">
                      {log.taskDescription}
                    </p>
                  )}

                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Monitor className="h-4 w-4" />
                      <span>{log.vmName}</span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(log.startTime)}</span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>
                        {formatTime(log.startTime)} - {log.endTime ? formatTime(log.endTime) : 'Active'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">
                    {log.durationMinutes ? formatDuration(log.durationMinutes) : 'Active'}
                  </div>
                  {!log.endTime && (
                    <Badge variant="success" className="animate-pulse">
                      In Progress
                    </Badge>
                  )}
                </div>
              </div>

              {/* Session Details */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-500">
                  <div>
                    <span className="font-medium">Session ID:</span>
                    <p className="font-mono">{log.sessionId?.slice(-8) || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium">VM IP:</span>
                    <p className="font-mono">{log.vmIpAddress}</p>
                  </div>
                  <div>
                    <span className="font-medium">Started:</span>
                    <p>{formatTime(log.startTime)}</p>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <p className={log.endTime ? 'text-gray-600' : 'text-success-600'}>
                      {log.endTime ? 'Completed' : 'Active'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={onPageChange}
              showInfo={true}
              totalItems={pagination.total}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default WorkLogHistory
