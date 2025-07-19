import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { apiClient } from '../../services/apiClient'
import { 
  Monitor, 
  Plus, 
  Edit, 
  Trash2, 
  ArrowLeft,
  Wifi,
  WifiOff,
  Eye,
  EyeOff,
  UserPlus,
  UserMinus,
  Users,
  X,
  Cloud,
  Server,
  Globe
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import VMAssignmentManager from '../../components/admin/VMAssignmentManager'

const VirtualMachines = () => {
  const { user: currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const [vms, setVms] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddVM, setShowAddVM] = useState(false)
  const [editingVM, setEditingVM] = useState(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedVM, setSelectedVM] = useState(null)
  const [showPassword, setShowPassword] = useState({})
  const [showAssignmentManager, setShowAssignmentManager] = useState(false)
  const [vmForAssignment, setVmForAssignment] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    ip_address: '',
    username: '',
    password: '',
    os_type: 'windows',
    os_version: '',
    status: 'offline',
    region: '',
    instance_id: '',
    tags: '{}',
    cloud_provider: 'azure',
    connection_method: 'bastion',
    subscription_id: '',
    resource_group: '',
    vm_name: '',
    zone: '',
    project_id: '',
    account_id: '',
    key_pair_name: '',
    security_group_id: ''
  })

  useEffect(() => {
    fetchVMs()
    fetchUsers()
  }, [])

  const fetchVMs = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await apiClient.get('/vms')
      setVms(response.data.vms || [])
    } catch (error) {
      console.error('Fetch VMs error:', error)
      setError('Failed to load virtual machines')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get('/users')
      const employeeUsers = response.data.users.filter(user => user.role === 'employee' && user.is_active)
      setUsers(employeeUsers)
    } catch (error) {
      console.error('Fetch users error:', error)
    }
  }

  const handleAssignVM = async (vmId, userId) => {
    try {
      await apiClient.post(`/vms/${vmId}/assign`, { user_id: userId })
      fetchVMs()
      setShowAssignModal(false)
      setSelectedVM(null)
      setError('')
    } catch (error) {
      console.error('Assign VM error:', error)
      setError(error.response?.data?.error || 'Failed to assign VM')
    }
  }

  const handleUnassignVM = async (vmId) => {
    if (!confirm('Are you sure you want to unassign this VM?')) return
    
    try {
      await apiClient.delete(`/vms/${vmId}/assign`)
      fetchVMs()
      setError('')
    } catch (error) {
      console.error('Unassign VM error:', error)
      setError(error.response?.data?.error || 'Failed to unassign VM')
    }
  }

  const handleOpenAssignmentManager = (vm) => {
    setVmForAssignment(vm)
    setShowAssignmentManager(true)
  }

  const handleCloseAssignmentManager = () => {
    setShowAssignmentManager(false)
    setVmForAssignment(null)
  }

  const handleAssignmentUpdate = () => {
    fetchVMs() // Refresh the VM list to show updated assignments
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setError('')
      
      const submitData = {
        ...formData,
        tags: formData.tags ? JSON.parse(formData.tags) : {}
      }

      if (editingVM) {
        await apiClient.put(`/vms/${editingVM.id}`, submitData)
      } else {
        await apiClient.post('/vms', submitData)
      }
      
      setShowAddVM(false)
      setEditingVM(null)
      resetForm()
      fetchVMs()
    } catch (error) {
      console.error('Save VM error:', error)
      setError(error.response?.data?.error || 'Failed to save virtual machine')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      ip_address: '',
      username: '',
      password: '',
      os_type: 'windows',
      os_version: '',
      status: 'offline',
      region: '',
      instance_id: '',
      tags: '{}',
      cloud_provider: 'azure',
      connection_method: 'bastion',
      subscription_id: '',
      resource_group: '',
      vm_name: '',
      zone: '',
      project_id: '',
      account_id: '',
      key_pair_name: '',
      security_group_id: ''
    })
  }

  const handleEdit = (vm) => {
    setEditingVM(vm)
    setFormData({
      name: vm.name,
      description: vm.description || '',
      ip_address: vm.ip_address,
      username: vm.username,
      password: vm.password,
      os_type: vm.os_type,
      os_version: vm.os_version || '',
      status: vm.status,
      region: vm.region || '',
      instance_id: vm.instance_id || '',
      tags: JSON.stringify(vm.tags || {}, null, 2),
      cloud_provider: vm.cloud_provider || 'azure',
      connection_method: vm.connection_method || 'bastion',
      subscription_id: vm.subscription_id || '',
      resource_group: vm.resource_group || '',
      vm_name: vm.vm_name || '',
      zone: vm.zone || '',
      project_id: vm.project_id || '',
      account_id: vm.account_id || '',
      key_pair_name: vm.key_pair_name || '',
      security_group_id: vm.security_group_id || ''
    })
    setShowAddVM(true)
  }

  const handleDelete = async (vmId) => {
    if (!confirm('Are you sure you want to delete this VM?')) return
    
    try {
      await apiClient.delete(`/vms/${vmId}`)
      fetchVMs()
    } catch (error) {
      console.error('Delete VM error:', error)
      setError(error.response?.data?.error || 'Failed to delete VM')
    }
  }

  const togglePasswordVisibility = (vmId) => {
    setShowPassword(prev => ({
      ...prev,
      [vmId]: !prev[vmId]
    }))
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online':
        return <Wifi className="h-4 w-4 text-green-600" />
      case 'offline':
        return <WifiOff className="h-4 w-4 text-gray-400" />
      case 'maintenance':
        return <WifiOff className="h-4 w-4 text-yellow-600" />
      default:
        return <WifiOff className="h-4 w-4 text-red-600" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-green-100 text-green-800'
      case 'offline': return 'bg-gray-100 text-gray-800'
      case 'maintenance': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-red-100 text-red-800'
    }
  }

  const getCloudIcon = (cloudProvider) => {
    switch (cloudProvider) {
      case 'azure': return <Cloud className="h-4 w-4 text-blue-600" />
      case 'aws': return <Server className="h-4 w-4 text-orange-600" />
      case 'gcp': return <Globe className="h-4 w-4 text-green-600" />
      default: return <Monitor className="h-4 w-4 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center text-gray-600 hover:text-gray-800 mr-4"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Dashboard
              </button>
              <Monitor className="h-8 w-8 text-green-600 mr-3" />
              <h1 className="text-xl font-semibold">Virtual Machine Management</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {currentUser?.name}</span>
              <button
                onClick={logout}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Virtual Machines</h2>
              <p className="text-gray-600">Manage virtual machines, credentials, and user assignments across multiple cloud providers</p>
            </div>
            <button
              onClick={() => {
                setShowAddVM(true)
                setEditingVM(null)
                resetForm()
              }}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add VM
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Add/Edit VM Form */}
          {showAddVM && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-medium mb-4">
                {editingVM ? 'Edit Virtual Machine' : 'Add New Virtual Machine'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic VM Information */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Basic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        VM Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="DEV-WIN-01"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        IP Address *
                      </label>
                      <input
                        type="text"
                        value={formData.ip_address}
                        onChange={(e) => setFormData({...formData, ip_address: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="192.168.1.100"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Username *
                      </label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="administrator"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password *
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="SecurePassword123!"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        OS Type *
                      </label>
                      <select
                        value={formData.os_type}
                        onChange={(e) => setFormData({...formData, os_type: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="windows">Windows</option>
                        <option value="linux">Linux</option>
                        <option value="macos">macOS</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        OS Version
                      </label>
                      <input
                        type="text"
                        value={formData.os_version}
                        onChange={(e) => setFormData({...formData, os_version: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Windows Server 2019"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="online">Online</option>
                        <option value="offline">Offline</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="error">Error</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Region
                      </label>
                      <input
                        type="text"
                        value={formData.region}
                        onChange={(e) => setFormData({...formData, region: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="us-east-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Cloud Provider Configuration */}
                <div className="border-t pt-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Cloud Provider Configuration</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cloud Provider *
                      </label>
                      <select
                        value={formData.cloud_provider}
                        onChange={(e) => setFormData({...formData, cloud_provider: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                        required
                      >
                        <option value="azure">Microsoft Azure</option>
                        <option value="aws">Amazon AWS</option>
                        <option value="gcp">Google Cloud Platform</option>
                        <option value="other">Other/On-Premises</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Connection Method
                      </label>
                      <select
                        value={formData.connection_method}
                        onChange={(e) => setFormData({...formData, connection_method: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="bastion">Cloud Bastion (Recommended)</option>
                        <option value="direct">Direct RDP/SSH</option>
                        <option value="vpn">VPN Gateway</option>
                      </select>
                    </div>
                  </div>

                  {/* Azure-specific fields */}
                  {formData.cloud_provider === 'azure' && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h5 className="text-sm font-medium text-blue-800 mb-3">Azure Configuration</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Subscription ID *
                          </label>
                          <input
                            type="text"
                            value={formData.subscription_id}
                            onChange={(e) => setFormData({...formData, subscription_id: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="12345678-1234-1234-1234-123456789012"
                            required
                          />
                          <p className="text-xs text-gray-600 mt-1">Find in Azure Portal → Subscriptions</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Resource Group *
                          </label>
                          <input
                            type="text"
                            value={formData.resource_group}
                            onChange={(e) => setFormData({...formData, resource_group: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="my-resource-group"
                            required
                          />
                          <p className="text-xs text-gray-600 mt-1">Resource group containing the VM</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            VM Name (Azure) *
                          </label>
                          <input
                            type="text"
                            value={formData.vm_name}
                            onChange={(e) => setFormData({...formData, vm_name: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="my-vm-name"
                            required
                          />
                          <p className="text-xs text-gray-600 mt-1">Exact VM name in Azure</p>
                        </div>
                      </div>
                      {formData.connection_method === 'bastion' && (
                        <div className="mt-3 p-3 bg-blue-100 rounded border-l-4 border-blue-400">
                          <p className="text-sm text-blue-800">
                            <strong>Azure Bastion Requirements:</strong>
                            <br />• Azure Bastion must be deployed in the same virtual network
                            <br />• VM must have a private IP address
                            <br />• Network security groups must allow Bastion access
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* AWS-specific fields */}
                  {formData.cloud_provider === 'aws' && (
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <h5 className="text-sm font-medium text-orange-800 mb-3">AWS Configuration</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Instance ID *
                          </label>
                          <input
                            type="text"
                            value={formData.instance_id}
                            onChange={(e) => setFormData({...formData, instance_id: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="i-1234567890abcdef0"
                            required
                          />
                          <p className="text-xs text-gray-600 mt-1">Find in EC2 Console → Instances</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            AWS Account ID
                          </label>
                          <input
                            type="text"
                            value={formData.account_id}
                            onChange={(e) => setFormData({...formData, account_id: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="123456789012"
                          />
                          <p className="text-xs text-gray-600 mt-1">12-digit AWS account number</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Key Pair Name
                          </label>
                          <input
                            type="text"
                            value={formData.key_pair_name}
                            onChange={(e) => setFormData({...formData, key_pair_name: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="my-key-pair"
                          />
                          <p className="text-xs text-gray-600 mt-1">For SSH access to Linux instances</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Security Group ID
                          </label>
                          <input
                            type="text"
                            value={formData.security_group_id}
                            onChange={(e) => setFormData({...formData, security_group_id: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="sg-1234567890abcdef0"
                          />
                          <p className="text-xs text-gray-600 mt-1">Security group for access control</p>
                        </div>
                      </div>
                      {formData.connection_method === 'bastion' && (
                        <div className="mt-3 p-3 bg-orange-100 rounded border-l-4 border-orange-400">
                          <p className="text-sm text-orange-800">
                            <strong>AWS Session Manager Requirements:</strong>
                            <br />• SSM Agent must be installed on the instance
                            <br />• Instance must have appropriate IAM role
                            <br />• VPC endpoints configured (if in private subnet)
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* GCP-specific fields */}
                  {formData.cloud_provider === 'gcp' && (
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h5 className="text-sm font-medium text-green-800 mb-3">Google Cloud Configuration</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Project ID *
                          </label>
                          <input
                            type="text"
                            value={formData.project_id}
                            onChange={(e) => setFormData({...formData, project_id: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                            placeholder="my-project-id"
                            required
                          />
                          <p className="text-xs text-gray-600 mt-1">Find in GCP Console → Project Info</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Zone *
                          </label>
                          <input
                            type="text"
                            value={formData.zone}
                            onChange={(e) => setFormData({...formData, zone: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                            placeholder="us-central1-a"
                            required
                          />
                          <p className="text-xs text-gray-600 mt-1">Zone where the instance is located</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Instance Name *
                          </label>
                          <input
                            type="text"
                            value={formData.vm_name}
                            onChange={(e) => setFormData({...formData, vm_name: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                            placeholder="my-instance-name"
                            required
                          />
                          <p className="text-xs text-gray-600 mt-1">Exact instance name in GCP</p>
                        </div>
                      </div>
                      {formData.connection_method === 'bastion' && (
                        <div className="mt-3 p-3 bg-green-100 rounded border-l-4 border-green-400">
                          <p className="text-sm text-green-800">
                            <strong>GCP Identity-Aware Proxy Requirements:</strong>
                            <br />• IAP must be enabled for the instance
                            <br />• Firewall rules must allow IAP access
                            <br />• Service account with appropriate permissions
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Other/On-premises fields */}
                  {formData.cloud_provider === 'other' && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h5 className="text-sm font-medium text-gray-800 mb-3">On-Premises/Other Configuration</h5>
                      <div className="mt-3 p-3 bg-gray-100 rounded border-l-4 border-gray-400">
                        <p className="text-sm text-gray-800">
                          <strong>Direct Connection:</strong>
                          <br />• Uses IP address, username, and password above
                          <br />• Ensure firewall allows RDP (3389) or SSH (22) access
                          <br />• VPN connection may be required for security
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                    rows={3}
                    placeholder="Brief description of the VM"
                  />
                </div>
                
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    {editingVM ? 'Update VM' : 'Add VM'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddVM(false)
                      setEditingVM(null)
                    }}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* VMs Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Virtual Machine
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cloud Provider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Credentials
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    OS Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {vms.map((vm) => (
                  <tr key={vm.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Monitor className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{vm.name}</div>
                          <div className="text-sm text-gray-500">{vm.ip_address}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getCloudIcon(vm.cloud_provider)}
                        <div className="ml-2">
                          <div className="text-sm font-medium text-gray-900 capitalize">
                            {vm.cloud_provider || 'Other'}
                          </div>
                          <div className="text-sm text-gray-500 capitalize">
                            {vm.connection_method || 'Direct'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div>User: <span className="font-mono">{vm.username}</span></div>
                        <div className="flex items-center">
                          Pass: 
                          <span className="font-mono ml-1">
                            {showPassword[vm.id] ? vm.password : '••••••••'}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(vm.id)}
                            className="ml-2 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword[vm.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{vm.os_type}</div>
                      <div className="text-sm text-gray-500">{vm.os_version}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(vm.status)}`}>
                        {getStatusIcon(vm.status)}
                        <span className="ml-1">{vm.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {vm.assigned_user_name ? (
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{vm.assigned_user_name}</div>
                          <div className="text-gray-500">{vm.assigned_user_email}</div>
                          <div className="text-xs text-blue-600 mt-1">
                            + others (click Users icon to manage)
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEdit(vm)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit VM"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleOpenAssignmentManager(vm)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Manage VM Assignments"
                      >
                        <Users className="h-4 w-4" />
                      </button>
                      {vm.assigned_user_name ? (
                        <button
                          onClick={() => handleUnassignVM(vm.id)}
                          className="text-orange-600 hover:text-orange-900"
                          title="Unassign All Users"
                        >
                          <UserMinus className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedVM(vm)
                            setShowAssignModal(true)
                          }}
                          className="text-green-600 hover:text-green-900"
                          title="Quick Assign VM"
                        >
                          <UserPlus className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(vm.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete VM"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {vms.length === 0 && !loading && (
            <div className="text-center py-12">
              <Monitor className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Virtual Machines Found</h3>
              <p className="text-gray-600">Add your first VM to get started with multi-cloud management.</p>
            </div>
          )}
        </div>
      </main>

      {/* Assignment Modal */}
      {showAssignModal && selectedVM && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Assign VM: {selectedVM.name}
              </h3>
              <button
                onClick={() => {
                  setShowAssignModal(false)
                  setSelectedVM(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Select an employee to assign this virtual machine to:
              </p>

              {users.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No employees available for assignment</p>
                  <p className="text-sm text-gray-500 mt-2">Add employees in User Management first</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => handleAssignVM(selectedVM.id, user.id)}
                      className="border rounded-lg p-3 cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                        <div className="text-xs text-gray-400">
                          Click to assign
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t p-6 flex justify-end">
              <button
                onClick={() => {
                  setShowAssignModal(false)
                  setSelectedVM(null)
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* VM Assignment Manager Modal */}
      {showAssignmentManager && vmForAssignment && (
        <VMAssignmentManager
          vm={vmForAssignment}
          onClose={handleCloseAssignmentManager}
          onUpdate={handleAssignmentUpdate}
        />
      )}
    </div>
  )
}

export default VirtualMachines