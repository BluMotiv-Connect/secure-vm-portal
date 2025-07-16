import React, { useState } from 'react'
import { apiClient } from '../../services/apiClient'
import { X, Play, Laptop, Globe } from 'lucide-react'

const PersonalWorkModal = ({ task, onWorkStart, onClose }) => {
  const [workType, setWorkType] = useState('')
  const [reason, setReason] = useState('')
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')

  const handleStartWork = async () => {
    if (!workType) {
      setError('Please select a work type')
      return
    }

    if (workType === 'other-apps' && !reason.trim()) {
      setError('Please provide a reason for using other applications')
      return
    }

    try {
      setStarting(true)
      const response = await apiClient.post('/work-sessions/start', {
        task_id: task.id,
        session_type: 'personal',
        reason: workType === 'other-apps' ? reason : null
      })

      if (workType === 'm365') {
        // Redirect to M365 apps
        const m365Url = 'https://www.office.com'
        window.open(m365Url, '_blank')
        alert('M365 apps opened in new tab. Time tracking has started.')
      } else {
        alert('Personal computer work session started. Please return to this page when you finish working.')
      }
      
      onWorkStart(response.data.session)
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to start work session')
      console.error('Start work error:', error)
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Personal Computer Work
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Task: <span className="font-medium">{task.task_name}</span>
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Choose how you want to work on your personal computer
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* M365 Apps Option */}
            <div
              onClick={() => setWorkType('m365')}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                workType === 'm365'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Globe className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">Use M365 Apps</h4>
                  <p className="text-sm text-gray-600">
                    Work with Microsoft 365 applications (Word, Excel, PowerPoint, etc.)
                  </p>
                </div>
                {workType === 'm365' && (
                  <div className="w-4 h-4 border-2 border-blue-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Other Apps Option */}
            <div
              onClick={() => setWorkType('other-apps')}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                workType === 'other-apps'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Laptop className="w-4 h-4 text-green-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">Use Other Applications</h4>
                  <p className="text-sm text-gray-600">
                    Work with other applications on your personal computer
                  </p>
                </div>
                {workType === 'other-apps' && (
                  <div className="w-4 h-4 border-2 border-green-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Reason input for other apps */}
            {workType === 'other-apps' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for using other applications *
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows={3}
                  placeholder="Please explain why you need to use other applications for this task..."
                  required
                />
              </div>
            )}
          </div>
        </div>

        <div className="border-t p-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleStartWork}
            disabled={!workType || starting}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {starting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Starting...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Work Session
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PersonalWorkModal
