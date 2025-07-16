import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/Card'
import DataTable from '@components/tables/DataTable'
import Badge from '@components/ui/Badge'
import LoadingSpinner from '@components/common/LoadingSpinner'
import UserActivityChart from '@components/charts/UserActivityChart'
import { User, TrendingUp, Clock, Target } from 'lucide-react'

const UserReport = ({ reportData, loading, onExport }) => {
  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const getProductivityColor = (percentage) => {
    if (percentage >= 80) return 'success'
    if (percentage >= 60) return 'warning'
    return 'error'
  }

  const columns = [
    {
      key: 'userName',
      title: 'User',
      sortable: true,
      render: (value) => (
        <div className="flex items-center space-x-2">
          <User className="h-4 w-4 text-gray-400" />
          <span className="font-medium">{value}</span>
        </div>
      )
    },
    {
      key: 'activeDays',
      title: 'Active Days',
      align: 'center',
      sortable: true
    },
    {
      key: 'totalWorkMinutes',
      title: 'Work Time',
      sortable: true,
      render: (value) => (
        <span className="font-medium text-success-600">
          {formatDuration(value)}
        </span>
      )
    },
    {
      key: 'totalBreakMinutes',
      title: 'Break Time',
      sortable: true,
      render: (value) => (
        <span className="text-warning-600">
          {formatDuration(value)}
        </span>
      )
    },
    {
      key: 'totalMeetingMinutes',
      title: 'Meeting Time',
      sortable: true,
      render: (value) => (
        <span className="text-blue-600">
          {formatDuration(value)}
        </span>
      )
    },
    {
      key: 'avgDailyWork',
      title: 'Daily Avg',
      sortable: true,
      render: (value) => formatDuration(Math.round(value))
    },
    {
      key: 'avgDailySessions',
      title: 'Sessions/Day',
      sortable: true,
      render: (value) => Math.round(value * 10) / 10
    },
    {
      key: 'productivityPercentage',
      title: 'Productivity',
      sortable: true,
      render: (value) => (
        <Badge variant={getProductivityColor(value)}>
          {Math.round(value)}%
        </Badge>
      )
    },
    {
      key: 'avgDayLengthMinutes',
      title: 'Day Length',
      sortable: true,
      render: (value) => formatDuration(Math.round(value))
    }
  ]

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Generating user productivity report...</p>
        </CardContent>
      </Card>
    )
  }

  if (!reportData || !reportData.data || reportData.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            User Productivity Report
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12">
          <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No User Data Found
          </h3>
          <p className="text-gray-600">
            No user productivity data found for the selected criteria.
          </p>
        </CardContent>
      </Card>
    )
  }

  const { data } = reportData

  // Calculate summary statistics
  const totalUsers = data.length
  const avgProductivity = data.reduce((sum, user) => sum + user.productivityPercentage, 0) / totalUsers
  const totalWorkTime = data.reduce((sum, user) => sum + user.totalWorkMinutes, 0)
  const mostActiveUser = data.reduce((max, user) => 
    user.totalWorkMinutes > max.totalWorkMinutes ? user : max, data[0])

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{totalUsers}</p>
              </div>
              <User className="h-8 w-8 text-primary-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Productivity</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(avgProductivity)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-success-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Work Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatDuration(totalWorkTime)}
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
                <p className="text-sm font-medium text-gray-600">Top Performer</p>
                <p className="text-lg font-bold text-gray-900 truncate">
                  {mostActiveUser?.userName || 'N/A'}
                </p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Activity Chart */}
      <UserActivityChart 
        data={data}
        title="User Activity Comparison"
        type="bar"
      />

      {/* User Productivity Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              User Productivity Details
            </CardTitle>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                {data.length} users
              </span>
              {onExport && (
                <button
                  onClick={() => onExport('productivity', 'excel')}
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
            emptyMessage="No user data found"
            emptyDescription="No users match the selected criteria"
          />
        </CardContent>
      </Card>

      {/* Productivity Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Productivity Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-success-600 mb-2">
                {data.filter(user => user.productivityPercentage >= 80).length}
              </div>
              <p className="text-sm text-gray-600">High Performers</p>
              <p className="text-xs text-gray-500">(≥80% productivity)</p>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-warning-600 mb-2">
                {data.filter(user => user.productivityPercentage >= 60 && user.productivityPercentage < 80).length}
              </div>
              <p className="text-sm text-gray-600">Average Performers</p>
              <p className="text-xs text-gray-500">(60-79% productivity)</p>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-error-600 mb-2">
                {data.filter(user => user.productivityPercentage < 60).length}
              </div>
              <p className="text-sm text-gray-600">Needs Improvement</p>
              <p className="text-xs text-gray-500">(<60% productivity)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default UserReport
