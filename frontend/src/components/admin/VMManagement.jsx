import React, { useState } from 'react'
import { useVMs } from '@hooks/useVMs'
import { useUsers } from '@hooks/useUsers'
import { useTable } from '@hooks/useTable'
import DataTable from '@components/tables/DataTable'
import VMForm from './VMForm'
import VMDetails from './VMDetails'
import VMAssignment from './VMAssignment'
import Button from '@components/ui/Button'
import Input from '@components/ui/Input'
import Select from '@components/ui/Select'
import Modal from '@components/ui/Modal'
import Badge from '@components/ui/Badge'
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/Card'
import { Plus, Search, Filter, Download, Monitor, Users, Activity } from 'lucide-react'

const VMManagement = () => {
  const [searchParams, setSearchParams] = useState({
    search: '',
    status: '',
    osType: '',
    assignedTo: '',
    page: 1,
    limit: 20
  })

  const [showVMForm, setShowVMForm] = useState(false)
  const [showVMDetails, setShowVMDetails] = useState(false)
  const [showAssignment, setShowAssignment] = useState(false)
  const [selectedVM, setSelectedVM] = useState(null)
  const [showFilters, setShowFilters] = useState(false)

  const {
    vms,
    pagination,
    isLoading,
    vmStats,
    createVM,
    updateVM,
    deleteVM,
    assignVM,
    unassignVM,
    testConnectivity,
    refetch
  } = useVMs(searchParams)

  const { users } = useUsers()

  const {
    data: tableData,
    selectedRows,
    handleRowSelect,
    handleSelectAll,
    isAllSelected,
    clearSelection,
    hasSelection
  } = useTable(vms, {
    storageKey: 'vmManagement'
  })

  // Table columns configuration following your flowchart requirements
  const columns = [
    {
      key: 'name',
      title: 'VM Name',
      sortable: true,
      render: (value, vm) => (
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Monitor className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{value}</p>
            <p className="text-sm text-gray-500">{vm.ipAddress}</p>
          </div>
        </div>
      )
    },
    {
      key: 'osType',
      title: 'OS Type',
      sortable: true,
      render: (value, vm) => (
        <div>
          <p className="font-medium text-gray-900">{value}</p>
          {vm.osVersion && (
            <p className="text-sm text-gray-500">{vm.osVersion}</p>
          )}
        </div>
      )
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (value) => (
        <Badge variant={
          value === 'online' ? 'success' : 
          value === 'offline' ? 'secondary' : 
          value === 'maintenance' ? 'warning' : 'error'
        }>
          {value}
        </Badge>
      )
    },
    {
      key: 'assignedUserName',
      title: 'Assigned To',
      render: (value, vm) => (
        value ? (
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-gray-400" />
            <span className="text-gray-900">{value}</span>
          </div>
        ) : (
          <span className="text-gray-500">Unassigned</span>
        )
      )
    },
    {
      key: 'activeSessionsCount',
      title: 'Active Sessions',
      align: 'center',
      render: (value) => (
        <div className="flex items-center justify-center space-x-1">
          <Activity className="h-4 w-4 text-gray-400" />
          <span className={value > 0 ? 'text-success-600 font-medium' : 'text-gray-500'}>
            {value || 0}
          </span>
        </div>
      )
    },
    {
      key: 'region',
      title: 'Region',
      render: (value) => value || '-'
    },
    {
      key: 'createdAt',
      title: 'Created',
      type: 'date',
      sortable: true
    }
  ]

  const handleSearch = (value) => {
    setSearchParams(prev => ({
      ...prev,
      search: value,
      page: 1
    }))
  }

  const handleFilter = (key, value) => {
    setSearchParams(prev => ({
      ...prev,
      [key]: value,
      page: 1
    }))
  }

  const handlePageChange = (page) => {
    setSearchParams(prev => ({ ...prev, page }))
  }

  const handleCreateVM = () => {
    setSelectedVM(null)
    setShowVMForm(true)
  }

  const handleEditVM = (vm) => {
    setSelectedVM(vm)
    setShowVMForm(true)
  }

  const handleViewVM = (vm) => {
    setSelectedVM(vm)
    setShowVMDetails(true)
  }

  const handleAssignVM = async (vm) => {
    try {
      const assignedUsers = await vmService.getAssignedUsers(vm.id)
      setSelectedVM({ ...vm, assignedUsers: assignedUsers.users })
      setShowAssignment(true)
    } catch (error) {
      console.error('Failed to fetch assigned users:', error)
    }
  }

  const handleVMSubmit = async (vmData) => {
    try {
      if (selectedVM) {
        await updateVM({ id: selectedVM.id, vmData })
      } else {
        await createVM(vmData)
      }
      setShowVMForm(false)
      setSelectedVM(null)
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleBulkAction = async (action) => {
    const vmIds = Array.from(selectedRows)
    
    try {
      switch (action) {
        case 'online':
          // Bulk status update would be implemented here
          break
        case 'offline':
          // Bulk status update would be implemented here
          break
        case 'unassign':
          for (const vmId of vmIds) {
            await unassignVM(vmId)
          }
          break
      }
      clearSelection()
    } catch (error) {
      console.error('Bulk action failed:', error)
    }
  }

  const handleTestConnectivity = async (vm) => {
    try {
      await testConnectivity(vm.id)
    } catch (error) {
      console.error('Connectivity test failed:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards - Following your flowchart requirements */}
      {vmStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total VMs</p>
                  <p className="text-2xl font-bold text-gray-900">{vmStats.totalVms}</p>
                </div>
                <Monitor className="h-8 w-8 text-primary-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Online</p>
                  <p className="text-2xl font-bold text-gray-900">{vmStats.onlineCount}</p>
                </div>
                <div className="h-3 w-3 bg-success-500 rounded-full"></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Assigned</p>
                  <p className="text-2xl font-bold text-gray-900">{vmStats.assignedCount}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                  <p className="text-2xl font-bold text-gray-900">{vmStats.activeSessions || 0}</p>
                </div>
                <Activity className="h-8 w-8 text-success-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Virtual Machine Management</h1>
          <p className="text-gray-600">Manage VMs, assignments, and monitor usage</p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>

          <Button onClick={handleCreateVM}>
            <Plus className="h-4 w-4 mr-2" />
            Add VM
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Search */}
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search VMs by name, IP, or description..."
                  value={searchParams.search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                <Select
                  placeholder="All Status"
                  value={searchParams.status}
                  onChange={(e) => handleFilter('status', e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="error">Error</option>
                </Select>

                <Select
                  placeholder="All OS Types"
                  value={searchParams.osType}
                  onChange={(e) => handleFilter('osType', e.target.value)}
                >
                  <option value="">All OS Types</option>
                  <option value="windows">Windows</option>
                  <option value="linux">Linux</option>
                  <option value="macos">macOS</option>
                </Select>

                <Select
                  placeholder="All Assignments"
                  value={searchParams.assignedTo}
                  onChange={(e) => handleFilter('assignedTo', e.target.value)}
                >
                  <option value="">All Assignments</option>
                  <option value="unassigned">Unassigned</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </Select>

                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchParams({
                      search: '',
                      status: '',
                      osType: '',
                      assignedTo: '',
                      page: 1,
                      limit: 20
                    })
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {hasSelection && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {selectedRows.size} VM(s) selected
              </span>
              
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('online')}
                >
                  Mark Online
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('offline')}
                >
                  Mark Offline
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('unassign')}
                >
                  Unassign
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearSelection}
                >
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* VMs Table */}
      <Card>
        <DataTable
          columns={columns}
          data={tableData}
          loading={isLoading}
          selectedRows={selectedRows}
          onRowSelect={handleRowSelect}
          onSelectAll={handleSelectAll}
          isAllSelected={isAllSelected}
          pagination={pagination}
          onPageChange={handlePageChange}
          emptyMessage="No virtual machines found"
          onRowClick={handleViewVM}
          actions={[
            {
              label: 'View Details',
              onClick: handleViewVM
            },
            {
              label: 'Edit',
              onClick: handleEditVM
            },
            {
              label: 'Assign User',
              onClick: handleAssignVM
            },
            {
              label: 'Test Connection',
              onClick: handleTestConnectivity
            },
            {
              label: 'Delete',
              onClick: (vm) => deleteVM(vm.id),
              className: 'text-error-600'
            }
          ]}
        />
      </Card>

      {/* VM Form Modal */}
      <Modal
        isOpen={showVMForm}
        onClose={() => {
          setShowVMForm(false)
          setSelectedVM(null)
        }}
        title={selectedVM ? 'Edit Virtual Machine' : 'Add Virtual Machine'}
        size="lg"
      >
        <VMForm
          vm={selectedVM}
          onSubmit={handleVMSubmit}
          onCancel={() => {
            setShowVMForm(false)
            setSelectedVM(null)
          }}
        />
      </Modal>

      {/* VM Details Modal */}
      <Modal
        isOpen={showVMDetails}
        onClose={() => {
          setShowVMDetails(false)
          setSelectedVM(null)
        }}
        title="Virtual Machine Details"
        size="xl"
      >
        {selectedVM && (
          <VMDetails
            vm={selectedVM}
            onEdit={() => {
              setShowVMDetails(false)
              setShowVMForm(true)
            }}
            onAssign={() => {
              setShowVMDetails(false)
              setShowAssignment(true)
            }}
            onClose={() => {
              setShowVMDetails(false)
              setSelectedVM(null)
            }}
          />
        )}
      </Modal>

      {/* VM Assignment Modal */}
      <Modal
        isOpen={showAssignment}
        onClose={() => {
          setShowAssignment(false)
          setSelectedVM(null)
        }}
        title="Assign Virtual Machine"
        size="md"
      >
        {selectedVM && (
          <VMAssignment
            vm={selectedVM}
            users={users}
            onAssign={assignVM}
            onUnassign={unassignVM}
            onClose={() => {
              setShowAssignment(false)
              setSelectedVM(null)
            }}
          />
        )}
      </Modal>
    </div>
  )
}

export default VMManagement
