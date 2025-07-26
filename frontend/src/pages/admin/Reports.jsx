import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { apiClient } from '../../services/apiClient'
import { 
  BarChart3, 
  Download, 
  Calendar, 
  Users, 
  Monitor,
  ArrowLeft,
  FileText,
  Clock,
  TrendingUp,
  Activity,
  User,
  Search
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const Reports = () => {
  const { user: currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reportData, setReportData] = useState(null)
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState('')
  
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reportType: 'summary',
    userId: ''
  })

  useEffect(() => {
    fetchUsers()
    generateReport()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get('/users')
      const allUsers = response.data.users || []
      setUsers(allUsers)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  const generateReport = async () => {
    try {
      setLoading(true)
      setError('')
      
      console.log('[Reports] Generating report with filters:', filters)
      
      // Fetch real data from multiple endpoints
      const [usersResponse, vmsResponse, sessionsResponse, projectsResponse] = await Promise.all([
        apiClient.get('/users'),
        apiClient.get('/vms'),
        apiClient.get('/work-sessions/admin/all', { 
          params: { 
            startDate: filters.startDate, 
            endDate: filters.endDate,
            userId: filters.userId || undefined,
            limit: 1000 
          } 
        }),
        apiClient.get('/projects')
      ])

      const users = usersResponse.data.users || []
      const vms = vmsResponse.data.vms || []
      const sessions = sessionsResponse.data.sessions || []
      const projects = projectsResponse.data.projects || []

      console.log('[Reports] Real data fetched:', {
        users: users.length,
        vms: vms.length,
        sessions: sessions.length,
        projects: projects.length,
        selectedUser: filters.userId
      })

      // Calculate report data based on type
      let realData
      if (filters.reportType === 'individual-user' && filters.userId) {
        realData = calculateIndividualUserReport(users, vms, sessions, projects, filters.userId)
      } else {
        realData = calculateRealReportData(users, vms, sessions, projects)
      }
      
      setReportData(realData)
    } catch (error) {
      console.error('[Reports] Generate report error:', error)
      setError('Failed to generate report: ' + (error.response?.data?.error || error.message))
    } finally {
      setLoading(false)
    }
  }

  const calculateIndividualUserReport = (users, vms, sessions, projects, userId) => {
    // Find the specific user
    const targetUser = users.find(user => user.id === parseInt(userId))
    if (!targetUser) {
      throw new Error('User not found')
    }

    // Filter data for this specific user
    const userSessions = sessions.filter(session => session.user_id === parseInt(userId))
    const userProjects = projects.filter(project => project.user_id === parseInt(userId))
    const userVMs = vms.filter(vm => vm.assigned_user_id === parseInt(userId))

    // Calculate session statistics
    const totalWorkMinutes = userSessions
      .filter(session => session.duration_minutes)
      .reduce((sum, session) => sum + parseFloat(session.duration_minutes || 0), 0)

    const activeSessions = userSessions.filter(session => !session.end_time)

    // Calculate session type breakdown
    const sessionTypes = {
      vm: userSessions.filter(s => s.session_type === 'vm').length,
      personal: userSessions.filter(s => s.session_type === 'personal').length,
      m365: userSessions.filter(s => s.session_type === 'm365').length
    }

    // Calculate daily activity for the past 30 days
    const dailyActivity = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const daySessions = userSessions.filter(session => 
        session.start_time.split('T')[0] === dateStr
      )
      
      const dayHours = daySessions
        .filter(session => session.duration_minutes)
        .reduce((sum, session) => sum + parseFloat(session.duration_minutes || 0), 0) / 60

      dailyActivity.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: dateStr,
        sessions: daySessions.length,
        hours: Math.round(dayHours * 100) / 100,
        vmSessions: daySessions.filter(s => s.session_type === 'vm').length,
        personalSessions: daySessions.filter(s => s.session_type === 'personal').length
      })
    }

    // Calculate VM usage for this user
    const vmUsage = userVMs.map(vm => {
      const vmSessions = userSessions.filter(session => session.vm_id === vm.id)
      const totalHours = vmSessions
        .filter(session => session.duration_minutes)
        .reduce((sum, session) => sum + parseFloat(session.duration_minutes || 0), 0) / 60

      return {
        vmName: vm.name,
        ipAddress: vm.ip_address,
        totalHours: Math.round(totalHours * 100) / 100,
        sessions: vmSessions.length,
        lastUsed: vmSessions.length > 0 ? 
          new Date(Math.max(...vmSessions.map(s => new Date(s.start_time)))).toLocaleDateString() : 'Never',
        avgSessionDuration: vmSessions.length > 0 ? 
          Math.round((totalHours / vmSessions.length) * 100) / 100 : 0
      }
    }).sort((a, b) => b.totalHours - a.totalHours)

    // Calculate project activity
    const projectActivity = userProjects.map(project => {
      const projectSessions = userSessions.filter(session => {
        // This would need task-to-project mapping, simplified for now
        return session.project_name === project.name
      })

      const totalHours = projectSessions
        .filter(session => session.duration_minutes)
        .reduce((sum, session) => sum + parseFloat(session.duration_minutes || 0), 0) / 60

      return {
        projectName: project.name,
        description: project.description,
        totalHours: Math.round(totalHours * 100) / 100,
        sessions: projectSessions.length,
        status: project.status,
        lastActivity: projectSessions.length > 0 ? 
          new Date(Math.max(...projectSessions.map(s => new Date(s.start_time)))).toLocaleDateString() : 'No activity'
      }
    }).sort((a, b) => b.totalHours - a.totalHours)

    // Calculate weekly summary
    const weeklySummary = []
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - (i * 7) - weekStart.getDay())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)

      const weekSessions = userSessions.filter(session => {
        const sessionDate = new Date(session.start_time)
        return sessionDate >= weekStart && sessionDate <= weekEnd
      })

      const weekHours = weekSessions
        .filter(session => session.duration_minutes)
        .reduce((sum, session) => sum + parseFloat(session.duration_minutes || 0), 0) / 60

      weeklySummary.push({
        week: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        sessions: weekSessions.length,
        hours: Math.round(weekHours * 100) / 100,
        avgDailyHours: Math.round((weekHours / 7) * 100) / 100
      })
    }

    return {
      reportType: 'individual-user',
      user: targetUser,
      summary: {
        totalSessions: userSessions.length,
        activeSessions: activeSessions.length,
        totalWorkHours: Math.round(totalWorkMinutes / 60 * 100) / 100,
        avgSessionDuration: userSessions.length > 0 ? 
          Math.round((totalWorkMinutes / userSessions.length) * 100) / 100 : 0,
        totalProjects: userProjects.length,
        assignedVMs: userVMs.length,
        avgDailyHours: Math.round((totalWorkMinutes / 60 / 30) * 100) / 100,
        mostActiveDay: dailyActivity.reduce((max, day) => day.hours > max.hours ? day : max, dailyActivity[0])
      },
      sessionTypes,
      dailyActivity,
      vmUsage,
      projectActivity,
      weeklySummary,
      dateRange: {
        startDate: filters.startDate,
        endDate: filters.endDate,
        totalDays: Math.ceil((new Date(filters.endDate) - new Date(filters.startDate)) / (1000 * 60 * 60 * 24))
      }
    }
  }

  const calculateRealReportData = (users, vms, sessions, projects) => {
    // Enhanced calculateRealReportData function with multi-user VM support
    const employees = users.filter(user => user.role === 'employee' && user.is_active)
    
    const onlineVMs = vms.filter(vm => vm.status === 'online')
    const assignedVMs = vms.filter(vm => vm.assigned_user_id)
    
    const filteredSessions = sessions.filter(session => {
      const sessionDate = new Date(session.start_time)
      const startDate = new Date(filters.startDate)
      const endDate = new Date(filters.endDate)
      return sessionDate >= startDate && sessionDate <= endDate
    })

    const activeSessions = filteredSessions.filter(session => !session.end_time)
    
    const totalWorkMinutes = filteredSessions
      .filter(session => session.duration_minutes)
      .reduce((sum, session) => sum + parseFloat(session.duration_minutes || 0), 0)

    const userActivity = employees.map(user => {
      const userSessions = filteredSessions.filter(session => session.user_id === user.id)
      const totalHours = userSessions
        .filter(session => session.duration_minutes)
        .reduce((sum, session) => sum + parseFloat(session.duration_minutes || 0), 0) / 60
      
      // Get VMs this user has accessed
      const userVMs = [...new Set(userSessions.filter(s => s.vm_id).map(s => s.vm_id))]
      const vmNames = userVMs.map(vmId => {
        const vm = vms.find(v => v.id === vmId)
        return vm ? vm.name : 'Unknown VM'
      }).join(', ')
      
      return {
        userName: user.name,
        email: user.email,
        totalHours: Math.round(totalHours * 100) / 100,
        sessions: userSessions.length,
        avgSessionDuration: userSessions.length > 0 ? 
          Math.round((totalHours / userSessions.length) * 100) / 100 : 0,
        lastActivity: userSessions.length > 0 ? 
          new Date(Math.max(...userSessions.map(s => new Date(s.start_time)))).toLocaleDateString() : 'Never',
        vmsAccessed: userVMs.length,
        vmNames: vmNames || 'None'
      }
    }).sort((a, b) => b.totalHours - a.totalHours)

    const vmUsage = vms.map(vm => {
      const vmSessions = filteredSessions.filter(session => session.vm_id === vm.id)
      const totalHours = vmSessions
        .filter(session => session.duration_minutes)
        .reduce((sum, session) => sum + parseFloat(session.duration_minutes || 0), 0) / 60
      
      const uniqueUsers = [...new Set(vmSessions.map(session => session.user_id))].length
      const userNames = [...new Set(vmSessions.map(session => session.user_name))].filter(Boolean)

      return {
        vmName: vm.name,
        ipAddress: vm.ip_address,
        assignedTo: vm.assigned_user_name || 'Unassigned',
        totalHours: Math.round(totalHours * 100) / 100,
        sessions: vmSessions.length,
        uniqueUsers: uniqueUsers,
        userNames: userNames.join(', ') || 'None',
        utilization: Math.round((totalHours / (24 * 30)) * 100 * 100) / 100,
        status: vm.status,
        mostActiveUser: userNames.length > 0 ? userNames[0] : 'None'
      }
    }).sort((a, b) => b.totalHours - a.totalHours)

    const sessionTypes = {
      vm: filteredSessions.filter(s => s.session_type === 'vm').length,
      personal: filteredSessions.filter(s => s.session_type === 'personal').length,
      m365: filteredSessions.filter(s => s.session_type === 'm365').length
    }

    const dailyActivity = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const daySessions = filteredSessions.filter(session => 
        session.start_time.split('T')[0] === dateStr
      )
      
      const dayHours = daySessions
        .filter(session => session.duration_minutes)
        .reduce((sum, session) => sum + parseFloat(session.duration_minutes || 0), 0) / 60

      dailyActivity.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        sessions: daySessions.length,
        hours: Math.round(dayHours * 100) / 100,
        users: [...new Set(daySessions.map(s => s.user_id))].length
      })
    }

    return {
      reportType: 'summary',
      summary: {
        totalUsers: users.length,
        activeEmployees: employees.length,
        totalVMs: vms.length,
        onlineVMs: onlineVMs.length,
        assignedVMs: assignedVMs.length,
        activeSessions: activeSessions.length,
        totalSessions: filteredSessions.length,
        totalWorkHours: Math.round(totalWorkMinutes / 60 * 100) / 100,
        avgSessionDuration: filteredSessions.length > 0 ? 
          Math.round((totalWorkMinutes / filteredSessions.length) * 100) / 100 : 0,
        totalProjects: projects.length
      },
      userActivity,
      vmUsage,
      sessionTypes,
      dailyActivity,
      dateRange: {
        startDate: filters.startDate,
        endDate: filters.endDate,
        totalDays: Math.ceil((new Date(filters.endDate) - new Date(filters.startDate)) / (1000 * 60 * 60 * 24))
      }
    }
  }

  const exportReport = async (format) => {
    try {
      setLoading(true)
      
      const exportData = {
        ...reportData,
        generatedAt: new Date().toISOString(),
        generatedBy: currentUser.name,
        filters: filters
      }
      
      let content, mimeType, filename

      if (format === 'json') {
        content = JSON.stringify(exportData, null, 2)
        mimeType = 'application/json'
        filename = reportData.reportType === 'individual-user' ? 
          `user-report-${reportData.user.name}-${filters.startDate}-${filters.endDate}.json` :
          `vm-portal-report-${filters.startDate}-${filters.endDate}.json`
      } else if (format === 'csv') {
        const csvData = convertToCSV(exportData)
        content = csvData
        mimeType = 'text/csv'
        filename = reportData.reportType === 'individual-user' ? 
          `user-report-${reportData.user.name}-${filters.startDate}-${filters.endDate}.csv` :
          `vm-portal-report-${filters.startDate}-${filters.endDate}.csv`
      }
      
      const blob = new Blob([content], { type: mimeType })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      
    } catch (error) {
      console.error('Export error:', error)
      setError('Failed to export report')
    } finally {
      setLoading(false)
    }
  }

  const convertToCSV = (data) => {
    let csv = `Report Type,${data.reportType === 'individual-user' ? 'Individual User Report' : 'VM Portal Usage Report'}\n`
    csv += `Generated At,${new Date().toLocaleString()}\n`
    csv += `Date Range,${filters.startDate} to ${filters.endDate}\n`
    
    if (data.reportType === 'individual-user') {
      csv += `User,${data.user.name} (${data.user.email})\n\n`
      
      // Individual user summary
      csv += 'USER SUMMARY\n'
      csv += 'Metric,Value\n'
      Object.entries(data.summary).forEach(([key, value]) => {
        csv += `${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())},${value}\n`
      })
      
      csv += '\nDAILY ACTIVITY\n'
      csv += 'Date,Sessions,Hours,VM Sessions,Personal Sessions\n'
      data.dailyActivity.forEach(day => {
        csv += `${day.date},${day.sessions},${day.hours},${day.vmSessions},${day.personalSessions}\n`
      })
      
      csv += '\nVM USAGE\n'
      csv += 'VM Name,IP Address,Total Hours,Sessions,Last Used,Avg Session Duration\n'
      data.vmUsage.forEach(vm => {
        csv += `${vm.vmName},${vm.ipAddress},${vm.totalHours},${vm.sessions},${vm.lastUsed},${vm.avgSessionDuration}\n`
      })
      
      csv += '\nPROJECT ACTIVITY\n'
      csv += 'Project Name,Description,Total Hours,Sessions,Status,Last Activity\n'
      data.projectActivity.forEach(project => {
        csv += `${project.projectName},"${project.description}",${project.totalHours},${project.sessions},${project.status},${project.lastActivity}\n`
      })
    } else {
      // Summary report CSV (existing implementation)
      csv += '\nSUMMARY\n'
      csv += 'Metric,Value\n'
      Object.entries(data.summary).forEach(([key, value]) => {
        csv += `${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())},${value}\n`
      })
      
      csv += '\nUSER ACTIVITY\n'
      csv += 'User Name,Email,Total Hours,Sessions,Avg Session Duration,Last Activity\n'
      data.userActivity.forEach(user => {
        csv += `${user.userName},${user.email},${user.totalHours},${user.sessions},${user.avgSessionDuration},${user.lastActivity}\n`
      })
      
      csv += '\nVM USAGE\n'
      csv += 'VM Name,IP Address,Assigned To,Total Hours,Sessions,Unique Users,Utilization %,Status\n'
      data.vmUsage.forEach(vm => {
        csv += `${vm.vmName},${vm.ipAddress},${vm.assignedTo},${vm.totalHours},${vm.sessions},${vm.uniqueUsers},${vm.utilization},${vm.status}\n`
      })
    }
    
    return csv
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center text-gray-600 hover:text-gray-800 mr-4"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Dashboard
              </button>
              <BarChart3 className="h-8 w-8 text-purple-600 mr-3" />
              <h1 className="text-xl font-semibold">Reports & Analytics</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {currentUser?.name}</span>
              <button
                onClick={logout}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>
            <p className="text-gray-600">Real-time usage reports and system analytics</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Report Filters */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-medium mb-4">Report Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Report Type
                </label>
                <select
                  value={filters.reportType}
                  onChange={(e) => {
                    const newReportType = e.target.value
                    setFilters({
                      ...filters, 
                      reportType: newReportType,
                      userId: newReportType === 'individual-user' ? filters.userId : ''
                    })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="summary">Summary Report</option>
                  <option value="detailed">Detailed Report</option>
                  <option value="user-activity">User Activity</option>
                  <option value="vm-usage">VM Usage</option>
                  <option value="individual-user">Individual User Report</option>
                  <option value="vm-multi-user">Multi-User VM Analysis</option>
                  <option value="vm-utilization">VM Utilization Report</option>
                </select>
              </div>

              {filters.reportType === 'individual-user' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select User
                  </label>
                  <select
                    value={filters.userId}
                    onChange={(e) => setFilters({...filters, userId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="">Choose a user...</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email}) - {user.role}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={generateReport}
                  disabled={loading || (filters.reportType === 'individual-user' && !filters.userId)}
                  className="w-full bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
                >
                  {loading ? 'Generating...' : 'Generate Report'}
                </button>
              </div>
            </div>
          </div>

          {/* Report Results */}
          {reportData && (
            <>
              {/* Individual User Report */}
              {reportData.reportType === 'individual-user' && (
                <>
                  {/* User Header */}
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-6 mb-6">
                    <div className="flex items-center">
                      <User className="h-12 w-12 mr-4" />
                      <div>
                        <h3 className="text-2xl font-bold">{reportData.user.name}</h3>
                        <p className="text-blue-100">{reportData.user.email}</p>
                        <p className="text-blue-100 capitalize">Role: {reportData.user.role}</p>
                      </div>
                    </div>
                  </div>

                  {/* Individual User Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <div className="bg-white p-6 rounded-lg shadow">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                          <p className="text-2xl font-bold text-gray-900">{reportData.summary.totalSessions}</p>
                          <p className="text-xs text-gray-500">{reportData.summary.activeSessions} active</p>
                        </div>
                        <Activity className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Work Hours</p>
                          <p className="text-2xl font-bold text-gray-900">{reportData.summary.totalWorkHours}h</p>
                          <p className="text-xs text-gray-500">Avg: {reportData.summary.avgDailyHours}h/day</p>
                        </div>
                        <Clock className="h-8 w-8 text-green-600" />
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Assigned VMs</p>
                          <p className="text-2xl font-bold text-gray-900">{reportData.summary.assignedVMs}</p>
                          <p className="text-xs text-gray-500">{reportData.vmUsage.filter(vm => vm.sessions > 0).length} used</p>
                        </div>
                        <Monitor className="h-8 w-8 text-yellow-600" />
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Active Projects</p>
                          <p className="text-2xl font-bold text-gray-900">{reportData.summary.totalProjects}</p>
                          <p className="text-xs text-gray-500">Avg: {reportData.summary.avgSessionDuration}min/session</p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-purple-600" />
                      </div>
                    </div>
                  </div>

                  {/* Daily Activity Chart */}
                  <div className="bg-white rounded-lg shadow mb-6">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">Daily Activity (Last 30 Days)</h3>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-10 gap-2">
                        {reportData.dailyActivity.slice(-10).map((day, index) => (
                          <div key={index} className="text-center">
                            <div className="text-xs font-medium text-gray-900 mb-2">{day.date}</div>
                            <div className="bg-purple-100 rounded-lg p-2">
                              <div className="text-sm font-bold text-purple-600">{day.sessions}</div>
                              <div className="text-xs text-gray-600">sessions</div>
                              <div className="text-xs font-medium text-gray-900 mt-1">{day.hours}h</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Weekly Summary */}
                  <div className="bg-white rounded-lg shadow mb-6">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">Weekly Summary</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Week</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sessions</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Daily Hours</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {reportData.weeklySummary.map((week, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{week.week}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{week.sessions}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{week.hours}h</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{week.avgDailyHours}h</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* VM Usage */}
                  <div className="bg-white rounded-lg shadow mb-6">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">VM Usage</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">VM Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sessions</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Used</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Session</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {reportData.vmUsage.map((vm, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{vm.vmName}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vm.ipAddress}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{vm.totalHours}h</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{vm.sessions}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{vm.lastUsed}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{vm.avgSessionDuration}h</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Project Activity */}
                  <div className="bg-white rounded-lg shadow mb-6">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">Project Activity</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sessions</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Activity</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {reportData.projectActivity.map((project, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{project.projectName}</td>
                              <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{project.description}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{project.totalHours}h</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{project.sessions}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  project.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {project.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{project.lastActivity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {/* Summary Report (existing implementation) */}
              {reportData.reportType !== 'individual-user' && (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <div className="bg-white p-6 rounded-lg shadow">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Active Employees</p>
                          <p className="text-2xl font-bold text-gray-900">{reportData.summary.activeEmployees}</p>
                          <p className="text-xs text-gray-500">of {reportData.summary.totalUsers} total users</p>
                        </div>
                        <Users className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Online VMs</p>
                          <p className="text-2xl font-bold text-gray-900">{reportData.summary.onlineVMs}</p>
                          <p className="text-xs text-gray-500">{reportData.summary.assignedVMs} assigned</p>
                        </div>
                        <Monitor className="h-8 w-8 text-green-600" />
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                          <p className="text-2xl font-bold text-gray-900">{reportData.summary.activeSessions}</p>
                          <p className="text-xs text-gray-500">{reportData.summary.totalSessions} total</p>
                        </div>
                        <Activity className="h-8 w-8 text-yellow-600" />
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Work Hours</p>
                          <p className="text-2xl font-bold text-gray-900">{reportData.summary.totalWorkHours}h</p>
                          <p className="text-xs text-gray-500">Avg: {reportData.summary.avgSessionDuration}min</p>
                        </div>
                        <Clock className="h-8 w-8 text-purple-600" />
                      </div>
                    </div>
                  </div>

                  {/* Daily Activity Chart */}
                  <div className="bg-white rounded-lg shadow mb-6">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">Daily Activity (Last 7 Days)</h3>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-7 gap-4">
                        {reportData.dailyActivity.map((day, index) => (
                          <div key={index} className="text-center">
                            <div className="text-sm font-medium text-gray-900">{day.date}</div>
                            <div className="mt-2 bg-purple-100 rounded-lg p-3">
                              <div className="text-lg font-bold text-purple-600">{day.sessions}</div>
                              <div className="text-xs text-gray-600">sessions</div>
                              <div className="text-sm font-medium text-gray-900 mt-1">{day.hours}h</div>
                              <div className="text-xs text-gray-600">{day.users} users</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* User Activity Table */}
                  <div className="bg-white rounded-lg shadow mb-6">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">User Activity</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sessions</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Session</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Activity</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {reportData.userActivity.map((user, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{user.userName}</div>
                                  <div className="text-sm text-gray-500">{user.email}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.totalHours}h</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.sessions}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.avgSessionDuration}h</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.lastActivity}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={async () => {
                                    const targetUser = users.find(u => u.email === user.email)
                                    if (targetUser) {
                                      const newFilters = {
                                        ...filters,
                                        reportType: 'individual-user',
                                        userId: targetUser.id.toString()
                                      }
                                      setFilters(newFilters)
                                      
                                      // Generate the individual user report immediately
                                      try {
                                        setLoading(true)
                                        setError('')
                                        
                                        const [usersResponse, vmsResponse, sessionsResponse, projectsResponse] = await Promise.all([
                                          apiClient.get('/users'),
                                          apiClient.get('/vms'),
                                          apiClient.get('/work-sessions/admin/all', { 
                                            params: { 
                                              startDate: newFilters.startDate, 
                                              endDate: newFilters.endDate,
                                              userId: newFilters.userId,
                                              limit: 1000 
                                            } 
                                          }),
                                          apiClient.get('/projects')
                                        ])

                                        const allUsers = usersResponse.data.users || []
                                        const vms = vmsResponse.data.vms || []
                                        const sessions = sessionsResponse.data.sessions || []
                                        const projects = projectsResponse.data.projects || []

                                        const individualReport = calculateIndividualUserReport(allUsers, vms, sessions, projects, newFilters.userId)
                                        setReportData(individualReport)
                                      } catch (error) {
                                        console.error('Failed to generate individual user report:', error)
                                        setError('Failed to generate user details: ' + (error.response?.data?.error || error.message))
                                      } finally {
                                        setLoading(false)
                                      }
                                    }
                                  }}
                                  disabled={loading}
                                  className="text-purple-600 hover:text-purple-900 disabled:opacity-50"
                                >
                                  {loading ? 'Loading...' : 'View Details'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* VM Usage Table */}
                  <div className="bg-white rounded-lg shadow mb-6">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">VM Usage</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Virtual Machine</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sessions</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilization</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {reportData.vmUsage.map((vm, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{vm.vmName}</div>
                                  <div className="text-sm text-gray-500">{vm.ipAddress}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{vm.assignedTo}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{vm.totalHours}h</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{vm.sessions}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{vm.utilization}%</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  vm.status === 'online' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {vm.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {/* Export Options */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Export Report</h3>
                <div className="flex space-x-4">
                  <button
                    onClick={() => exportReport('json')}
                    disabled={loading}
                    className="flex items-center bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export JSON
                  </button>
                  <button
                    onClick={() => exportReport('csv')}
                    disabled={loading}
                    className="flex items-center bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Export CSV
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {reportData.reportType === 'individual-user' ? 
                    `Individual report for ${reportData.user.name} generated from real data for ${reportData.dateRange.totalDays} days` :
                    `Report generated from real data for ${reportData.dateRange.totalDays} days`
                  } ({reportData.dateRange.startDate} to {reportData.dateRange.endDate})
                </p>
              </div>
            </>
          )}

          {!reportData && !loading && (
            <div className="text-center py-12">
              <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Report Generated</h3>
              <p className="text-gray-600">Configure your report parameters and click "Generate Report" to get started with real data.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default Reports
