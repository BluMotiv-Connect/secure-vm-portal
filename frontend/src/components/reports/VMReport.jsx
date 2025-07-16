import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/Card'
import DataTable from '@components/tables/DataTable'
import Badge from '@components/ui/Badge'
import LoadingSpinner from '@components/common/LoadingSpinner'
import VMUsageChart from '@components/charts/VMUsageChart'
import { Monitor, Activity, Users, TrendingUp } from 'lucide-react'

const VMReport = ({ reportData, loading, onExport }) => {
  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
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

  const getUtilizationColor = (percentage) => {
    if (percentage >= 80) return 'success'
    if (percentage >= 50) return 'warning'
    return 'error'
  }

  const columns = [
    {
      key: 'vmName',
      title: 'Virtual Machine',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center space-x-2">
          <Monitor className="h-4 w-4 text-gray-400" />
          <div>
            <p className="font-medium">{value}</p>
            <p className="text-sm text-gray-500">{row.ipAddress}</p>
          </div>
        </div>
      )
    },
    {
      key: 'osType',
      title: 'OS Type',
      sortable: true,
      render: (value) => (
        <Badge variant="secondary">
          {value}
        </Badge>
      )
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (value) => (
        <Badge variant={getStatusColor(value)}>
          {value}
        </Badge>
      )
    },
    {
      key: 'uniqueUsers',
      title: 'Users',
      align: 'center',
      sortable: true,
      render: (value) => (
        <div className="flex items-center justify-center space-x-1">
          <Users className="h-4 w-4 text-gray-400" />
          <span>{value}</span>
        </div>
      )
    },
    {
      key: 'totalSessions',
      title: 'Sessions',
      align: 'center',
      sortable: true
    },
    {
      key: 'totalUsageMinutes',
      title: 'Usage Time',
      sortable: true,
      render: (value) => (
        <span className="font-medium text-primary-600">
          {formatDuration(value)}
        </span>
      )
    },
    {
      key: 'avgSessionMinutes',
      title: 'Avg Session',
      sortable: true,
      render: (value) => formatDuration(Math.round(value))
    },
    {
      key: 'activeDays',
      title: 'Active Days',
      align: 'center',
      sortable: true
    },
    {
      key: 'workSessionPercentage',
      title: 'Work %',
      sortable: true,
      render: (value) => (
        <Badge variant={getUtilizationColor(value)}>
          {Math.round(value)}%
        </Badge>
      )
    }
  ]

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Generating VM usage report...</p>
        </CardContent>
      </Card>
    )
  }

  if (!reportData || !reportData.data || reportData.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Monitor className="h-5 w-5 mr-2" />
            VM Usage Report
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12">
          <Monitor className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No VM Data Found
          </h3>
          <p className="text-gray-600">
            No virtual machine usage data found for the selected criteria.
          </p>
        </CardContent>
      </Card>
    )
  }

  const { data } = reportData

  // Calculate summary statistics
  const totalVMs = data.length
  const activeVMs = data.filter(vm => vm.status === 'online').length
  const totalUsage = data.reduce((sum, vm) => sum + vm.totalUsageMinutes, 0)
  const mostUsedVM = data.reduce((max, vm) => 
    vm.totalUsageMinutes > max.totalUsageMinutes ? vm : max, data[0])

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total VMs</p>
                <p className="text-2xl font-bold text-gray-900">{totalVMs}</p>
              </div>
              <Monitor className="h-8 w-8 text-primary-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Online VMs</p>
                <p className="text-2xl font-bold text-gray-900">{activeVMs}</p>
                <p className="text-xs text-gray-500">
                  {Math.round((activeVMs / totalVMs) * 100)}% online
                </p>
              </div>
              <Activity className="h-8 w-8 text-success-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Usage</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatDuration(totalUsage)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Most Used</p>
                <p className="text-lg font-bold text-gray-900 truncate">
                  {mostUsedVM?.vmName || 'N/A'}
                </p>
              </div>
              <Monitor className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* VM Usage Chart */}
      <VMUsageChart 
        data={data.slice(0, 10)} // Top 10 VMs
        title="Top VM Usage"
        type="bar"
      />

      {/* VM Usage Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Monitor className="h-5 w-5 mr-2" />
              VM Usage Details
            </CardTitle>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                {data.length} VMs
              </span>
              {onExport && (
                <button
                  onClick={() => onExport('vmUsage', 'excel')}
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
            emptyMessage="No VM data found"
            emptyDescription="No virtual machines match the selected criteria"
          />
        </CardContent>
      </Card>

      {/* VM Insights */}
      <Card>
        <CardHeader>
          <CardTitle>VM Utilization Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-success-600 mb-2">
                {data.filter(vm => vm.workSessionPercentage >= 80).length}
              </div>
              <p className="text-sm text-gray-600">High Utilization</p>
              <p className="text-xs text-gray-500">(≥80% work sessions)</p>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-warning-600 mb-2">
                {data.filter(vm => vm.workSessionPercentage >= 50 && vm.workSessionPercentage < 80).length}
              </div>
              <p className="text-sm text-gray-600">Medium Utilization</p>
              <p className="text-xs text-gray-500">(50-79% work sessions)</p>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-error-600 mb-2">
                {data.filter(vm => vm.workSessionPercentage < 50).length}
              </div>
              <p className="text-sm text-gray-600">Low Utilization</p>
              <p className="text-xs text-gray-500">(<50% work sessions)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default VMReport
