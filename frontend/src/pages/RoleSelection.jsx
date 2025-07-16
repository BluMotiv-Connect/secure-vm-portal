import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Users } from 'lucide-react'

const RoleSelection = () => {
  const navigate = useNavigate()

  const handleRoleSelection = (role) => {
    localStorage.setItem('selectedRole', role)
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl w-full mx-auto px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Secure VM Portal
          </h1>
          <p className="text-xl text-gray-600">
            Choose your access level to continue
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Admin Option */}
          <div 
            onClick={() => handleRoleSelection('admin')}
            className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-blue-500 p-8"
          >
            <div className="text-center">
              <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                <Shield className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Admin Portal
              </h2>
              <p className="text-gray-600 mb-6">
                Manage users, assign VMs, and review system analytics
              </p>
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800 font-medium">
                  Admin Features:
                </p>
                <ul className="text-sm text-blue-600 mt-2 space-y-1">
                  <li>• User management</li>
                  <li>• VM assignment</li>
                  <li>• Reports & analytics</li>
                  <li>• System configuration</li>
                </ul>
              </div>
              <button className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                Access Admin Portal
              </button>
            </div>
          </div>

          {/* Employee Option */}
          <div 
            onClick={() => handleRoleSelection('employee')}
            className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-green-500 p-8"
          >
            <div className="text-center">
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <Users className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                User Portal
              </h2>
              <p className="text-gray-600 mb-6">
                Access assigned VMs and log your work sessions
              </p>
              <div className="bg-green-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-green-800 font-medium">
                  User Features:
                </p>
                <ul className="text-sm text-green-600 mt-2 space-y-1">
                  <li>• VM access</li>
                  <li>• Work logging</li>
                  <li>• Time tracking</li>
                  <li>• Session management</li>
                </ul>
              </div>
              <button className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors font-medium">
                Access User Portal
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            <strong>Note:</strong> Administrators can access both portals. User can only access the User portal.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Secure authentication powered by Microsoft 365
          </p>
        </div>
      </div>
    </div>
  )
}

export default RoleSelection
