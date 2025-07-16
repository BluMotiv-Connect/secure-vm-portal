import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/Card'
import Badge from '@components/ui/Badge'
import WorkTimeChart from '@components/charts/WorkTimeChart'
import ProductivityChart from '@components/charts/ProductivityChart'
import { 
  Users, 
  Monitor, 
  Clock, 
  TrendingUp, 
  Activity,
  Calendar,
  Target,
  Award
} from 'lucide-react'

const SummaryReport = ({ reportData, loading }) => {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Generating summary report...</p>
        </CardContent>
      </Card>
    )
  }

  if (!reportData) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-gray-500">No report data available</p>
        </CardContent>
      </Card>
    )
  }

  const { overallStats, dailyTrends, topUsers, topVMs, workTypeDistribution } = reportData

  return (
    <div className="space-y-6">
      {/* Executive Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {overallStats?.activeUsers || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {overallStats?.activeDays || 0} active days
                </p>
              </div>
              <Users className="h-8 w-8 text-primary-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {overallStats?.totalSessions || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {Math.round((overallStats?.avgSessionMinutes || 0))} min avg
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
                <p className="text-sm font-medium text-gray-600">Total Hours</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round((overallStats?.totalMinutes || 0) / 60)}h
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {overallStats?.billableSessions || 0} billable
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
                <p className="text-sm font-medium text-gray-600">VMs Used</p>
                <p className="text-2xl font-bold text-gray-900">
                  {overallStats?.usedVMs || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Virtual machines
                </p>
              </div>
              <Monitor className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trends */}
        {dailyTrends && dailyTrends.length > 0 && (
          <WorkTimeChart 
            data={dailyTrends}
            title="Daily Activity Trends"
            type="line"
          />
        )}

        {/* Work Type Distribution */}
        {workTypeDistribution && workTypeDistribution.length > 0 && (
          <ProductivityChart 
            data={workTypeDistribution.reduce((acc, item) => {
              acc[item.workType] = item.totalMinutes
              return acc
            }, {})}
            type="pie"
            title="Work Type Distribution"
          />
        )}
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="h-5 w-5 mr-2" />
              Top Users by Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topUsers && topUsers.length > 0 ? (
              <div className="space-y-3">
                {topUsers.slice(0, 5).map((user, index) => (
                  <div key={user.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-orange-600' : 'bg-gray-300'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.userName}</p>
                        <p className="text-sm text-gray-500">{user.sessions} sessions</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">
                        {Math.round(user.totalMinutes / 60)}h
                      </p>
                      <p className="text-sm text-gray-500">
                        {user.totalMinutes % 60}m
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No user data available</p>
            )}
          </CardContent>
        </Card>

        {/* Top VMs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Most Used VMs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topVMs && topVMs.length > 0 ? (
              <div className="space-y-3">
                {topVMs.slice(0, 5).map((vm, index) => (
                  <div key={vm.vmId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? 'bg-blue-500' :
                        index === 1 ? 'bg-green-500' :
                        index === 2 ? 'bg-purple-500' : 'bg-gray-400'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{vm.vmName}</p>
                        <p className="text-sm text-gray-500">{vm.sessions} sessions</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">
                        {Math.round(vm.totalMinutes / 60)}h
                      </p>
                      <p className="text-sm text-gray-500">
                        {vm.totalMinutes % 60}m
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No VM data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Key Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Key Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600 mb-2">
                {overallStats?.activeUsers || 0}
              </div>
              <p className="text-sm text-gray-600">Active Users</p>
              <Badge variant="success" className="mt-2">
                {overallStats?.activeDays || 0} days active
              </Badge>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-success-600 mb-2">
                {Math.round(((overallStats?.workSessions || 0) / (overallStats?.totalSessions || 1)) * 100)}%
              </div>
              <p className="text-sm text-gray-600">Work Efficiency</p>
              <Badge variant="primary" className="mt-2">
                {overallStats?.workSessions || 0} work sessions
              </Badge>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {Math.round((overallStats?.avgSessionMinutes || 0))}m
              </div>
              <p className="text-sm text-gray-600">Avg Session</p>
              <Badge variant="secondary" className="mt-2">
                Per session duration
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SummaryReport
