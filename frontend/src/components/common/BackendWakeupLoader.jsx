import React, { useState, useEffect } from 'react'
import { RefreshCw, Wifi, WifiOff } from 'lucide-react'
import keepAliveService from '../../utils/keepAlive'

const BackendWakeupLoader = ({ children }) => {
  const [isBackendAwake, setIsBackendAwake] = useState(true)
  const [isWakingUp, setIsWakingUp] = useState(false)
  const [lastPingTime, setLastPingTime] = useState(null)

  useEffect(() => {
    // Check backend status periodically
    const checkBackendStatus = () => {
      const status = keepAliveService.getStatus()
      setLastPingTime(new Date(status.lastPing))
      
      // If too many failures, show wake-up UI
      if (status.failureCount >= 3) {
        setIsBackendAwake(false)
      } else {
        setIsBackendAwake(true)
      }
    }

    // Check status every 30 seconds
    const statusInterval = setInterval(checkBackendStatus, 30000)
    
    // Initial check
    checkBackendStatus()

    return () => clearInterval(statusInterval)
  }, [])

  const handleManualWakeup = async () => {
    setIsWakingUp(true)
    try {
      await keepAliveService.wakeUp()
      setIsBackendAwake(true)
      console.log('[BackendWakeup] ✅ Manual wake-up successful')
    } catch (error) {
      console.error('[BackendWakeup] ❌ Manual wake-up failed:', error)
    } finally {
      setIsWakingUp(false)
    }
  }

  // Show wake-up UI if backend is sleeping
  if (!isBackendAwake) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <WifiOff className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Backend is Sleeping
            </h2>
            <p className="text-gray-600">
              The server has gone to sleep due to inactivity. This is normal on free hosting tiers.
            </p>
          </div>

          <button
            onClick={handleManualWakeup}
            disabled={isWakingUp}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
          >
            {isWakingUp ? (
              <>
                <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                Waking up server...
              </>
            ) : (
              <>
                <Wifi className="h-5 w-5 mr-2" />
                Wake up server
              </>
            )}
          </button>

          <div className="mt-4 text-sm text-gray-500">
            <p>This may take 10-30 seconds</p>
            {lastPingTime && (
              <p>Last successful ping: {lastPingTime.toLocaleTimeString()}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Show normal app if backend is awake
  return children
}

export default BackendWakeupLoader