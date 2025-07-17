import React from 'react'
import { Loader2, Server, Zap } from 'lucide-react'

const BackendWakeupLoader = ({ isVisible, message = "Backend is waking up..." }) => {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
        <div className="flex justify-center mb-4">
          <div className="relative">
            <Server className="h-12 w-12 text-blue-600" />
            <Zap className="h-6 w-6 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
          </div>
        </div>
        
        <div className="flex items-center justify-center mb-4">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600 mr-2" />
          <span className="text-lg font-medium text-gray-900">{message}</span>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          The backend service is starting up. This usually takes 30-60 seconds on the free tier.
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-800">
            💡 <strong>Tip:</strong> The backend sleeps after 15 minutes of inactivity to save resources.
          </p>
        </div>
      </div>
    </div>
  )
}

export default BackendWakeupLoader