import React, { useState } from 'react'
import { useUsers } from '@hooks/useUsers'
import { useTable } from '@hooks/useTable'
import DataTable from '@components/tables/DataTable'
import UserForm from './UserForm'
import UserDetails from './UserDetails'
import Button from '@components/ui/Button'
import Input from '@components/ui/Input'
import Select from '@components/ui/Select'
import Modal from '@components/ui/Modal'
import Badge from '@components/ui/Badge'
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/Card'
import { Plus, Search, Filter, Download, Users } from 'lucide-react'

const UserManagement = () => {
  const [searchParams, setSearchParams] = useState({
    search: '',
    role: '',
    isActive: '',
    page: 1,
    limit: 20
  })

  const [showUserForm, setShowUserForm] = useState(false)
  const [showUserDetails, setShowUserDetails] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [showFilters, setShowFilters] = useState(false)

  const {
    users,
    pagination,
    isLoading,
    userStats,
    createUser,
    updateUser,
    deleteUser,
    restoreUser,
    bulkUpdate,
    refetch
  } = useUsers(searchParams)

  const {
    data: tableData,
    selectedRows,
    handleRowSelect,
    handleSelectAll,
    isAllSelected,
    clearSelection,
    hasSelection
  } = useTable(users, {
    storageKey: 'userManagement'
  })

  // Table columns configuration
  const columns = [
    {
      key: 'name',
      title: 'Name',
      sortable: true,
      render: (value, user) => (
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-700 font-medium text-sm">
              {user.name?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-medium text-gray-900">{value}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      title: 'Role',
      sortable: true,
      type: 'badge',
      getBadgeVariant: (value) => value === 'admin' ? 'primary' : 'secondary'
    },
    {
      key: 'isActive',
      title: 'Status',
      sortable: true,
      render: (value) => (
        <Badge variant={value ? 'success' : 'secondary'}>
          {value ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      key: 'assignedVmsCount',
      title: 'VMs',
      align: 'center',
      render: (value) => value || 0
    },
    {
      key: 'activeSessionsCount',
      title: 'Sessions',
      align: 'center',
      render: (value) => value || 0
    },
    {
      key: 'lastLogin',
      title: 'Last Login',
      type: 'datetime',
      sortable: true
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

  const handleCreateUser = () => {
    setSelectedUser(null)
    setShowUserForm(true)
  }

  const handleEditUser = (user) => {
    setSelectedUser(user)
    setShowUserForm(true)
  }

  const handleViewUser = (user) => {
    setSelectedUser(user)
    setShowUserDetails(true)
  }

  const handleUserSubmit = async (userData) => {
    try {
      if (selectedUser) {
        await updateUser({ id: selectedUser.id, userData })
      } else {
        await createUser(userData)
      }
      setShowUserForm(false)
      setSelectedUser(null)
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleBulkAction = async (action) => {
    const userIds = Array.from(selectedRows)
    
    switch (action) {
      case 'activate':
        await bulkUpdate({ userIds, updates: { isActive: true } })
        break
      case 'deactivate':
        await bulkUpdate({ userIds, updates: { isActive: false } })
        break
      case 'makeEmployee':
        await bulkUpdate({ userIds, updates: { role: 'employee' } })
        break
    }
    
    clearSelection()
  }

  const handleEndSessions = async (userId) => {
    try {
      await bulkUpdate({ 
        userIds: [userId], 
        updates: { 
          endActiveSessions: true 
        } 
      })
      success('Active sessions ended successfully')
      refetch()
    } catch (err) {
      error('Failed to end active sessions')
    }
  }

  const handleUnassignVMs = async (userId) => {
    try {
      await bulkUpdate({ 
        userIds: [userId], 
        updates: { 
          unassignVMs: true 
        } 
      })
      success('VMs unassigned successfully')
      refetch()
    } catch (err) {
      error('Failed to unassign VMs')
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {userStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{userStats.totalUsers}</p>
                </div>
                <Users className="h-8 w-8 text-primary-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Users</p>
                  <p className="text-2xl font-bold text-gray-900">{userStats.activeCount}</p>
                </div>
                <div className="h-3 w-3 bg-success-500 rounded-full"></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Admins</p>
                  <p className="text-2xl font-bold text-gray-900">{userStats.adminCount}</p>
                </div>
                <Badge variant="primary">Admin</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">New This Month</p>
                  <p className="text-2xl font-bold text-gray-900">{userStats.newUsers30d}</p>
                </div>
                <div className="text-success-600 text-sm">+{userStats.newUsers30d}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage user accounts and permissions</p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>

          <Button onClick={handleCreateUser}>
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Search */}
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Input
                  placeholder="Search users by name or email..."
                  value={searchParams.search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                <Select
                  placeholder="All Roles"
                  value={searchParams.role}
                  onChange={(e) => handleFilter('role', e.target.value)}
                >
                  <option value="">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="employee">Employee</option>
                </Select>

                <Select
                  placeholder="All Status"
                  value={searchParams.isActive}
                  onChange={(e) => handleFilter('isActive', e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </Select>

                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchParams({
                      search: '',
                      role: '',
                      isActive: '',
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
                {selectedRows.size} user(s) selected
              </span>
              
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('activate')}
                >
                  Activate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('deactivate')}
                >
                  Deactivate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('makeEmployee')}
                >
                  Make Employee
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

      {/* Users Table */}
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
          emptyMessage="No users found"
          actions={[
            {
              label: 'View',
              onClick: handleViewUser
            },
            {
              label: 'Edit',
              onClick: handleEditUser
            },
            {
              label: 'Delete',
              onClick: deleteUser,
              className: 'text-error-600'
            }
          ]}
        />
      </Card>

      {/* User Form Modal */}
      <Modal
        isOpen={showUserForm}
        onClose={() => {
          setShowUserForm(false)
          setSelectedUser(null)
        }}
        title={selectedUser ? 'Edit User' : 'Create User'}
        size="md"
      >
        <UserForm
          user={selectedUser}
          onSubmit={handleUserSubmit}
          onCancel={() => {
            setShowUserForm(false)
            setSelectedUser(null)
          }}
        />
      </Modal>

      {/* User Details Modal */}
      <Modal
        isOpen={showUserDetails}
        onClose={() => {
          setShowUserDetails(false)
          setSelectedUser(null)
        }}
        title="User Details"
        size="lg"
      >
        {selectedUser && (
          <UserDetails
            user={selectedUser}
            onEdit={() => {
              setShowUserDetails(false)
              setShowUserForm(true)
            }}
            onClose={() => {
              setShowUserDetails(false)
              setSelectedUser(null)
            }}
          />
        )}
      </Modal>
    </div>
  )
}

export default UserManagement
