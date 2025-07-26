import React from 'react'
import { Globe, ChevronDown } from 'lucide-react'

const LanguageSelector = ({ 
  selectedLanguage = 'en', 
  onLanguageChange, 
  disabled = false,
  className = '',
  size = 'md'
}) => {
  // Available languages (can be expanded when multi-language support is added)
  const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    // TODO: Add more languages
    // { code: 'es', name: 'Spanish', nativeName: 'Español' },
    // { code: 'fr', name: 'French', nativeName: 'Français' },
    // { code: 'de', name: 'German', nativeName: 'Deutsch' },
    // { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  ]

  const selectedLang = languages.find(lang => lang.code === selectedLanguage) || languages[0]

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-2'
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <label htmlFor="language-selector" className="sr-only">
        Select Language
      </label>
      
      <div className="relative">
        <select
          id="language-selector"
          value={selectedLanguage}
          onChange={(e) => onLanguageChange?.(e.target.value)}
          disabled={disabled}
          className={`
            appearance-none bg-white border border-gray-300 rounded-md
            ${sizeClasses[size]}
            pr-8 pl-8
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
            hover:border-gray-400 transition-colors
            ${className}
          `}
        >
          {languages.map((language) => (
            <option key={language.code} value={language.code}>
              {language.nativeName}
            </option>
          ))}
        </select>
        
        {/* Globe icon */}
        <Globe 
          className={`
            absolute left-2 top-1/2 transform -translate-y-1/2 
            ${iconSizes[size]} 
            ${disabled ? 'text-gray-400' : 'text-gray-500'}
          `} 
        />
        
        {/* Dropdown arrow */}
        <ChevronDown 
          className={`
            absolute right-2 top-1/2 transform -translate-y-1/2 
            ${iconSizes[size]} 
            ${disabled ? 'text-gray-400' : 'text-gray-500'}
            pointer-events-none
          `} 
        />
      </div>
      
      {/* Language info tooltip (optional) */}
      {selectedLang && (
        <div className="sr-only" aria-live="polite">
          Selected language: {selectedLang.name}
        </div>
      )}
    </div>
  )
}

// Compact version for headers/toolbars
export const CompactLanguageSelector = ({ 
  selectedLanguage = 'en', 
  onLanguageChange, 
  disabled = false 
}) => {
  const languages = [
    { code: 'en', flag: '🇺🇸', name: 'English' },
    // TODO: Add more languages with flags
  ]

  const selectedLang = languages.find(lang => lang.code === selectedLanguage) || languages[0]

  return (
    <div className="relative inline-block">
      <select
        value={selectedLanguage}
        onChange={(e) => onLanguageChange?.(e.target.value)}
        disabled={disabled}
        className="
          appearance-none bg-transparent border-none text-sm
          pr-6 pl-8 py-1 cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-blue-500 rounded
          disabled:cursor-not-allowed disabled:opacity-50
        "
        title={`Language: ${selectedLang.name}`}
      >
        {languages.map((language) => (
          <option key={language.code} value={language.code}>
            {language.flag} {language.code.toUpperCase()}
          </option>
        ))}
      </select>
      
      <span className="absolute left-1 top-1/2 transform -translate-y-1/2 text-sm">
        {selectedLang.flag}
      </span>
      
      <ChevronDown className="absolute right-1 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-500 pointer-events-none" />
    </div>
  )
}

// Language display component (read-only)
export const LanguageDisplay = ({ 
  language = 'en', 
  showFlag = true, 
  showName = true,
  className = '' 
}) => {
  const languages = {
    en: { flag: '🇺🇸', name: 'English', nativeName: 'English' },
    // TODO: Add more languages
  }

  const lang = languages[language] || languages.en

  return (
    <div className={`inline-flex items-center space-x-2 ${className}`}>
      {showFlag && <span className="text-sm">{lang.flag}</span>}
      {showName && <span className="text-sm text-gray-600">{lang.name}</span>}
    </div>
  )
}

export default LanguageSelector