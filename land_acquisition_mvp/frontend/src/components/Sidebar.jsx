import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, BarChart3, Map, Activity, LogOut } from 'lucide-react'

export default function Sidebar({ onLogout }) {
  const role = localStorage.getItem('auth_role') || 'Unknown'

  const links = [
    { to: '/', icon: <LayoutDashboard size={20} />, label: 'Command Center' },
    { to: '/analytics', icon: <BarChart3 size={20} />, label: 'Analytics' },
    { to: '/map', icon: <Map size={20} />, label: 'GIS Map' },
  ]
  
  if (role === 'PolicyMaker' || role === 'Collector') {
    links.push({ to: '/model-health', icon: <Activity size={20} />, label: 'Model Health' })
  }

  return (
    <div className="flex w-64 flex-col justify-between border-r border-gray-200 bg-white">
      <div>
        <div className="border-b border-gray-200 p-6">
          <h1 className="text-xl font-bold text-blue-600 leading-tight">Land Acquisition<br/>Intelligence</h1>
          <div className="mt-2 text-xs font-medium text-gray-500 bg-gray-100 inline-block px-2 py-1 rounded">
            Role: {role}
          </div>
        </div>
        <nav className="p-4 space-y-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              {link.icon}
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-md px-4 py-3 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-700 transition-colors"
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </div>
  )
}
