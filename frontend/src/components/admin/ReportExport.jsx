import React, { useState } from 'react'
import { useReports } from '@hooks/useReports'
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/Card'
import Button from '@components/ui/Button'
import Select from '@components/ui/Select'
import Input from '@components/ui/Input'
import Badge from '@components/ui/Badge'
import { Download, FileText, Calendar, Users, Monitor, Clock } from 'lucide-react'

const ReportExport = ({ dateRange, onExport, isLoading }) => {
  const [exportConfig, setExportConfig] = useState({
    reportType: 'time',
    format: 'excel',
    includeCharts: true,
    includeDetails: true,
    groupBy: 'user'
  })

  const [customFilters, setCustomFilters] = useState({
    userIds: [],
    vmIds: [],
    workTypes: [],
    includeNonWork: false
  })

  const reportTypes = [
    {
      id: 'time',
      name: 'Time Report',
      description: 'Detailed time tracking with sessions and tasks',
      icon: Clock
    },
    {
      id: 'productivity',
      name: 'User Productivity',
      description: 'Productivity metrics and efficiency analysis',
      icon: Users
    },
    {
      id: 'vmUsage',
      name: 'VM Usage',
      description: 'Virtual machine utilization and statistics',
      icon: Monitor
    },
    {
      id: 'summary',
      name: 'Executive Summary',
      description: 'High-level overview with key metrics',
      icon: FileText
    }
  ]

  const handleExport = () => {
    const params = {
      ...dateRange,
      ...customFilters,
      ...exportConfig
    }
    
    const filename = `${exportConfig.reportType}-report-${dateRange.startDate}-${dateRange.endDate}.xlsx`
    onExport(exportConfig.reportType, params, filename)
  }

  const handleConfigChange = (field, value) => {
    setExportConfig(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleFilterChange = (field, value) => {
    setCustomFilters(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div className="space-y-6">
      {/* Export Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Download className="h-5 w-5 mr-2" />
            Export Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date Range Display */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Calendar className="h-4 w-4 text-gray-600" />
              <span className="font-medium text-gray-900">Report Period</span>
            </div>
            <p className="text-gray-700">
              {new Date(dateRange.startDate).toLocaleDateString()} - {new Date(dateRange.endDate).toLocaleDateString()}
            </p>
          </div>

          {/* Report Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Report Type
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reportTypes.map((type) => {
                const Icon = type.icon
                return (
                  <div
                    key={type.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      exportConfig.reportType === type.id
                        ? 'border-primary-300 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleConfigChange('reportType', type.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <Icon className={`h-5 w-5 mt-0.5 ${
                        exportConfig.reportType === type.id ? 'text-primary-600' : 'text-gray-400'
                      }`} />
                      <div>
                        <h4 className="font-medium text-gray-900">{type.name}</h4>
                        <p className="text-sm text-gray-600">{type.description}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Export Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export Format
              </label>
              <Select
                value={exportConfig.format}
                onChange={(e) => handleConfigChange('format', e.target.value)}
              >
                <option value="excel">Excel (.xlsx)</option>
                <option value="csv">CSV (.csv)</option>
                <option value="pdf">PDF (.pdf)</option>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Group Data By
              </label>
              <Select
                value={exportConfig.groupBy}
                onChange={(e) => handleConfigChange('groupBy', e.target.value)}
              >
                <option value="user">User</option>
                <option value="vm">Virtual Machine</option>
                <option value="date">Date</option>
                <option value="workType">Work Type</option>
              </Select>
            </div>
          </div>

          {/* Additional Options */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Include in Export
            </label>
            
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={exportConfig.includeCharts}
                  onChange={(e) => handleConfigChange('includeCharts', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Include charts and visualizations</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={exportConfig.includeDetails}
                  onChange={(e) => handleConfigChange('includeDetails', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Include detailed session data</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={customFilters.includeNonWork}
                  onChange={(e) => handleFilterChange('includeNonWork', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Include non-work time entries</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Export Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Report Type:</span>
                <p className="font-medium">
                  {reportTypes.find(t => t.id === exportConfig.reportType)?.name}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Format:</span>
                <p className="font-medium">{exportConfig.format.toUpperCase()}</p>
              </div>
              <div>
                <span className="text-gray-500">Period:</span>
                <p className="font-medium">
                  {Math.ceil((new Date(dateRange.endDate) - new Date(dateRange.startDate)) / (1000 * 60 * 60 * 24))} days
                </p>
              </div>
              <div>
                <span className="text-gray-500">Grouping:</span>
                <p className="font-medium capitalize">{exportConfig.groupBy}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {exportConfig.includeCharts && (
                <Badge variant="primary" size="sm">Charts Included</Badge>
              )}
              {exportConfig.includeDetails && (
                <Badge variant="primary" size="sm">Detailed Data</Badge>
              )}
              {customFilters.includeNonWork && (
                <Badge variant="secondary" size="sm">Non-Work Time</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Export Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Export Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setExportConfig({
                  reportType: 'summary',
                  format: 'excel',
                  includeCharts: true,
                  includeDetails: false,
                  groupBy: 'user'
                })
              }}
              className="h-auto p-4 text-left"
            >
              <div>
                <p className="font-medium">Executive Summary</p>
                <p className="text-sm text-gray-600">High-level metrics with charts</p>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setExportConfig({
                  reportType: 'time',
                  format: 'excel',
                  includeCharts: false,
                  includeDetails: true,
                  groupBy: 'date'
                })
              }}
              className="h-auto p-4 text-left"
            >
              <div>
                <p className="font-medium">Detailed Timesheet</p>
                <p className="text-sm text-gray-600">Complete session details</p>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setExportConfig({
                  reportType: 'productivity',
                  format: 'excel',
                  includeCharts: true,
                  includeDetails: true,
                  groupBy: 'user'
                })
              }}
              className="h-auto p-4 text-left"
            >
              <div>
                <p className="font-medium">Productivity Analysis</p>
                <p className="text-sm text-gray-600">User efficiency metrics</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Export Action */}
      <div className="flex justify-end">
        <Button
          onClick={handleExport}
          loading={isLoading}
          disabled={isLoading}
          size="lg"
        >
          <Download className="h-5 w-5 mr-2" />
          Export Report
        </Button>
      </div>
    </div>
  )
}

export default ReportExport
