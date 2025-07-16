import React, { useState } from 'react'
import { useVMs } from '@hooks/useVMs'
import { useConnections } from '@hooks/useConnections'
import VMCard from '@components/vm/VMCard'
import ConnectionModal from '@components/vm/ConnectionModal'
import BrowserConnectionStatus from '@components/vm/BrowserConnectionStatus'
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/Card'
import Button from '@components/ui/Button'
import Input from '@components/ui/Input'
import LoadingSpinner from '@components/common/LoadingSpinner'
import { Monitor, Search, Wifi, AlertCircle } from 'lucide-react'

const MyVMs = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedVM, setSelectedVM] = useState(null)
  const [showConnectionModal, setShowConnectionModal] = useState(false)

  const { myVMs, myVMsLoading, myVMsError } = useVMs()
  const { initiateConnection, isInitiating, activeConnections, refetchActive } = useConnections()

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
      try {
        const result = await initiateConnection(selectedVM.id)
        setShowConnectionModal(false)
        setSelectedVM(null)
        
        // Refresh active connections to show the new session
        refetchActive()
      } catch (error) {
        // Error is handled by the hook
      }
    }
  }

  const handleSessionEnd = () => {
    // Refresh active connections when a session ends
    refetchActive()
  }

  const getVMStatus = (vm) => {
    const activeSession = activeConnections.find(session => session.vmId === vm.id)
    if (activeSession) {
      return { status: 'connected', session: activeSession }
    }
    return { status: vm.status }
  }

  if (myVMsLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading your virtual machines...</p>
        </CardContent>
      </Card>
    )
  }

  if (myVMsError) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <AlertCircle className="h-16 w-16 text-error-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Failed to Load VMs
          </h3>
          <p className="text-gray-600 mb-6">
            There was an error loading your virtual machines. Please try again.
          </p>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl font-bold text-gray-900">My Virtual Machines</h2>
          <p className="text-gray-600">
            {myVMs.length} VM{myVMs.length !== 1 ? 's' : ''} assigned to you
          </p>
        </div>

        {myVMs.length > 0 && (
          <div className="relative w-full sm:w-64">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search VMs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        )}
      </div>

      {/* Active Connections Display */}
      {activeConnections.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Active Connections</h3>
          {activeConnections.map((session) => {
            const vm = myVMs.find(v => v.id === session.vmId)
            return (
              <BrowserConnectionStatus
                key={session.sessionId}
                session={session}
                vm={vm}
                onSessionEnd={handleSessionEnd}
              />
            )
          })}
        </div>
      )}

      {/* VMs Grid */}
      {myVMs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Monitor className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No VMs Assigned
            </h3>
            <p className="text-gray-600 mb-6">
              You don't have any virtual machines assigned to you yet. 
              Contact your administrator to get VM access.
            </p>
          </CardContent>
        </Card>
      ) : filteredVMs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No VMs Found
            </h3>
            <p className="text-gray-600 mb-6">
              No virtual machines match your search criteria. Try adjusting your search terms.
            </p>
            <Button
              variant="outline"
              onClick={() => setSearchTerm('')}
            >
              Clear Search
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVMs.map((vm) => {
            const vmStatus = getVMStatus(vm)
            return (
              <VMCard
                key={vm.id}
                vm={{
                  ...vm,
                  status: vmStatus.status,
                  activeSession: vmStatus.session
                }}
                onConnect={handleConnect}
                isConnecting={isInitiating && selectedVM?.id === vm.id}
                showActions={true}
                showConnectionInfo={true}
              />
            )
          })}
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

export default MyVMs
