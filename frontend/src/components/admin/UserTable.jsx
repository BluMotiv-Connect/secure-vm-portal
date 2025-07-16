import React from 'react'
import { useUsers } from '@hooks/useUsers'
import DataTable from '@components/tables/DataTable'
import Badge from '@components/ui/Badge'
import Button from '@components/ui/Button'
import { User, Mail, Calendar, Edit, Trash2, UserCheck, UserX, Clock, Monitor } from 'lucide-react'

const UserTable = ({ 
  users, 
  loading, 
  pagination, 
  onPageChange, 
  onEdit, 
  onDelete, 
  onToggleStatus,
  selectedRows,
  onRowSelect,
  onSelectAll,
  isAllSelected,
  onEndSessions,
  onUnassignVMs,
  error
}) => {
  const { assignVM, unassignVM } = useUsers()

  const columns = [
    {
      key: 'name',
      title: 'User',
      sortable: true,
      render: (value, user) => (
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-100 rounded-lg">
            <User className="h-4 w-4 text-primary-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 flex items-center">
              <Mail className="h-3 w-3 mr-1" />
              {user.email}
            </p>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      title: 'Role',
      sortable: true,
      render: (value) => (
        <Badge variant={value === 'admin' ? 'primary' : 'secondary'}>
          {value}
        </Badge>
      )
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
      key: 'assignedVMsCount',
      title: 'Assigned VMs',
      align: 'center',
      render: (value) => (
        <span className="font-medium text-gray-900">
          {value || 0}
        </span>
      )
    },
    {
      key: 'lastLoginAt',
      title: 'Last Login',
      sortable: true,
      render: (value) => (
        value ? (
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="h-3 w-3 mr-1" />
            {new Date(value).toLocaleDateString()}
          </div>
        ) : (
          <span className="text-gray-400">Never</span>
        )
      )
    },
    {
      key: 'createdAt',
      title: 'Created',
      type: 'date',
      sortable: true
    }
  ]

  const actions = [
    {
      label: 'Edit User',
      icon: Edit,
      onClick: onEdit
    },
    {
      label: (user) => user.isActive ? 'Deactivate' : 'Activate',
      icon: (user) => user.isActive ? UserX : UserCheck,
      onClick: onToggleStatus,
      className: (user) => user.isActive ? 'text-warning-600' : 'text-success-600'
    },
    {
      label: 'End Sessions',
      icon: (user) => Clock,
      onClick: (user) => {
        if (user.activeSessions?.length > 0) {
          onEndSessions(user.id)
        } else {
          error('No active sessions to end')
        }
      },
      show: (user) => user.activeSessions?.length > 0,
      className: 'text-warning-600'
    },
    {
      label: 'Unassign VMs',
      icon: (user) => Monitor,
      onClick: (user) => {
        if (user.assignedVMsCount > 0) {
          onUnassignVMs(user.id)
        } else {
          error('No VMs assigned to this user')
        }
      },
      show: (user) => user.assignedVMsCount > 0,
      className: 'text-warning-600'
    },
    {
      label: 'Delete User',
      icon: Trash2,
      onClick: onDelete,
      className: 'text-error-600',
      confirm: true,
      confirmMessage: (user) => {
        const warnings = []
        if (user.activeSessions?.length > 0) warnings.push('- User has active sessions that will be terminated')
        if (user.assignedVMsCount > 0) warnings.push('- User has assigned VMs that will be unassigned')
        if (user.tempConnections?.length > 0) warnings.push('- User has temporary connections that will be closed')
        
        return `Are you sure you want to delete this user? This action cannot be undone.
${warnings.length > 0 ? '\nWarnings:\n' + warnings.join('\n') : ''}`
      }
    }
  ]

  return (
    <DataTable
      columns={columns}
      data={users}
      loading={loading}
      selectedRows={selectedRows}
      onRowSelect={onRowSelect}
      onSelectAll={onSelectAll}
      isAllSelected={isAllSelected}
      pagination={pagination}
      onPageChange={onPageChange}
      actions={actions}
      emptyMessage="No users found"
      emptyDescription="Create your first user to get started"
    />
  )
}

export default UserTable
