import React, { useState } from 'react'
import { ChevronDown, ChevronUp, FileText, Calendar, Globe } from 'lucide-react'

const AgreementText = ({ 
  content, 
  language = 'en', 
  version = '1.0.0',
  className = '' 
}) => {
  const [expandedSections, setExpandedSections] = useState({})
  const [expandAll, setExpandAll] = useState(false)

  // Toggle individual section
  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }))
  }

  // Toggle all sections
  const toggleAllSections = () => {
    if (expandAll) {
      setExpandedSections({})
    } else {
      const allExpanded = {}
      content?.sections?.forEach((section, index) => {
        allExpanded[section.id || index] = true
      })
      setExpandedSections(allExpanded)
    }
    setExpandAll(!expandAll)
  }

  // Format text with basic markdown-like formatting
  const formatText = (text) => {
    if (!text) return ''
    
    return text
      .split('\n')
      .map((paragraph, index) => {
        const trimmed = paragraph.trim()
        if (!trimmed) return null
        
        // Handle bullet points
        if (trimmed.startsWith('·') || trimmed.startsWith('•')) {
          return (
            <li key={index} className="ml-4 mb-2 leading-relaxed">
              {trimmed.substring(1).trim()}
            </li>
          )
        }
        
        // Handle numbered lists
        if (/^\d+\./.test(trimmed)) {
          return (
            <li key={index} className="ml-4 mb-2 leading-relaxed list-decimal">
              {trimmed.replace(/^\d+\.\s*/, '')}
            </li>
          )
        }
        
        // Regular paragraphs
        return (
          <p key={index} className="mb-3 leading-relaxed">
            {trimmed}
          </p>
        )
      })
      .filter(Boolean)
  }

  if (!content) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No agreement content available</p>
      </div>
    )
  }

  return (
    <div className={`max-w-none ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {content.title}
        </h1>
        
        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
          <div className="flex items-center">
            <FileText className="h-4 w-4 mr-1" />
            <span>Version {version}</span>
          </div>
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            <span>
              Effective: {content.effectiveDate ? 
                new Date(content.effectiveDate).toLocaleDateString() : 
                'Today'
              }
            </span>
          </div>
          <div className="flex items-center">
            <Globe className="h-4 w-4 mr-1" />
            <span>Language: {language.toUpperCase()}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center py-3 border-t border-b border-gray-200">
          <p className="text-sm text-gray-600">
            {content.sections?.length || 0} sections
          </p>
          <button
            onClick={toggleAllSections}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {expandAll ? 'Collapse All' : 'Expand All'}
          </button>
        </div>
      </div>

      {/* Table of Contents */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Table of Contents</h3>
        <nav className="space-y-1">
          {content.sections?.map((section, index) => (
            <button
              key={section.id || index}
              onClick={() => toggleSection(section.id || index)}
              className="block w-full text-left px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
            >
              {index + 1}. {section.title}
            </button>
          ))}
          {content.acknowledgment && (
            <div className="px-3 py-2 text-sm text-gray-600">
              {content.sections?.length + 1 || 1}. {content.acknowledgment.title}
            </div>
          )}
        </nav>
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {content.sections?.map((section, index) => (
          <section key={section.id || index} className="border border-gray-200 rounded-lg">
            <button
              onClick={() => toggleSection(section.id || index)}
              className="flex items-center justify-between w-full p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-t-lg transition-colors"
              aria-expanded={expandedSections[section.id || index]}
            >
              <h2 className="text-lg font-semibold text-gray-900">
                {index + 1}. {section.title}
              </h2>
              {expandedSections[section.id || index] ? (
                <ChevronUp className="h-5 w-5 text-gray-500 flex-shrink-0" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
              )}
            </button>
            
            {expandedSections[section.id || index] && (
              <div className="p-6 bg-white rounded-b-lg">
                <div className="prose prose-sm max-w-none text-gray-700">
                  {formatText(section.content)}
                </div>
                
                {/* Subsections */}
                {section.subsections?.map((subsection, subIndex) => (
                  <div key={subIndex} className="mt-6 pl-6 border-l-2 border-blue-200">
                    <h3 className="text-base font-medium text-gray-800 mb-3">
                      {subsection.title}
                    </h3>
                    <div className="prose prose-sm max-w-none text-gray-700">
                      {formatText(subsection.content)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      {/* Acknowledgment Section */}
      {content.acknowledgment && (
        <section className="mt-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">
            {content.acknowledgment.title}
          </h2>
          <div className="prose prose-sm max-w-none text-blue-800 mb-4">
            {formatText(content.acknowledgment.content)}
          </div>
          
          {/* Checkbox text preview */}
          <div className="mt-4 p-3 bg-white border border-blue-300 rounded">
            <div className="flex items-start space-x-3">
              <div className="h-4 w-4 border-2 border-blue-400 rounded mt-0.5 flex-shrink-0"></div>
              <p className="text-sm text-gray-700 font-medium">
                {content.acknowledgment.checkbox_text}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-8 pt-6 border-t border-gray-200 text-center">
        <p className="text-sm text-gray-500">
          This agreement is effective as of{' '}
          {content.effectiveDate ? 
            new Date(content.effectiveDate).toLocaleDateString() : 
            new Date().toLocaleDateString()
          }
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Version {version} • Language: {language.toUpperCase()}
        </p>
      </footer>
    </div>
  )
}

export default AgreementText