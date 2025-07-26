import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Shield } from 'lucide-react'

const AdminNavigation = ({ currentUser }) => {
  const navigate = useNavigate()

  if (currentUser?.role !== 'admin') {
    return null
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">
            Admin Access: You can switch between portals
          </span>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => navigate('/admin')}
            className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
          >
            Admin Portal
          </button>
          <button
            onClick={() => navigate('/employee')}
            className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
          >
            User Portal
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminNavigation
