import React, { useState } from 'react'
import { useReports } from '@hooks/useReports'
import { useUsers } from '@hooks/useUsers'
import { useVMs } from '@hooks/useVMs'
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/Card'
import Button from '@components/ui/Button'
import Input from '@components/ui/Input'
import Select from '@components/ui/Select'
import { Save, Play, Download } from 'lucide-react'

const ReportBuilder = () => {
  const [reportConfig, setReportConfig] = useState({
    name: '',
    type: 'time',
    dateRange: {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    },
    filters: {
      userIds: [],
      vmIds: [],
      workTypes: [],
      includeNonWork: false
    },
    groupBy: 'user',
    format: 'json'
  })

  const [previewData, setPreviewData] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const { users } = useUsers()
  const { vms } = useVMs()
  const { 
    useTimeReport, 
    useUserProductivityReport, 
    useVMUsageReport,
    createTemplate,
    downloadExcel 
  } = useReports()

  const handleConfigChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      setReportConfig(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }))
    } else {
      setReportConfig(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  const handleArrayChange = (field, value, checked) => {
    const [parent, child] = field.split('.')
    setReportConfig(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [child]: checked 
          ? [...prev[parent][child], value]
          : prev[parent][child].filter(item => item !== value)
      }
    }))
  }

  const generatePreview = async () => {
    setIsGenerating(true)
    try {
      const params = {
        ...reportConfig.dateRange,
        ...reportConfig.filters,
        groupBy: reportConfig.groupBy
      }

      // Convert arrays to comma-separated strings for API
      if (params.userIds.length > 0) {
        params.userIds = params.userIds.join(',')
      } else {
        delete params.userIds
      }

      if (params.vmIds.length > 0) {
        params.vmIds = params.vmIds.join(',')
      } else {
        delete params.vmIds
      }

      if (params.workTypes.length > 0) {
        params.workTypes = params.workTypes.join(',')
      } else {
        delete params.workTypes
      }

      // Generate report based on type
      let reportHook
      switch (reportConfig.type) {
        case 'time':
          reportHook = useTimeReport
          break
        case 'productivity':
          reportHook = useUserProductivityReport
          break
        case 'vmUsage':
          reportHook = useVMUsageReport
          break
        default:
          reportHook = useTimeReport
      }

      // Note: In a real implementation, you'd need to trigger the query
      // For now, we'll simulate the preview
      setPreviewData({ message: 'Preview generated successfully', params })
    } catch (error) {
      console.error('Preview generation failed:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const saveTemplate = async () => {
    try {
      await createTemplate({
        name: reportConfig.name,
        type: reportConfig.type,
        parameters: {
          dateRange: reportConfig.dateRange,
          filters: reportConfig.filters,
          groupBy: reportConfig.groupBy
        },
        isPublic: false
      })
    } catch (error) {
      console.error('Template save failed:', error)
    }
  }

  const exportReport = () => {
    const params = {
      ...reportConfig.dateRange,
      ...reportConfig.filters,
      format: 'excel'
    }
    
    downloadExcel({
      reportType: reportConfig.type,
      params,
      filename: `${reportConfig.name || 'custom-report'}.xlsx`
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Report Name"
              value={reportConfig.name}
              onChange={(e) => handleConfigChange('name', e.target.value)}
              placeholder="Enter report name"
            />

            <Select
              label="Report Type"
              value={reportConfig.type}
              onChange={(e) => handleConfigChange('type', e.target.value)}
            >
              <option value="time">Time Report</option>
              <option value="productivity">User Productivity</option>
              <option value="vmUsage">VM Usage</option>
            </Select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={reportConfig.dateRange.startDate}
              onChange={(e) => handleConfigChange('dateRange.startDate', e.target.value)}
            />

            <Input
              label="End Date"
              type="date"
              value={reportConfig.dateRange.endDate}
              onChange={(e) => handleConfigChange('dateRange.endDate', e.target.value)}
            />
          </div>

          {/* Filters */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Filters</h3>
            
            {/* User Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Users (leave empty for all)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto border border-gray-200 rounded p-2">
                {users.map(user => (
                  <label key={user.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={reportConfig.filters.userIds.includes(user.id)}
                      onChange={(e) => handleArrayChange('filters.userIds', user.id, e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{user.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* VM Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Virtual Machines (leave empty for all)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto border border-gray-200 rounded p-2">
                {vms.map(vm => (
                  <label key={vm.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={reportConfig.filters.vmIds.includes(vm.id)}
                      onChange={(e) => handleArrayChange('filters.vmIds', vm.id, e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{vm.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Work Types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Work Types
              </label>
              <div className="flex flex-wrap gap-2">
                {['work', 'break', 'meeting', 'training', 'other'].map(type => (
                  <label key={type} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={reportConfig.filters.workTypes.includes(type)}
                      onChange={(e) => handleArrayChange('filters.workTypes', type, e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm capitalize">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Additional Options */}
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={reportConfig.filters.includeNonWork}
                  onChange={(e) => handleConfigChange('filters.includeNonWork', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Include non-work time</span>
              </label>

              <Select
                label="Group By"
                value={reportConfig.groupBy}
                onChange={(e) => handleConfigChange('groupBy', e.target.value)}
                className="w-40"
              >
                <option value="user">User</option>
                <option value="vm">VM</option>
                <option value="date">Date</option>
                <option value="workType">Work Type</option>
              </Select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
            <Button
              onClick={generatePreview}
              loading={isGenerating}
              disabled={isGenerating}
            >
              <Play className="h-4 w-4 mr-2" />
              Generate Preview
            </Button>

            <Button
              variant="outline"
              onClick={saveTemplate}
              disabled={!reportConfig.name}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Template
            </Button>

            <Button
              variant="outline"
              onClick={exportReport}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {previewData && (
        <Card>
          <CardHeader>
            <CardTitle>Report Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(previewData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ReportBuilder
