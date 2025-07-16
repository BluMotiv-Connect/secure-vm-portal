import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/Card'
import Badge from '@components/ui/Badge'
import { Clock, Target, TrendingUp, Calendar } from 'lucide-react'

const WorkSummary = ({ summary, period = 'today' }) => {
  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const getEfficiencyColor = (percentage) => {
    if (percentage >= 80) return 'success'
    if (percentage >= 60) return 'warning'
    return 'error'
  }

  const periodLabels = {
    today: "Today's Summary",
    week: "This Week's Summary",
    month: "This Month's Summary"
  }

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            {periodLabels[period]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-4">No work data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calendar className="h-5 w-5 mr-2" />
          {periodLabels[period]}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Time */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Clock className="h-5 w-5 text-primary-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatDuration(summary.totalWorkMinutes || 0)}
            </p>
            <p className="text-sm text-gray-500">Total Time</p>
          </div>

          {/* Sessions */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Target className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {summary.totalSessions || 0}
            </p>
            <p className="text-sm text-gray-500">Sessions</p>
          </div>

          {/* Efficiency */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-5 w-5 text-success-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {Math.round(summary.workEfficiency || 0)}%
            </p>
            <p className="text-sm text-gray-500">Efficiency</p>
          </div>

          {/* Avg Session */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatDuration(summary.avgSessionDuration || 0)}
            </p>
            <p className="text-sm text-gray-500">Avg Session</p>
          </div>
        </div>

        {/* Detailed Breakdown */}
        {summary.workTypeBreakdown && summary.workTypeBreakdown.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">Work Breakdown</h4>
            <div className="space-y-2">
              {summary.workTypeBreakdown.map((item) => (
                <div key={item.workType} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" size="sm">
                      {item.workType}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {item.sessionCount} sessions
                    </span>
                  </div>
                  <span className="font-medium text-gray-900">
                    {formatDuration(item.totalMinutes)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Efficiency Badge */}
        <div className="mt-4 flex justify-center">
          <Badge 
            variant={getEfficiencyColor(summary.workEfficiency || 0)}
            className="px-3 py-1"
          >
            {summary.workEfficiency >= 80 ? 'Excellent' : 
             summary.workEfficiency >= 60 ? 'Good' : 'Needs Improvement'} Efficiency
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

export default WorkSummary
