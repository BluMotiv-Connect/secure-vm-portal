import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import { useTheme } from '@contexts/ThemeContext'
import { cn } from '@utils/helpers'
import {
  Home,
  Monitor,
  Users,
  BarChart3,
  FileText,
  Settings,
  Clock,
  Shield
} from 'lucide-react'

const Sidebar = () => {
  const { user } = useAuth()
  const { sidebarCollapsed } = useTheme()
  const location = useLocation()

  const navigation = [
    {
      name: 'Dashboard',
      href: '/',
      icon: Home,
      roles: ['admin', 'employee']
    },
    {
      name: 'My VMs',
      href: '/vms',
      icon: Monitor,
      roles: ['employee']
    },
    {
      name: 'Work Logs',
      href: '/work-logs',
      icon: Clock,
      roles: ['employee']
    },
    {
      name: 'User Management',
      href: '/admin/users',
      icon: Users,
      roles: ['admin']
    },
    {
      name: 'VM Management',
      href: '/admin/vms',
      icon: Shield,
      roles: ['admin']
    },
    {
      name: 'Reports',
      href: '/admin/reports',
      icon: BarChart3,
      roles: ['admin']
    },
    {
      name: 'Audit Logs',
      href: '/admin/audit',
      icon: FileText,
      roles: ['admin']
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      roles: ['admin', 'employee']
    }
  ]

  const filteredNavigation = navigation.filter(item =>
    item.roles.includes(user?.role)
  )

  const isActive = (href) => {
    if (href === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(href)
  }

  return (
    <div className={cn(
      'fixed inset-y-0 left-0 z-30 bg-white border-r border-gray-200 transition-all duration-300',
      sidebarCollapsed ? 'w-16' : 'w-64',
      'md:translate-x-0 transform'
    )}>
      <div className="flex flex-col h-full pt-16">
        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {filteredNavigation.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)

            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200',
                  active
                    ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon
                  className={cn(
                    'flex-shrink-0 h-5 w-5',
                    active ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500',
                    sidebarCollapsed ? 'mr-0' : 'mr-3'
                  )}
                />
                {!sidebarCollapsed && (
                  <span className="truncate">{item.name}</span>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Footer */}
        {!sidebarCollapsed && (
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              <p>Secure VM Portal v1.0.0</p>
              <p>© 2025 Your Company</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Sidebar
