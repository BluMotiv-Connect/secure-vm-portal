import React from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Users, 
  Target,
  Calendar,
  RefreshCw,
  Award
} from 'lucide-react'

const ProjectStats = ({ stats, onRefresh }) => {
  const formatHours = (minutes) => {
    if (!minutes) return '0h'
    const hours = Math.round(minutes / 60)
    return `${hours}h`
  }

  const getCompletionRate = () => {
    if (!stats.total_projects || stats.total_projects === 0) return 0
    return Math.round((stats.completed_projects / stats.total_projects) * 100)
  }

  const getAverageProjectDuration = () => {
    if (!stats.avg_project_duration_days) return 'N/A'
    const days = Math.round(stats.avg_project_duration_days)
    if (days < 30) return `${days} days`
    if (days < 365) return `${Math.round(days / 30)} months`
    return `${Math.round(days / 365)} years`
  }

  const projectStatusData = [
    { 
      label: 'Active', 
      value: stats.active_projects || 0, 
      color: 'bg-green-500',
      percentage: stats.total_projects ? Math.round((stats.active_projects / stats.total_projects) * 100) : 0
    },
    { 
      label: 'Completed', 
      value: stats.completed_projects || 0, 
      color: 'bg-blue-500',
      percentage: stats.total_projects ? Math.round((stats.completed_projects / stats.total_projects) * 100) : 0
    },
    { 
      label: 'On Hold', 
      value: stats.on_hold_projects || 0, 
      color: 'bg-yellow-500',
      percentage: stats.total_projects ? Math.round((stats.on_hold_projects / stats.total_projects) * 100) : 0
    },
    { 
      label: 'Cancelled', 
      value: stats.cancelled_projects || 0, 
      color: 'bg-red-500',
      percentage: stats.total_projects ? Math.round((stats.cancelled_projects / stats.total_projects) * 100) : 0
    }
  ]

  const productivityMetrics = [
    {
      title: 'Total Projects',
      value: stats.total_projects || 0,
      icon: Target,
      color: 'text-blue-600',
      bg: 'bg-blue-100'
    },
    {
      title: 'Active Users',
      value: stats.users_with_projects || 0,
      icon: Users,
      color: 'text-green-600',
      bg: 'bg-green-100'
    },
    {
      title: 'Total Tasks',
      value: stats.total_tasks || 0,
      icon: BarChart3,
      color: 'text-purple-600',
      bg: 'bg-purple-100'
    },
    {
      title: 'Work Hours',
      value: formatHours(stats.total_work_minutes),
      icon: Clock,
      color: 'text-orange-600',
      bg: 'bg-orange-100'
    }
  ]

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Project Statistics</h3>
          <p className="text-sm text-gray-600">Overview of project performance and metrics</p>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {productivityMetrics.map((metric, index) => {
          const Icon = metric.icon
          return (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center">
                <div className={`${metric.bg} rounded-lg p-3`}>
                  <Icon className={`h-6 w-6 ${metric.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">{metric.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Project Status Distribution */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-6">
            <BarChart3 className="h-5 w-5 text-gray-400 mr-2" />
            <h4 className="text-lg font-medium text-gray-900">Project Status Distribution</h4>
          </div>
          
          <div className="space-y-4">
            {projectStatusData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-4 h-4 ${item.color} rounded mr-3`}></div>
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 ${item.color} rounded-full`}
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-8 text-right">{item.value}</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{getCompletionRate()}%</div>
              <div className="text-sm text-gray-500">Overall Completion Rate</div>
            </div>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-6">
            <TrendingUp className="h-5 w-5 text-gray-400 mr-2" />
            <h4 className="text-lg font-medium text-gray-900">Performance Insights</h4>
          </div>
          
          <div className="space-y-6">
            <div className="border border-gray-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Task Completion Rate</span>
                <span className="text-lg font-bold text-green-600">
                  {stats.total_tasks > 0 
                    ? Math.round((stats.completed_tasks / stats.total_tasks) * 100)
                    : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full"
                  style={{ 
                    width: `${stats.total_tasks > 0 
                      ? (stats.completed_tasks / stats.total_tasks) * 100
                      : 0}%` 
                  }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.completed_tasks || 0} of {stats.total_tasks || 0} tasks completed
              </p>
            </div>

            <div className="border border-gray-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Average Project Duration</span>
                <span className="text-lg font-bold text-blue-600">
                  {getAverageProjectDuration()}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Based on completed projects with defined timelines
              </p>
            </div>

            <div className="border border-gray-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Average Work per Project</span>
                <span className="text-lg font-bold text-purple-600">
                  {stats.total_projects > 0 
                    ? formatHours(stats.total_work_minutes / stats.total_projects)
                    : '0h'}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Total work hours divided by active projects
              </p>
            </div>

            <div className="border border-gray-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">User Utilization</span>
                <span className="text-lg font-bold text-orange-600">
                  {stats.active_users > 0 
                    ? Math.round((stats.users_with_projects / stats.active_users) * 100)
                    : 0}%
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Percentage of users currently assigned to projects
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center">
            <Award className="h-8 w-8 mr-3" />
            <div>
              <div className="text-2xl font-bold">{stats.completed_projects || 0}</div>
              <div className="text-green-100">Projects Completed</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center">
            <Clock className="h-8 w-8 mr-3" />
            <div>
              <div className="text-2xl font-bold">{formatHours(stats.total_work_minutes)}</div>
              <div className="text-blue-100">Total Work Hours</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center">
            <Users className="h-8 w-8 mr-3" />
            <div>
              <div className="text-2xl font-bold">{stats.users_with_projects || 0}</div>
              <div className="text-purple-100">Active Contributors</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProjectStats 