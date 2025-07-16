import React, { useEffect, useState } from 'react'
import { apiClient } from '../../services/apiClient'
import { Monitor } from 'lucide-react'

const VMUsageDetails = () => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await apiClient.get('/employee/dashboard/vm-usage')
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

  const formatDuration = (minutes) => {
    if (!minutes) return '0h'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Loading VM usage data...</div>
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">Error loading VM data: {error}</div>
  }

  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center">
        <Monitor className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No VM usage data available</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              VM Name
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Sessions
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Hours
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Last Used
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((vm, index) => (
            <tr key={index}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <Monitor className="h-5 w-5 text-gray-400 mr-2" />
                  <div className="text-sm font-medium text-gray-900">{vm.vmName}</div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {vm.totalSessions || 0}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDuration(vm.totalUsageMinutes)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {vm.lastUsed ? new Date(vm.lastUsed).toLocaleDateString() : 'Never'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default VMUsageDetails 