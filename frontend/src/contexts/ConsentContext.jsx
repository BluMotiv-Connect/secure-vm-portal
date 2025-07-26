import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { apiClient } from '../services/apiClient'

const ConsentContext = createContext()

export const useConsent = () => {
  const context = useContext(ConsentContext)
  if (!context) {
    throw new Error('useConsent must be used within a ConsentProvider')
  }
  return context
}

export const ConsentProvider = ({ children }) => {
  const [consentStatus, setConsentStatus] = useState({
    hasValidConsent: false,
    consentDate: null,
    agreementVersion: null,
    language: null,
    requiresNewConsent: false,
    currentVersion: null
  })
  
  const [agreementContent, setAgreementContent] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Check consent status
  const checkConsentStatus = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await apiClient.get('/consent/status')
      const status = response.data
      
      setConsentStatus({
        hasValidConsent: status.hasValidConsent || false,
        consentDate: status.consentDate,
        agreementVersion: status.agreementVersion,
        language: status.language || 'en',
        requiresNewConsent: status.requiresNewConsent || false,
        currentVersion: status.currentVersion
      })
      
      return status
    } catch (error) {
      console.error('Failed to check consent status:', error)
      
      // Handle different error scenarios
      if (error.response?.status === 401) {
        // User not authenticated - this is expected for some flows
        setConsentStatus({
          hasValidConsent: false,
          consentDate: null,
          agreementVersion: null,
          language: 'en',
          requiresNewConsent: true,
          currentVersion: null
        })
      } else {
        setError(error.response?.data?.message || 'Failed to check consent status')
      }
      
      return null
    } finally {
      setIsLoading(false)
      setIsInitialized(true)
    }
  }, [])

  // Get agreement content
  const getAgreementContent = useCallback(async (version = null, language = 'en') => {
    try {
      setIsLoading(true)
      setError(null)
      
      const url = version ? `/consent/agreement/${version}` : '/consent/agreement'
      const response = await apiClient.get(url, {
        params: { language }
      })
      
      const content = response.data
      setAgreementContent(content)
      
      return content
    } catch (error) {
      console.error('Failed to get agreement content:', error)
      setError(error.response?.data?.message || 'Failed to load agreement content')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Record user consent
  const recordConsent = useCallback(async (agreementVersion, language = 'en') => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await apiClient.post('/consent/record', {
        agreementVersion,
        language
      })
      
      // Update consent status after successful recording
      await checkConsentStatus()
      
      return response.data
    } catch (error) {
      console.error('Failed to record consent:', error)
      
      const errorMessage = error.response?.data?.message || 'Failed to record consent'
      setError(errorMessage)
      
      // Handle specific error cases
      if (error.response?.data?.code === 'CONSENT_003') {
        // User already consented - refresh status
        await checkConsentStatus()
      }
      
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [checkConsentStatus])

  // Withdraw consent
  const withdrawConsent = useCallback(async (reason = '') => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await apiClient.post('/consent/withdraw', {
        reason
      })
      
      // Update consent status after withdrawal
      await checkConsentStatus()
      
      return response.data
    } catch (error) {
      console.error('Failed to withdraw consent:', error)
      
      const errorMessage = error.response?.data?.message || 'Failed to withdraw consent'
      setError(errorMessage)
      
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [checkConsentStatus])

  // Get consent history
  const getConsentHistory = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await apiClient.get('/consent/history')
      return response.data
    } catch (error) {
      console.error('Failed to get consent history:', error)
      setError(error.response?.data?.message || 'Failed to load consent history')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initialize consent context
  useEffect(() => {
    const initializeConsent = async () => {
      // Only check consent status if we have authentication context
      // This prevents unnecessary API calls during app initialization
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('authToken')
        if (token) {
          await checkConsentStatus()
        } else {
          setIsInitialized(true)
        }
      }
    }

    initializeConsent()
  }, [checkConsentStatus])

  // Auto-refresh consent status periodically (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      if (consentStatus.hasValidConsent) {
        checkConsentStatus()
      }
    }, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(interval)
  }, [consentStatus.hasValidConsent, checkConsentStatus])

  // Helper function to determine if consent is required for current user
  const isConsentRequired = useCallback(() => {
    // Check if consent system is enabled
    const consentRequired = process.env.REACT_APP_CONSENT_REQUIRED === 'true'
    if (!consentRequired) return false

    // If user has valid consent, no action needed
    if (consentStatus.hasValidConsent) return false

    // If user needs new consent or has never consented
    return consentStatus.requiresNewConsent || !consentStatus.consentDate
  }, [consentStatus])

  // Helper function to get consent requirement reason
  const getConsentRequirementReason = useCallback(() => {
    if (!isConsentRequired()) return null

    if (!consentStatus.consentDate) {
      return 'initial' // First time consent
    }
    
    if (consentStatus.requiresNewConsent) {
      return 'updated' // Agreement has been updated
    }
    
    return 'unknown'
  }, [isConsentRequired, consentStatus])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Reset consent state (useful for logout)
  const resetConsentState = useCallback(() => {
    setConsentStatus({
      hasValidConsent: false,
      consentDate: null,
      agreementVersion: null,
      language: null,
      requiresNewConsent: false,
      currentVersion: null
    })
    setAgreementContent(null)
    setError(null)
    setIsInitialized(false)
  }, [])

  const contextValue = {
    // State
    consentStatus,
    agreementContent,
    isLoading,
    error,
    isInitialized,
    
    // Actions
    checkConsentStatus,
    getAgreementContent,
    recordConsent,
    withdrawConsent,
    getConsentHistory,
    
    // Helpers
    isConsentRequired,
    getConsentRequirementReason,
    clearError,
    resetConsentState
  }

  return (
    <ConsentContext.Provider value={contextValue}>
      {children}
    </ConsentContext.Provider>
  )
}

export default ConsentProvider