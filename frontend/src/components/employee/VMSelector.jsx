import React, { useState, useEffect } from 'react'
import { apiClient } from '../../services/apiClient'
import { Monitor, Play, X, Wifi, WifiOff, ExternalLink, Info, Cloud, Server, Globe, AlertCircle } from 'lucide-react'

const VMSelector = ({ task, onWorkStart, onClose }) => {
  const [vms, setVms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedVM, setSelectedVM] = useState(null)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    fetchAssignedVMs()
  }, [])

  const fetchAssignedVMs = async () => {
    try {
      const response = await apiClient.get('/work-sessions/assigned-vms')
      setVms(response.data.vms)
    } catch (error) {
      setError('Failed to load assigned VMs')
      console.error('Fetch VMs error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartWork = async () => {
    if (!selectedVM) return

    try {
      setStarting(true)
      const response = await apiClient.post('/work-sessions/start-vm-session', {
        task_id: task.id,
        vm_id: selectedVM.id
      })

      const { connectionUrl, connectionType, instructions, vmName } = response.data

      // Create instruction modal
      const modal = document.createElement('div')
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
      modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-lg mx-4">
          <div class="flex items-center mb-4">
            <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
              ${getCloudIcon(selectedVM.cloud_provider)}
            </div>
            <div>
              <h3 class="text-lg font-semibold">VM Connection Started</h3>
              <p class="text-sm text-gray-600">${vmName} • ${selectedVM.cloud_provider?.toUpperCase()}</p>
            </div>
          </div>
          <div class="mb-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
            <p class="text-sm text-blue-800">${instructions}</p>
          </div>
          <div class="flex space-x-3">
            <button onclick="
              if ('${connectionUrl}'.includes('/download/rdp/')) {
                // For RDP files, trigger download
                const link = document.createElement('a');
                link.href = '${connectionUrl}';
                link.download = 'vm-connection.rdp';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              } else {
                // For other connections, open in new window
                window.open('${connectionUrl}', '_blank', 'width=1400,height=900');
              }
              document.body.removeChild(this.closest('.fixed'));
            " 
                    class="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center justify-center">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
              </svg>
              ${connectionUrl.includes('/download/rdp/') ? 'Download RDP File' : 'Open ' + vmName}
            </button>
            <button onclick="document.body.removeChild(this.closest('.fixed'));" 
                    class="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400">
              Close
            </button>
          </div>
        </div>
      `
      document.body.appendChild(modal)
      
      onWorkStart(response.data.session)
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to start work session')
    } finally {
      setStarting(false)
    }
  }

  const getCloudIcon = (cloudProvider) => {
    const icons = {
      azure: '<svg class="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
      aws: '<svg class="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
      gcp: '<svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
      other: '<svg class="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>'
    }
    return icons[cloudProvider] || icons.other
  }

  const getCloudIconComponent = (cloudProvider) => {
    switch (cloudProvider) {
      case 'azure': return <Cloud className="h-5 w-5 text-blue-600" />
      case 'aws': return <Server className="h-5 w-5 text-orange-600" />
      case 'gcp': return <Globe className="h-5 w-5 text-green-600" />
      default: return <Monitor className="h-5 w-5 text-gray-600" />
    }
  }

  const getConnectionInstructions = (vm) => {
    const instructions = {
      azure: {
        bastion: 'Azure Bastion will open in your browser. You\'ll be authenticated automatically through your Azure AD account. Click "Connect" and choose RDP for Windows or SSH for Linux.',
        direct: 'An RDP file will be downloaded. Double-click to open and connect to your Azure VM.',
        vpn: 'Ensure you\'re connected to the corporate VPN, then use the RDP file to connect.'
      },
      aws: {
        bastion: 'AWS Session Manager will open in your browser. Find your instance in the list and click "Start session" to connect securely.',
        direct: 'AWS connection details will be provided. Use your preferred SSH/RDP client to connect.',
        vpn: 'Connect through AWS VPN Gateway using the provided credentials.'
      },
      gcp: {
        bastion: 'GCP Console will open in your browser. Click the "SSH" button to connect through Identity-Aware Proxy.',
        direct: 'GCP connection details will be provided. Use gcloud CLI or SSH client to connect.',
        vpn: 'Connect through GCP VPN using the cloud shell or local SSH client.'
      },
      other: {
        bastion: 'Will connect through a secure proxy server.',
        direct: 'An RDP file with embedded credentials will be downloaded.',
        vpn: 'Connect through your organization\'s VPN gateway.'
      }
    }
    
    return instructions[vm.cloud_provider]?.[vm.connection_method] || 'Will establish a secure connection to the VM.'
  }

  const getPrerequisites = (vm) => {
    const prerequisites = {
      azure: {
        bastion: ['Azure Bastion deployed in the same virtual network', 'VM has private IP address', 'Network security groups allow Bastion access'],
        direct: ['VM has public IP or VPN access', 'RDP (3389) or SSH (22) port open', 'Windows: RDP enabled, Linux: SSH service running'],
        vpn: ['Corporate VPN connection active', 'Network routes configured', 'Firewall rules allow access']
      },
      aws: {
        bastion: ['SSM Agent installed on instance', 'Instance has appropriate IAM role', 'VPC endpoints configured (if private subnet)'],
        direct: ['Security group allows RDP/SSH access', 'Instance has public IP or VPN access', 'Key pair available for SSH'],
        vpn: ['AWS VPN Gateway configured', 'Route tables updated', 'Security groups allow VPN access']
      },
      gcp: {
        bastion: ['Identity-Aware Proxy enabled', 'Firewall rules allow IAP access', 'Service account with appropriate permissions'],
        direct: ['Firewall rules allow SSH/RDP', 'Instance has external IP or VPN access', 'SSH keys configured'],
        vpn: ['Cloud VPN tunnel established', 'Routes configured', 'Firewall rules allow access']
      },
      other: {
        bastion: ['Proxy server accessible', 'Authentication configured', 'Network connectivity established'],
        direct: ['Direct network access available', 'Firewall allows RDP/SSH', 'Credentials configured'],
        vpn: ['VPN connection established', 'Network routes configured', 'Access permissions granted']
      }
    }
    
    return prerequisites[vm.cloud_provider]?.[vm.connection_method] || []
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Select Virtual Machine
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
              Choose a virtual machine to start working on this task
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : vms.length === 0 ? (
            <div className="text-center py-8">
              <Monitor className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">No VMs Assigned</h4>
              <p className="text-gray-600">
                You don't have any virtual machines assigned. Please contact your administrator.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {vms.map((vm) => (
                <div
                  key={vm.id}
                  onClick={() => setSelectedVM(vm)}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedVM?.id === vm.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${vm.status !== 'online' ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <Monitor className="h-6 w-6 text-gray-600" />
                        {getCloudIconComponent(vm.cloud_provider)}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{vm.name}</h4>
                        <p className="text-sm text-gray-600">{vm.ip_address}</p>
                        <p className="text-xs text-gray-500">
                          {vm.os_type} • {vm.os_version} • {vm.cloud_provider?.toUpperCase()}
                        </p>
                        <p className="text-xs text-blue-600 capitalize">
                          Connection: {vm.connection_method}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                        vm.status === 'online' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {vm.status === 'online' ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
                        {vm.status}
                      </span>
                      {selectedVM?.id === vm.id && (
                        <div className="w-4 h-4 border-2 border-blue-500 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {vm.description && (
                    <p className="text-sm text-gray-600 mt-2">{vm.description}</p>
                  )}

                  {/* Connection Instructions */}
                  {selectedVM?.id === vm.id && (
                    <div className="mt-4 space-y-3">
                      <div className="p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                        <div className="flex items-start">
                          <Info className="h-4 w-4 text-blue-600 mt-0.5 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-blue-800">Connection Instructions:</p>
                            <p className="text-sm text-blue-700 mt-1">
                              {getConnectionInstructions(vm)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Prerequisites */}
                      {getPrerequisites(vm).length > 0 && (
                        <div className="p-3 bg-yellow-50 rounded border-l-4 border-yellow-400">
                          <div className="flex items-start">
                            <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 mr-2" />
                            <div>
                              <p className="text-sm font-medium text-yellow-800">Prerequisites:</p>
                              <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                                {getPrerequisites(vm).map((prereq, index) => (
                                  <li key={index} className="flex items-start">
                                    <span className="text-yellow-600 mr-2">•</span>
                                    {prereq}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Cloud-specific additional info */}
                      {vm.cloud_provider === 'azure' && vm.resource_group && (
                        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                          <strong>Azure Details:</strong> {vm.resource_group} / {vm.vm_name}
                        </div>
                      )}
                      {vm.cloud_provider === 'aws' && vm.instance_id && (
                        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                          <strong>AWS Details:</strong> {vm.instance_id} in {vm.region}
                        </div>
                      )}
                      {vm.cloud_provider === 'gcp' && vm.project_id && (
                        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                          <strong>GCP Details:</strong> {vm.project_id} / {vm.zone} / {vm.vm_name}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
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
            disabled={!selectedVM || selectedVM.status !== 'online' || starting}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {starting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Starting...
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4 mr-2" />
                Start Work Session
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default VMSelector
