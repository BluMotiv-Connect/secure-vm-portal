import React, { useState } from 'react'
import { useVMs } from '@hooks/useVMs'
import { useConnections } from '@hooks/useConnections'
import VMCard from './VMCard'
import ConnectionModal from './ConnectionModal'
import SessionManager from './SessionManager'
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/Card'
import Button from '@components/ui/Button'
import Input from '@components/ui/Input'
import LoadingSpinner from '@components/common/LoadingSpinner'
import { Search, Wifi, Monitor } from 'lucide-react'

const VMConnector = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedVM, setSelectedVM] = useState(null)
  const [showConnectionModal, setShowConnectionModal] = useState(false)

  const { myVMs, myVMsLoading } = useVMs()
  const { 
    activeConnections, 
    initiateConnection, 
    isInitiating,
    refetchActive 
  } = useConnections()

  // Filter VMs based on search term
  const filteredVMs = myVMs.filter(vm =>
    vm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vm.ipAddress.includes(searchTerm) ||
    vm.osType.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleConnect = (vm) => {
    setSelectedVM(vm)
    setShowConnectionModal(true)
  }

  const handleConnectionConfirm = async () => {
    if (selectedVM) {
      await initiateConnection(selectedVM.id)
      setShowConnectionModal(false)
      setSelectedVM(null)
      refetchActive()
    }
  }

  if (myVMsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Virtual Machines</h1>
          <p className="text-gray-600">Connect to your assigned virtual machines</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search VMs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      {activeConnections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Wifi className="h-5 w-5 mr-2 text-success-600" />
              Active Sessions ({activeConnections.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SessionManager sessions={activeConnections} />
          </CardContent>
        </Card>
      )}

      {/* VM Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVMs.map((vm) => (
          <VMCard
            key={vm.id}
            vm={vm}
            onConnect={handleConnect}
            isConnecting={isInitiating && selectedVM?.id === vm.id}
            showActions={true}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredVMs.length === 0 && (
        <div className="text-center py-12">
          <Monitor className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'No VMs found' : 'No VMs assigned'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm 
              ? 'Try adjusting your search terms'
              : 'Contact your administrator to get VM access'
            }
          </p>
          {searchTerm && (
            <Button
              variant="outline"
              onClick={() => setSearchTerm('')}
            >
              Clear Search
            </Button>
          )}
        </div>
      )}

      {/* Connection Modal */}
      <ConnectionModal
        isOpen={showConnectionModal}
        onClose={() => {
          setShowConnectionModal(false)
          setSelectedVM(null)
        }}
        vm={selectedVM}
        onConfirm={handleConnectionConfirm}
        isConnecting={isInitiating}
      />
    </div>
  )
}

export default VMConnector
