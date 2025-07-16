import React from 'react'
import Modal from '@components/ui/Modal'
import Button from '@components/ui/Button'
import Badge from '@components/ui/Badge'
import { Monitor, Wifi, Shield, Clock, AlertTriangle } from 'lucide-react'

const ConnectionModal = ({ 
  isOpen, 
  onClose, 
  vm, 
  onConfirm, 
  isConnecting = false 
}) => {
  if (!vm) return null

  const getConnectionTypeIcon = (osType) => {
    return osType?.toLowerCase().includes('windows') ? 'RDP' : 'SSH'
  }

  const getConnectionPort = (osType) => {
    return osType?.toLowerCase().includes('windows') ? '3389' : '22'
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Connect to Virtual Machine"
      size="md"
    >
      <div className="space-y-6">
        {/* VM Information */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-primary-100 rounded-lg">
              <Monitor className="h-6 w-6 text-primary-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">{vm.name}</h3>
              <p className="text-sm text-gray-600 mb-2">{vm.description}</p>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">IP Address:</span>
                  <p className="font-medium text-gray-900">{vm.ipAddress}</p>
                </div>
                <div>
                  <span className="text-gray-500">Operating System:</span>
                  <p className="font-medium text-gray-900">{vm.osType} {vm.osVersion}</p>
                </div>
                <div>
                  <span className="text-gray-500">Connection Type:</span>
                  <p className="font-medium text-gray-900">{getConnectionTypeIcon(vm.osType)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Port:</span>
                  <p className="font-medium text-gray-900">{getConnectionPort(vm.osType)}</p>
                </div>
              </div>
            </div>
            <Badge variant={vm.status === 'online' ? 'success' : 'secondary'}>
              {vm.status}
            </Badge>
          </div>
        </div>

        {/* Connection Information */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 flex items-center">
            <Wifi className="h-4 w-4 mr-2" />
            Connection Details
          </h4>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">Secure Connection</p>
                <p className="text-sm text-blue-700">
                  Your connection will be automatically configured with encrypted credentials. 
                  No manual password entry required.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900">Session Tracking</p>
                <p className="text-sm text-amber-700">
                  Your work session will be automatically logged for time tracking and reporting purposes.
                </p>
              </div>
            </div>
          </div>

          {vm.status !== 'online' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-900">VM Not Available</p>
                  <p className="text-sm text-red-700">
                    This virtual machine is currently {vm.status}. Connection may not be possible.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Connection Steps */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">What happens next:</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
            <li>VM connection will launch automatically from your browser</li>
            <li>Your {getConnectionTypeIcon(vm.osType)} client will open with pre-configured credentials</li>
            <li>Work session tracking will begin automatically</li>
            <li>Session will end automatically when you close the connection</li>
          </ol>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-900">Secure & Automatic</p>
                <p className="text-sm text-green-700">
                  Credentials are handled securely by the portal. No manual setup required.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isConnecting}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            loading={isConnecting}
            disabled={isConnecting || vm.status !== 'online'}
          >
            {isConnecting ? 'Connecting...' : 'Connect Now'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default ConnectionModal
