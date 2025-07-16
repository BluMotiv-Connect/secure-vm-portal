import React, { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { FolderOpen, Clock } from 'lucide-react'
import { apiClient } from '../../../services/apiClient'

const ProjectTimeDistributionChart = () => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await apiClient.get('/employee/dashboard/project-time', {
          params: { days: 30 }
        })
        
        if (response?.data) {
          setData(response.data)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const formatHours = (minutes) => {
    if (!minutes || minutes < 0) return '0m'
    if (minutes < 60) return `${Math.round(minutes)}m`
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  const totalMinutes = data.reduce((sum, project) => sum + (project.minutes || 0), 0)
  const averageMinutes = data.length > 0 ? totalMinutes / data.length : 0

  if (loading) {
    return <div className="h-64 flex items-center justify-center">
      <p className="text-gray-500">Loading project data...</p>
    </div>
  }

  if (error) {
    return <div className="h-64 flex items-center justify-center text-red-500">
      <p>Error loading project data: {error}</p>
    </div>
  }

  return (
    <>
      {/* Simple Stats */}
      <div className="flex justify-between items-center mb-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{data.length}</p>
          <p className="text-sm text-gray-600">Active Projects</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{formatHours(totalMinutes)}</p>
          <p className="text-sm text-gray-600">Total Time</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{formatHours(averageMinutes)}</p>
          <p className="text-sm text-gray-600">Avg per Project</p>
        </div>
      </div>

      {data.length === 0 && (
        <div className="h-64 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <FolderOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">No Project Data</p>
            <p className="text-sm">Start working on projects to see time distribution</p>
          </div>
        </div>
      )}
    </>
  )
}

export default ProjectTimeDistributionChart 