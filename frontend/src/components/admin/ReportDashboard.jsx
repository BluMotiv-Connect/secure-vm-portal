import React, { useState } from 'react'
import { useReports } from '@hooks/useReports'
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/Card'
import Button from '@components/ui/Button'
import ReportBuilder from './ReportBuilder'
import ReportFilters from './ReportFilters'
import ReportExport from './ReportExport'
import WorkTimeChart from '@components/charts/WorkTimeChart'
import ProductivityChart from '@components/charts/ProductivityChart'
import { BarChart3, Download, Plus, Calendar } from 'lucide-react'

const ReportDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })

  const {
    useSummaryReport,
    useTimeReport,
    downloadExcel,
    isDownloading
  } = useReports()

  const { data: summaryData, isLoading: summaryLoading } = useSummaryReport(dateRange)
  const { data: timeData, isLoading: timeLoading } = useTimeReport(dateRange)

  const handleExportExcel = (reportType) => {
    const filename = `${reportType}-report-${dateRange.startDate}-${dateRange.endDate}.xlsx`
    downloadExcel({ reportType, params: dateRange, filename })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600">Generate comprehensive reports and insights</p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => setActiveTab('builder')}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Report
          </Button>
          
          <Button onClick={() => handleExportExcel('summary')}>
            <Download className="h-4 w-4 mr-2" />
            Export Summary
          </Button>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <Calendar className="h-5 w-5 text-gray-400" />
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">From:</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">To:</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
            { id: 'builder', label: 'Report Builder', icon: Plus },
            { id: 'export', label: 'Export', icon: Download }
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Summary Stats */}
          {summaryData && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Users</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {summaryData.report?.overallStats?.activeUsers || 0}
                      </p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-primary-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {summaryData.report?.overallStats?.totalSessions || 0}
                      </p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-success-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Hours</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {Math.round((summaryData.report?.overallStats?.totalMinutes || 0) / 60)}h
                      </p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">VMs Used</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {summaryData.report?.overallStats?.usedVMs || 0}
                      </p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {summaryData?.report?.dailyTrends && (
              <WorkTimeChart 
                data={summaryData.report.dailyTrends}
                title="Daily Activity Trends"
              />
            )}
            
            {summaryData?.report?.workTypeDistribution && (
              <ProductivityChart 
                data={summaryData.report.workTypeDistribution.reduce((acc, item) => {
                  acc[item.workType] = item.totalMinutes
                  return acc
                }, {})}
                type="pie"
                title="Work Type Distribution"
              />
            )}
          </div>
        </div>
      )}

      {activeTab === 'builder' && (
        <ReportBuilder />
      )}

      {activeTab === 'export' && (
        <ReportExport 
          dateRange={dateRange}
          onExport={handleExportExcel}
          isLoading={isDownloading}
        />
      )}
    </div>
  )
}

export default ReportDashboard
