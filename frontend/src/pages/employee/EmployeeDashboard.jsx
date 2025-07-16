import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { apiClient } from '../../services/apiClient'
import { 
  Users, 
  Monitor, 
  Clock, 
  LogOut, 
  Shield,
  FolderOpen,
  Plus,
  Edit,
  Trash2,
  PlayCircle,
  StopCircle,
  Timer,
  BarChart3,
  Activity
} from 'lucide-react'
import AdminNavigation from '../../components/admin/AdminNavigation'
import ProjectList from '../../components/employee/ProjectList'
import TaskList from '../../components/employee/TaskList'
import WorkTypeSelector from '../../components/employee/WorkTypeSelector'
import VMSelector from '../../components/employee/VMSelector'
import ActiveSession from '../../components/employee/ActiveSession'
import EmployeeProductivityDashboard from '../../components/employee/EmployeeProductivityDashboard'

const EmployeeDashboard = () => {
  const { user, logout } = useAuth()
  const [selectedProject, setSelectedProject] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [showWorkTypeSelector, setShowWorkTypeSelector] = useState(false)
  const [activeSession, setActiveSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentView, setCurrentView] = useState('dashboard') // 'dashboard', 'projects', 'analytics'

  useEffect(() => {
    checkActiveSession()
  }, [])

  const checkActiveSession = async () => {
    try {
      const response = await apiClient.get('/work-sessions/active')
      setActiveSession(response.data.activeSession)
    } catch (error) {
      console.error('Failed to check active session:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProjectSelect = (project) => {
    setSelectedProject(project)
    setSelectedTask(null)
    setShowWorkTypeSelector(false)
  }

  const handleTaskSelect = (task) => {
    setSelectedTask(task)
    setShowWorkTypeSelector(true)
  }

  const handleWorkStart = (sessionData) => {
    setActiveSession(sessionData)
    setShowWorkTypeSelector(false)
  }

  const handleWorkEnd = () => {
    setActiveSession(null)
    checkActiveSession()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-600 mr-3" />
              <h1 className="text-xl font-semibold">User Portal</h1>
              {user?.role === 'admin' && (
                <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  Admin Access
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user?.name}</span>
              {activeSession && (
                <div className="flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                  <Timer className="h-4 w-4 mr-1" />
                  Active Session
                </div>
              )}
              <button
                onClick={logout}
                className="flex items-center bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Admin Navigation Helper */}
          <AdminNavigation currentUser={user} />

          {/* Active Session Display */}
          {activeSession && (
            <ActiveSession 
              session={activeSession} 
              onEnd={handleWorkEnd}
            />
          )}

          {/* Navigation Tabs */}
          <div className="mb-8">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => {
                    setCurrentView('dashboard')
                    setSelectedProject(null)
                    setSelectedTask(null)
                    setShowWorkTypeSelector(false)
                  }}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    currentView === 'dashboard'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Activity className="h-5 w-5 inline mr-2" />
                  Dashboard
                </button>
                
                <button
                  onClick={() => {
                    setCurrentView('projects')
                    setSelectedProject(null)
                    setSelectedTask(null)
                    setShowWorkTypeSelector(false)
                  }}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    currentView === 'projects'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <FolderOpen className="h-5 w-5 inline mr-2" />
                  Projects & Tasks
                </button>
                
                <button
                  onClick={() => {
                    setCurrentView('analytics')
                    setSelectedProject(null)
                    setSelectedTask(null)
                    setShowWorkTypeSelector(false)
                  }}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    currentView === 'analytics'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <BarChart3 className="h-5 w-5 inline mr-2" />
                  Analytics
                </button>
              </nav>
            </div>
            
            <div className="mt-6">
              {currentView === 'dashboard' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name}</h2>
                  <p className="text-gray-600">Here's your productivity overview and recent activity</p>
                </div>
              )}
              {currentView === 'projects' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Project & Task Management</h2>
                  <p className="text-gray-600">Manage your projects, tasks, and work sessions</p>
                </div>
              )}
              {currentView === 'analytics' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Productivity Analytics</h2>
                  <p className="text-gray-600">Deep insights into your work patterns and performance</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Breadcrumb - Only show for projects view */}
          {currentView === 'projects' && (
            <div className="mb-6">
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-4">
                  <li>
                    <button
                      onClick={() => {
                        setSelectedProject(null)
                        setSelectedTask(null)
                        setShowWorkTypeSelector(false)
                      }}
                      className={`text-sm font-medium ${
                        !selectedProject ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Projects
                    </button>
                  </li>
                  {selectedProject && (
                    <>
                      <li className="flex items-center">
                        <svg className="flex-shrink-0 h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                        <button
                          onClick={() => {
                            setSelectedTask(null)
                            setShowWorkTypeSelector(false)
                          }}
                          className={`ml-4 text-sm font-medium ${
                            !selectedTask ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {selectedProject.name}
                        </button>
                      </li>
                    </>
                  )}
                  {selectedTask && (
                    <li className="flex items-center">
                      <svg className="flex-shrink-0 h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="ml-4 text-sm font-medium text-blue-600">
                        {selectedTask.task_name}
                      </span>
                    </li>
                  )}
                </ol>
              </nav>
            </div>
          )}

          {/* Content Area */}
          <div className="space-y-6">
            {/* Dashboard View */}
            {currentView === 'dashboard' && (
              <EmployeeProductivityDashboard />
            )}

            {/* Projects View */}
            {currentView === 'projects' && (
              <>
                {!selectedProject && (
                  <ProjectList onProjectSelect={handleProjectSelect} />
                )}

                {selectedProject && !selectedTask && (
                  <TaskList 
                    project={selectedProject} 
                    onTaskSelect={handleTaskSelect}
                  />
                )}

                {selectedTask && showWorkTypeSelector && !activeSession && (
                  <WorkTypeSelector 
                    task={selectedTask}
                    onWorkStart={handleWorkStart}
                  />
                )}
              </>
            )}

            {/* Analytics View */}
            {currentView === 'analytics' && (
              <EmployeeProductivityDashboard />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default EmployeeDashboard
