import React, { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Clock } from 'lucide-react'
import { apiClient } from '../../../services/apiClient'

const DailyWorkHoursChart = () => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await apiClient.get('/employee/dashboard/daily-hours', {
          params: { days: 7 }
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

  const totalMinutes = data.reduce((sum, day) => sum + (day.totalMinutes || 0), 0)
  const averageMinutes = data.length > 0 ? totalMinutes / data.length : 0

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-2 border border-gray-200 rounded-lg shadow-sm">
          <p className="font-medium text-gray-900">{data.date}</p>
          <p className="text-sm text-blue-600">Time: {formatHours(data.totalMinutes)}</p>
          {data.sessionCount > 0 && (
            <p className="text-sm text-gray-600">Sessions: {data.sessionCount}</p>
          )}
        </div>
      )
    }
    return null
  }

  if (loading) {
    return <div className="h-64 flex items-center justify-center">
      <p className="text-gray-500">Loading time data...</p>
    </div>
  }

  if (error) {
    return <div className="h-64 flex items-center justify-center text-red-500">
      <p>Error loading time data: {error}</p>
    </div>
  }

  return (
    <>
      {/* Simple Stats */}
      <div className="flex justify-between items-center mb-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{formatHours(totalMinutes)}</p>
          <p className="text-sm text-gray-600">Total Time</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{formatHours(averageMinutes)}</p>
          <p className="text-sm text-gray-600">Daily Average</p>
        </div>
      </div>

      {data.length === 0 && (
        <div className="h-64 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">No Time Data</p>
            <p className="text-sm">Start tracking time to see daily statistics</p>
          </div>
        </div>
      )}

      {data.length > 0 && (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={(value) => value.split(' ')[0]}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={(value) => `${Math.round(value / 60)}h`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="totalMinutes" 
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  )
}

export default DailyWorkHoursChart 