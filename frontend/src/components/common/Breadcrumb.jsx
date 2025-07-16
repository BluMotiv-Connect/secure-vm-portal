import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@utils/helpers'

const Breadcrumb = ({ items = [], className }) => {
  const location = useLocation()

  // Auto-generate breadcrumbs if no items provided
  const getBreadcrumbItems = () => {
    if (items.length > 0) return items

    const pathSegments = location.pathname.split('/').filter(Boolean)
    const breadcrumbItems = [{ label: 'Dashboard', href: '/' }]

    let currentPath = ''
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`
      const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
      
      breadcrumbItems.push({
        label,
        href: currentPath,
        isLast: index === pathSegments.length - 1
      })
    })

    return breadcrumbItems
  }

  const breadcrumbItems = getBreadcrumbItems()

  if (breadcrumbItems.length <= 1) return null

  return (
    <nav className={cn('flex items-center space-x-1 text-sm text-gray-500', className)}>
      <Link
        to="/"
        className="flex items-center hover:text-gray-700 transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>

      {breadcrumbItems.slice(1).map((item, index) => (
        <React.Fragment key={item.href}>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          
          {item.isLast ? (
            <span className="text-gray-900 font-medium">
              {item.label}
            </span>
          ) : (
            <Link
              to={item.href}
              className="hover:text-gray-700 transition-colors"
            >
              {item.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}

export default Breadcrumb
