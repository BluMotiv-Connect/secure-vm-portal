import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import Button from '@components/ui/Button'
import Input from '@components/ui/Input'
import Select from '@components/ui/Select'
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/Card'
import { Key, Lock, Monitor, AlertTriangle, CheckCircle, Eye, EyeOff } from 'lucide-react'

const VMCredentialsForm = ({ vm, credentials, onSubmit, onCancel, onTest }) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showPrivateKey, setShowPrivateKey] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm({
    defaultValues: {
      username: credentials?.username || '',
      password: '',
      privateKey: '',
      connectionType: credentials?.connectionType || (vm?.osType === 'windows' ? 'rdp' : 'ssh'),
      connectionPort: credentials?.connectionPort || (vm?.osType === 'windows' ? '3389' : '22')
    }
  })

  const connectionType = watch('connectionType')

  useEffect(() => {
    if (credentials) {
      reset({
        username: credentials.username || '',
        password: '',
        privateKey: '',
        connectionType: credentials.connectionType || (vm?.osType === 'windows' ? 'rdp' : 'ssh'),
        connectionPort: credentials.connectionPort || (vm?.osType === 'windows' ? '3389' : '22')
      })
    }
  }, [credentials, vm, reset])

  useEffect(() => {
    // Auto-set default port based on connection type
    if (connectionType === 'rdp') {
      setValue('connectionPort', '3389')
    } else if (connectionType === 'ssh') {
      setValue('connectionPort', '22')
    }
  }, [connectionType, setValue])

  const handleFormSubmit = async (data) => {
    setIsSubmitting(true)
    setTestResult(null)

    try {
      // Ensure password is provided for RDP connections
      if (data.connectionType === 'rdp' && !data.password && !credentials) {
        throw new Error('Password is required for RDP connections')
      }

      // Only include password/privateKey if they are provided and not empty
      const credentialsData = {
        vmId: vm.id,
        username: data.username,
        connectionType: data.connectionType,
        connectionPort: data.connectionPort,
        ...(data.password ? { password: data.password } : {}),
        ...(data.privateKey ? { privateKey: data.privateKey } : {})
      }

      await onSubmit(credentialsData)
    } catch (error) {
      console.error('Failed to save credentials:', error)
      setTestResult({
        success: false,
        message: error.message || 'Failed to save credentials'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTestConnection = async () => {
    setIsTesting(true)
    setTestResult(null)

    try {
      const formData = watch()
      const result = await onTest({
        vmId: vm.id,
        ...formData
      })
      setTestResult(result)
    } catch (error) {
      setTestResult({
        success: false,
        message: error.message || 'Connection test failed'
      })
    } finally {
      setIsTesting(false)
    }
  }

  const getOSIcon = (osType) => {
    switch (osType) {
      case 'windows':
        return '🪟'
      case 'linux':
        return '🐧'
      case 'macos':
        return '🍎'
      default:
        return '💻'
    }
  }

  return (
    <div className="space-y-6">
      {/* VM Information */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-primary-100 rounded-lg">
              <Monitor className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 flex items-center space-x-2">
                <span>{vm.name}</span>
                <span className="text-lg">{getOSIcon(vm.osType)}</span>
              </h3>
              <p className="text-sm text-gray-600">
                {vm.ipAddress} • {vm.osType} {vm.osVersion}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credentials Form */}
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Connection Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Key className="h-5 w-5 mr-2" />
              Connection Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Connection Type"
                required
                {...register('connectionType', {
                  required: 'Connection type is required'
                })}
                error={errors.connectionType?.message}
              >
                <option value="rdp">RDP (Remote Desktop)</option>
                <option value="ssh">SSH (Secure Shell)</option>
              </Select>

              <Input
                label="Connection Port"
                type="number"
                required
                {...register('connectionPort', {
                  required: 'Port is required',
                  min: { value: 1, message: 'Port must be between 1 and 65535' },
                  max: { value: 65535, message: 'Port must be between 1 and 65535' }
                })}
                error={errors.connectionPort?.message}
                placeholder="3389"
              />
            </div>

            <Input
              label="Username"
              required
              {...register('username', {
                required: 'Username is required',
                minLength: { value: 1, message: 'Username cannot be empty' }
              })}
              error={errors.username?.message}
              placeholder={
                connectionType === 'rdp' 
                  ? 'Administrator, vmadmin, etc.'
                  : 'ubuntu, root, vmuser, etc.'
              }
            />
          </CardContent>
        </Card>

        {/* Authentication */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lock className="h-5 w-5 mr-2" />
              Authentication
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {connectionType === 'rdp' ? (
              // RDP Password Authentication
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', {
                    required: connectionType === 'rdp' && !credentials ? 'Password is required for RDP connections' : false,
                    validate: value => {
                      if (connectionType === 'rdp' && !value && !credentials) {
                        return 'Password is required for RDP connections'
                      }
                      return true
                    }
                  })}
                  error={errors.password?.message}
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            ) : (
              // SSH Authentication Options
              <>
                <div className="relative">
                  <Input
                    label="Password (Optional)"
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    error={errors.password?.message}
                    placeholder={credentials ? 'Leave blank to keep existing' : 'SSH password (if using password auth)'}
                    helperText="For password-based SSH authentication"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Private Key (Recommended)
                    <button
                      type="button"
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                      className="ml-2 text-gray-400 hover:text-gray-600"
                    >
                      {showPrivateKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                  </label>
                  <textarea
                    {...register('privateKey')}
                    rows={showPrivateKey ? 8 : 4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-xs"
                    placeholder={
                      credentials 
                        ? 'Leave blank to keep existing private key'
                        : `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAFwAAAAdzc2gtcn...
[Paste your full SSH private key here]
-----END OPENSSH PRIVATE KEY-----`
                    }
                    style={{ 
                      filter: showPrivateKey ? 'none' : 'blur(2px)',
                      transition: 'filter 0.2s'
                    }}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    For key-based SSH authentication (more secure)
                  </p>
                </div>
              </>
            )}

            {credentials && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  <CheckCircle className="h-4 w-4 inline mr-1" />
                  Credentials exist for this VM. Leave fields blank to keep existing values.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Results */}
        {testResult && (
          <Card>
            <CardContent className="p-4">
              <div className={`flex items-center space-x-3 ${
                testResult.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {testResult.success ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <AlertTriangle className="h-5 w-5" />
                )}
                <div>
                  <p className="font-medium">
                    {testResult.success ? 'Connection Test Successful' : 'Connection Test Failed'}
                  </p>
                  <p className="text-sm">{testResult.message}</p>
                  {testResult.responseTime && (
                    <p className="text-xs">Response time: {testResult.responseTime}ms</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security Notice */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <Lock className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Security Information</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• All credentials are encrypted and stored securely</li>
                  <li>• Users never see or have access to VM credentials</li>
                  <li>• Credentials are automatically injected during connections</li>
                  <li>• Regular credential rotation is recommended for security</li>
                  <li>• All credential access is logged for audit purposes</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={handleTestConnection}
            loading={isTesting}
            disabled={isTesting || isSubmitting}
          >
            <Monitor className="h-4 w-4 mr-2" />
            Test Connection
          </Button>

          <div className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              <Key className="h-4 w-4 mr-2" />
              {credentials ? 'Update Credentials' : 'Save Credentials'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default VMCredentialsForm 