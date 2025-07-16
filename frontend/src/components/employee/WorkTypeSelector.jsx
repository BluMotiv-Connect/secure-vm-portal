import React, { useState } from 'react'
import { Monitor, Laptop } from 'lucide-react'
import VMSelector from './VMSelector'
import PersonalWorkModal from './PersonalWorkModal'

const WorkTypeSelector = ({ task, onWorkStart }) => {
  const [selectedType, setSelectedType] = useState(null)
  const [showVMSelector, setShowVMSelector] = useState(false)
  const [showPersonalModal, setShowPersonalModal] = useState(false)

  const handleWorkTypeSelect = (type) => {
    setSelectedType(type)
    if (type === 'vm') {
      setShowVMSelector(true)
    } else if (type === 'personal') {
      setShowPersonalModal(true)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Start Working on: {task.task_name}
          </h3>
          <p className="text-gray-600">Choose how you want to work on this task</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Work with VM Option */}
          <div
            onClick={() => handleWorkTypeSelect('vm')}
            className="border-2 border-gray-200 rounded-lg p-6 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
          >
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Monitor className="w-8 h-8 text-blue-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Work with VM
              </h4>
              <p className="text-gray-600 text-sm">
                Connect to a virtual machine assigned to you and work remotely
              </p>
              <div className="mt-4 text-xs text-gray-500">
                • Automatic time tracking
                • RDP connection
                • Session recording
              </div>
            </div>
          </div>

          {/* Work with Personal Computer Option */}
          <div
            onClick={() => handleWorkTypeSelect('personal')}
            className="border-2 border-gray-200 rounded-lg p-6 cursor-pointer hover:border-green-500 hover:bg-green-50 transition-all"
          >
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Laptop className="w-8 h-8 text-green-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Work with Personal Computer
              </h4>
              <p className="text-gray-600 text-sm">
                Use your personal computer or M365 apps for this task
              </p>
              <div className="mt-4 text-xs text-gray-500">
                • M365 integration
                • Manual time tracking
                • Local applications
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* VM Selector Modal */}
      {showVMSelector && (
        <VMSelector
          task={task}
          onWorkStart={onWorkStart}
          onClose={() => {
            setShowVMSelector(false)
            setSelectedType(null)
          }}
        />
      )}

      {/* Personal Work Modal */}
      {showPersonalModal && (
        <PersonalWorkModal
          task={task}
          onWorkStart={onWorkStart}
          onClose={() => {
            setShowPersonalModal(false)
            setSelectedType(null)
          }}
        />
      )}
    </div>
  )
}

export default WorkTypeSelector
