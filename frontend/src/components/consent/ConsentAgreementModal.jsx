import React, { useState, useEffect, useRef } from 'react'
import { X, ChevronDown, ChevronUp, FileText, Shield, AlertCircle } from 'lucide-react'

const ConsentAgreementModal = ({ 
  isOpen, 
  onConsentChange, 
  onClose, 
  agreementContent,
  isLoading = false,
  error = null
}) => {
  const [hasConsented, setHasConsented] = useState(false)
  const [expandedSections, setExpandedSections] = useState({})
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const scrollContainerRef = useRef(null)
  const modalRef = useRef(null)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setHasConsented(false)
      setHasScrolledToBottom(false)
      setExpandedSections({})
      onConsentChange(false)
    }
  }, [isOpen, onConsentChange])

  // Handle scroll to track if user has read the agreement
  const handleScroll = () => {
    const container = scrollContainerRef.current
    if (!container) return

    const { scrollTop, scrollHeight, clientHeight } = container
    const scrolledToBottom = scrollTop + clientHeight >= scrollHeight - 10 // 10px tolerance

    if (scrolledToBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true)
    }
  }

  // Handle consent checkbox change
  const handleConsentChange = (checked) => {
    setHasConsented(checked)
    onConsentChange(checked)
  }

  // Toggle section expansion
  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }))
  }

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return

      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Focus management for accessibility
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-modal-title"
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <Shield className="h-6 w-6 text-blue-600 mr-3" />
            <h2 id="consent-modal-title" className="text-xl font-semibold text-gray-900">
              {agreementContent?.title || 'User Consent Agreement'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close consent agreement"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Language Selector */}
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-600">
              <FileText className="h-4 w-4 mr-2" />
              <span>Agreement Version: {agreementContent?.version || '1.0.0'}</span>
              <span className="mx-2">•</span>
              <span>Effective Date: {agreementContent?.effectiveDate ? new Date(agreementContent.effectiveDate).toLocaleDateString() : 'Today'}</span>
            </div>
            <div className="flex items-center">
              <label htmlFor="language-select" className="text-sm text-gray-600 mr-2">
                Language:
              </label>
              <select
                id="language-select"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="en">English</option>
                {/* TODO: Add more languages when multi-language support is implemented */}
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading agreement...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Agreement</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <div 
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="h-full overflow-y-auto px-6 py-4"
            >
              {/* Agreement Sections */}
              {agreementContent?.sections?.map((section, index) => (
                <div key={section.id || index} className="mb-6">
                  <button
                    onClick={() => toggleSection(section.id || index)}
                    className="flex items-center justify-between w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-expanded={expandedSections[section.id || index]}
                  >
                    <h3 className="text-lg font-medium text-gray-900">
                      {index + 1}. {section.title}
                    </h3>
                    {expandedSections[section.id || index] ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </button>
                  
                  {expandedSections[section.id || index] && (
                    <div className="mt-3 p-4 bg-white border border-gray-200 rounded-lg">
                      <div className="prose prose-sm max-w-none text-gray-700">
                        {section.content.split('\n').map((paragraph, pIndex) => (
                          paragraph.trim() && (
                            <p key={pIndex} className="mb-3 leading-relaxed">
                              {paragraph.trim()}
                            </p>
                          )
                        ))}
                      </div>
                      
                      {/* Render subsections if they exist */}
                      {section.subsections?.map((subsection, subIndex) => (
                        <div key={subIndex} className="mt-4 pl-4 border-l-2 border-blue-200">
                          <h4 className="font-medium text-gray-800 mb-2">{subsection.title}</h4>
                          <div className="text-gray-700 text-sm">
                            {subsection.content.split('\n').map((paragraph, pIndex) => (
                              paragraph.trim() && (
                                <p key={pIndex} className="mb-2 leading-relaxed">
                                  {paragraph.trim()}
                                </p>
                              )
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Acknowledgment Section */}
              {agreementContent?.acknowledgment && (
                <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="text-lg font-medium text-blue-900 mb-4">
                    {agreementContent.acknowledgment.title}
                  </h3>
                  <div className="prose prose-sm max-w-none text-blue-800 mb-4">
                    {agreementContent.acknowledgment.content.split('\n').map((paragraph, index) => (
                      paragraph.trim() && (
                        <p key={index} className="mb-3 leading-relaxed">
                          {paragraph.trim()}
                        </p>
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* Scroll indicator */}
              {!hasScrolledToBottom && (
                <div className="sticky bottom-0 bg-gradient-to-t from-white to-transparent pt-8 pb-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-2">
                      Please scroll down to read the complete agreement
                    </p>
                    <ChevronDown className="h-5 w-5 text-gray-400 mx-auto animate-bounce" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with Consent Checkbox */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex items-start space-x-3 mb-4">
            <input
              type="checkbox"
              id="consent-checkbox"
              checked={hasConsented}
              onChange={(e) => handleConsentChange(e.target.checked)}
              disabled={!hasScrolledToBottom || isLoading || error}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
            />
            <label 
              htmlFor="consent-checkbox" 
              className={`text-sm leading-relaxed ${
                hasScrolledToBottom ? 'text-gray-900' : 'text-gray-500'
              }`}
            >
              {agreementContent?.acknowledgment?.checkbox_text || 
               'I agree to the terms and conditions of the User Consent Agreement.'}
            </label>
          </div>

          {!hasScrolledToBottom && (
            <div className="flex items-center text-sm text-amber-600 mb-4">
              <AlertCircle className="h-4 w-4 mr-2" />
              <span>Please read the complete agreement before providing consent</span>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              disabled={!hasConsented || isLoading}
              className={`px-6 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                hasConsented && !isLoading
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isLoading ? 'Processing...' : 'Continue to Sign In'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConsentAgreementModal