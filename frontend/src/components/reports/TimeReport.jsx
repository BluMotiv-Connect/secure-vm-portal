import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/Card'
import DataTable from '@components/tables/DataTable'
import Badge from '@components/ui/Badge'
import LoadingSpinner from '@components/common/LoadingSpinner'
import { Clock, Calendar, Monitor, User } from 'lucide-react'

const TimeReport = ({ reportData, loading, onExport }) => {
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

  const columns = [
    {
      key: 'userName',
      title: 'User',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center space-x-2">
          <User className="h-4 w-4 text-gray-400" />
          <span className="font-medium">{value}</span>
        </div>
      )
    },
    {
      key: 'vmName',
      title: 'Virtual Machine',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center space-x-2">
          <Monitor className="h-4 w-4 text-gray-400" />
          <div>
            <p className="font-medium">{value}</p>
            <p className="text-sm text-gray-500">{row.vmIpAddress}</p>
          </div>
        </div>
      )
    },
    {
      key: 'workDate',
      title: 'Date',
      sortable: true,
      render: (value) => (
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span>{formatDate(value)}</span>
        </div>
      )
    },
    {
      key: 'workType',
      title: 'Type',
      sortable: true,
      render: (value) => (
        <Badge variant={getWorkTypeColor(value)}>
          {value}
        </Badge>
      )
    },
    {
      key: 'sessionCount',
      title: 'Sessions',
      align: 'center',
      sortable: true
    },
    {
      key: 'totalMinutes',
      title: 'Total Time',
      sortable: true,
      render: (value) => (
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-gray-400" />
          <span className="font-medium">{formatDuration(value)}</span>
        </div>
      )
    },
    {
      key: 'avgSessionMinutes',
      title: 'Avg Session',
      sortable: true,
      render: (value) => formatDuration(Math.round(value))
    },
    {
      key: 'billableMinutes',
      title: 'Billable',
      sortable: true,
      render: (value, row) => (
        <div>
          <span className="font-medium text-success-600">
            {formatDuration(value)}
          </span>
          {row.totalMinutes > 0 && (
            <p className="text-xs text-gray-500">
              {Math.round((value / row.totalMinutes) * 100)}%
            </p>
          )}
        </div>
      )
    }
  ]

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Generating time report...</p>
        </CardContent>
      </Card>
    )
  }

  if (!reportData || !reportData.data || reportData.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Time Report
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12">
          <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Time Data Found
          </h3>
          <p className="text-gray-600">
            No time entries found for the selected criteria. 
            Try adjusting your filters or date range.
          </p>
        </CardContent>
      </Card>
    )
  }

  const { data, summary, filters } = reportData

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {summary.totalSessions || 0}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-primary-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Time</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatDuration(summary.totalMinutes || 0)}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-success-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Billable Time</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatDuration(summary.totalBillableMinutes || 0)}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Session</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatDuration(summary.avgSessionMinutes || 0)}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Time Report Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Time Report Details
            </CardTitle>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                {data.length} entries
              </span>
              {onExport && (
                <button
                  onClick={() => onExport('time', 'excel')}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  Export Excel
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={data}
            loading={loading}
            emptyMessage="No time entries found"
            emptyDescription="No work sessions match the selected criteria"
          />
        </CardContent>
      </Card>

      {/* Report Filters Info */}
      {filters && (
        <Card>
          <CardHeader>
            <CardTitle>Report Criteria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Period:</span>
                <p className="text-gray-600">
                  {formatDate(filters.startDate)} - {formatDate(filters.endDate)}
                </p>
              </div>
              {filters.userIds && filters.userIds.length > 0 && (
                <div>
                  <span className="font-medium text-gray-700">Users:</span>
                  <p className="text-gray-600">{filters.userIds.length} selected</p>
                </div>
              )}
              {filters.vmIds && filters.vmIds.length > 0 && (
                <div>
                  <span className="font-medium text-gray-700">VMs:</span>
                  <p className="text-gray-600">{filters.vmIds.length} selected</p>
                </div>
              )}
              {filters.workTypes && filters.workTypes.length > 0 && (
                <div>
                  <span className="font-medium text-gray-700">Work Types:</span>
                  <p className="text-gray-600">{filters.workTypes.join(', ')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default TimeReport
