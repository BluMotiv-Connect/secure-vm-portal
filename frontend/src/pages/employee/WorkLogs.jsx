import React, { useState } from 'react'
import { useAuth } from '@hooks/useAuth'
import { useWorkLogs } from '@hooks/useWorkLogs'
import { useTheme } from '@contexts/ThemeContext'
import Header from '@components/common/Header'
import Sidebar from '@components/common/Sidebar'
import Footer from '@components/common/Footer'
import Breadcrumb from '@components/common/Breadcrumb'
import WorkLogHistory from '@components/employee/WorkLogHistory'
import WorkSummary from '@components/time/WorkSummary'
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/Card'
import Button from '@components/ui/Button'
import Input from '@components/ui/Input'
import Select from '@components/ui/Select'
import AuthGuard from '@components/auth/AuthGuard'
import { Calendar, Download, Filter } from 'lucide-react'
import { cn } from '@utils/helpers'

const WorkLogs = () => {
  const { user } = useAuth()
  const { sidebarCollapsed } = useTheme()
  
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })
  
  const [filters, setFilters] = useState({
    workType: '',
    vmId: '',
    page: 1,
    limit: 20
  })

  const { 
    useWorkSummary, 
    useWorkLogs: useWorkLogsData,
    workStats 
  } = useWorkLogs()

  const { data: summary } = useWorkSummary(dateRange.startDate, dateRange.endDate)
  const { data: workLogsData, isLoading } = useWorkLogsData({
    ...filters,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate
  })

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1 // Reset to first page when filtering
    }))
  }

  const handleExport = () => {
    // This would trigger an export of the current filtered data
    const params = new URLSearchParams({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      format: 'excel',
      ...filters
    })
    
    window.open(`/api/work-logs/export?${params.toString()}`, '_blank')
  }

  return (
    <AuthGuard requiredRole="employee">
      <div className="min-h-screen bg-gray-50">
        <Header />
        <Sidebar />
        
        <main className={cn(
          'transition-all duration-300 pt-4',
          sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
        )}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Breadcrumb 
              items={[
                { label: 'Dashboard', href: '/employee' },
                { label: 'Work Logs', href: '/employee/work-logs', isLast: true }
              ]}
              className="mb-6" 
            />

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">My Work Logs</h1>
                <p className="text-gray-600">Track your work sessions and view detailed history</p>
              </div>

              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  onClick={handleExport}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {/* Filters */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Filter className="h-5 w-5 mr-2" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <Input
                      type="date"
                      value={dateRange.startDate}
                      onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <Input
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Work Type
                    </label>
                    <Select
                      value={filters.workType}
                      onChange={(e) => handleFilterChange('workType', e.target.value)}
                    >
                      <option value="">All Types</option>
                      <option value="work">Work</option>
                      <option value="break">Break</option>
                      <option value="meeting">Meeting</option>
                      <option value="training">Training</option>
                      <option value="other">Other</option>
                    </Select>
                  </div>

                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFilters({
                          workType: '',
                          vmId: '',
                          page: 1,
                          limit: 20
                        })
                        setDateRange({
                          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                          endDate: new Date().toISOString().split('T')[0]
                        })
                      }}
                      className="w-full"
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Hours</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {Math.round((summary?.totalWorkMinutes || 0) / 60)}h
                      </p>
                    </div>
                    <Calendar className="h-8 w-8 text-primary-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Sessions</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {summary?.totalSessions || 0}
                      </p>
                    </div>
                    <Calendar className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Efficiency</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {Math.round(summary?.workEfficiency || 0)}%
                      </p>
                    </div>
                    <Calendar className="h-8 w-8 text-success-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Days</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {summary?.workDays || 0}
                      </p>
                    </div>
                    <Calendar className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Work Summary */}
            <div className="mb-6">
              <WorkSummary 
                summary={summary} 
                period="custom"
              />
            </div>

            {/* Work Log History */}
            <WorkLogHistory 
              workLogs={workLogsData?.workLogs || []}
              pagination={workLogsData?.pagination}
              loading={isLoading}
              onPageChange={(page) => handleFilterChange('page', page)}
            />
          </div>
        </main>

        <Footer />
      </div>
    </AuthGuard>
  )
}

export default WorkLogs
