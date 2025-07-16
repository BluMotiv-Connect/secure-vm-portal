import React, { useEffect, useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { apiClient } from '../../../services/apiClient'

const TaskCompletionChart = () => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await apiClient.get('/employee/dashboard/task-completion', {
          params: { days: 30 }
        })
        
        if (response?.data?.completionData) {
          setData(response.data.completionData)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const totalTasks = data.reduce((sum, status) => sum + status.count, 0)
  const completedTasks = data.find(s => s.status === 'completed')?.count || 0
  const inProgressTasks = data.find(s => s.status === 'in_progress')?.count || 0

  if (loading) {
    return <div className="h-64 flex items-center justify-center">
      <p className="text-gray-500">Loading task data...</p>
    </div>
  }

  if (error) {
    return <div className="h-64 flex items-center justify-center text-red-500">
      <p>Error loading task data: {error}</p>
    </div>
  }

  return (
    <>
      {/* Simple Stats */}
      <div className="flex justify-between items-center">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{totalTasks}</p>
          <p className="text-sm text-gray-600">Total Tasks</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">{completedTasks}</p>
          <p className="text-sm text-gray-600">Completed</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">{inProgressTasks}</p>
          <p className="text-sm text-gray-600">In Progress</p>
        </div>
      </div>

      {totalTasks === 0 && (
        <div className="h-64 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">No Tasks</p>
            <p className="text-sm">Start working on tasks to see completion stats</p>
          </div>
        </div>
      )}
    </>
  )
}

export default TaskCompletionChart 