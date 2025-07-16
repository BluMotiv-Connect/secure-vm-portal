import React from 'react'
import { useTheme } from '@contexts/ThemeContext'
import { cn } from '@utils/helpers'

const Footer = () => {
  const { sidebarCollapsed } = useTheme()

  return (
    <footer className={cn(
      'bg-white border-t border-gray-200 py-4 px-4 sm:px-6 lg:px-8 transition-all duration-300',
      sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
    )}>
      <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500">
        <div className="flex items-center space-x-4">
          <span>© 2025 Secure VM Portal</span>
          <span>•</span>
          <span>Version 1.0.0</span>
        </div>
        
        <div className="flex items-center space-x-4 mt-2 sm:mt-0">
          <a href="#" className="hover:text-gray-700 transition-colors">
            Privacy Policy
          </a>
          <span>•</span>
          <a href="#" className="hover:text-gray-700 transition-colors">
            Terms of Service
          </a>
          <span>•</span>
          <a href="#" className="hover:text-gray-700 transition-colors">
            Support
          </a>
        </div>
      </div>
    </footer>
  )
}

export default Footer
