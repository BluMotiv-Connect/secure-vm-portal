import React, { useState } from 'react'
import { useUsers } from '@hooks/useUsers'
import { useVMs } from '@hooks/useVMs'
import Button from '@components/ui/Button'
import Input from '@components/ui/Input'
import Select from '@components/ui/Select'
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/Card'
import { Filter, X, Calendar, Users, Monitor, Tag } from 'lucide-react'

const ReportFilters = ({ filters, onFiltersChange, onClear }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const { users } = useUsers()
  const { vms } = useVMs()

  const handleFilterChange = (field, value) => {
    onFiltersChange({
      ...filters,
      [field]: value
    })
  }

  const handleArrayFilterChange = (field, value, checked) => {
    const currentArray = filters[field] || []
    const newArray = checked
      ? [...currentArray, value]
      : currentArray.filter(item => item !== value)
    
    handleFilterChange(field, newArray)
  }

  const getActiveFilterCount = () => {
    let count = 0
    if (filters.userIds?.length > 0) count++
    if (filters.vmIds?.length > 0) count++
    if (filters.workTypes?.length > 0) count++
    if (filters.status) count++
    if (filters.includeNonWork) count++
    return count
  }

  const activeFilterCount = getActiveFilterCount()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Report Filters
            {activeFilterCount > 0 && (
              <span className="ml-2 bg-primary-100 text-primary-800 text-xs font-medium px-2 py-1 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </CardTitle>
          <div className="flex items-center space-x-2">
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
              >
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Basic Filters - Always Visible */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Date Range */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <Calendar className="h-4 w-4 mr-1" />
              Start Date
            </label>
            <Input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <Calendar className="h-4 w-4 mr-1" />
              End Date
            </label>
            <Input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
          </div>

          {/* Quick Date Ranges */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Quick Ranges
            </label>
            <Select
              value=""
              onChange={(e) => {
                const value = e.target.value
                const today = new Date()
                let startDate, endDate

                switch (value) {
                  case 'today':
                    startDate = endDate = today.toISOString().split('T')[0]
                    break
                  case 'yesterday':
                    const yesterday = new Date(today)
                    yesterday.setDate(yesterday.getDate() - 1)
                    startDate = endDate = yesterday.toISOString().split('T')[0]
                    break
                  case 'thisWeek':
                    const weekStart = new Date(today)
                    weekStart.setDate(today.getDate() - today.getDay())
                    startDate = weekStart.toISOString().split('T')[0]
                    endDate = today.toISOString().split('T')[0]
                    break
                  case 'lastWeek':
                    const lastWeekEnd = new Date(today)
                    lastWeekEnd.setDate(today.getDate() - today.getDay() - 1)
                    const lastWeekStart = new Date(lastWeekEnd)
                    lastWeekStart.setDate(lastWeekEnd.getDate() - 6)
                    startDate = lastWeekStart.toISOString().split('T')[0]
                    endDate = lastWeekEnd.toISOString().split('T')[0]
                    break
                  case 'thisMonth':
                    startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
                    endDate = today.toISOString().split('T')[0]
                    break
                  case 'lastMonth':
                    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
                    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
                    startDate = lastMonth.toISOString().split('T')[0]
                    endDate = lastMonthEnd.toISOString().split('T')[0]
                    break
                }

                if (startDate && endDate) {
                  onFiltersChange({
                    ...filters,
                    startDate,
                    endDate
                  })
                }
              }}
            >
              <option value="">Select range...</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="thisWeek">This Week</option>
              <option value="lastWeek">Last Week</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
            </Select>
          </div>
        </div>

        {/* Advanced Filters - Expandable */}
        {isExpanded && (
          <div className="space-y-6 pt-4 border-t border-gray-200">
            {/* User Selection */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
                <Users className="h-4 w-4 mr-1" />
                Users ({filters.userIds?.length || 0} selected)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-32 overflow-y-auto border border-gray-200 rounded p-3">
                {users.map(user => (
                  <label key={user.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filters.userIds?.includes(user.id) || false}
                      onChange={(e) => handleArrayFilterChange('userIds', user.id, e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 truncate">{user.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* VM Selection */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
                <Monitor className="h-4 w-4 mr-1" />
                Virtual Machines ({filters.vmIds?.length || 0} selected)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-32 overflow-y-auto border border-gray-200 rounded p-3">
                {vms.map(vm => (
                  <label key={vm.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filters.vmIds?.includes(vm.id) || false}
                      onChange={(e) => handleArrayFilterChange('vmIds', vm.id, e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 truncate">{vm.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Work Types */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
                <Tag className="h-4 w-4 mr-1" />
                Work Types ({filters.workTypes?.length || 0} selected)
              </label>
              <div className="flex flex-wrap gap-2">
                {['work', 'break', 'meeting', 'training', 'other'].map(type => (
                  <label key={type} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filters.workTypes?.includes(type) || false}
                      onChange={(e) => handleArrayFilterChange('workTypes', type, e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Additional Options */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Additional Options</label>
              
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.includeNonWork || false}
                    onChange={(e) => handleFilterChange('includeNonWork', e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Include non-work time entries</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.billableOnly || false}
                    onChange={(e) => handleFilterChange('billableOnly', e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Billable time only</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.activeSessionsOnly || false}
                    onChange={(e) => handleFilterChange('activeSessionsOnly', e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Active sessions only</span>
                </label>
              </div>
            </div>

            {/* Minimum Duration Filter */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1">
                  Minimum Session Duration (minutes)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={filters.minDuration || ''}
                  onChange={(e) => handleFilterChange('minDuration', e.target.value)}
                  placeholder="e.g., 15"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1">
                  Maximum Session Duration (minutes)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={filters.maxDuration || ''}
                  onChange={(e) => handleFilterChange('maxDuration', e.target.value)}
                  placeholder="e.g., 480"
                />
              </div>
            </div>
          </div>
        )}

        {/* Active Filters Summary */}
        {activeFilterCount > 0 && (
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Active Filters ({activeFilterCount})
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
              >
                Clear All
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ReportFilters
