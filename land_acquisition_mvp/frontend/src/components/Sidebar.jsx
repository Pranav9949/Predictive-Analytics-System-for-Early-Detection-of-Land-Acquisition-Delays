import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, BarChart3, Map, Activity, ShieldCheck, ChevronDown, UserCircle2 } from 'lucide-react'
import { useRole } from '../context/RoleContext'

export default function Sidebar() {
  const { currentRole, setRole, roleInfo, rolesList } = useRole()

  const links = [
    { to: '/', icon: <LayoutDashboard size={20} />, label: 'Command Center' },
    { to: '/analytics', icon: <BarChart3 size={20} />, label: 'Analytics' },
    { to: '/map', icon: <Map size={20} />, label: 'GIS Map' },
  ]
  
  if (currentRole === 'Collector' || currentRole === 'Policy Maker') {
    links.push({ to: '/model-health', icon: <Activity size={20} />, label: 'Model Health' })
  }

  return (
    <aside className="flex w-64 flex-col justify-between border-r border-gray-200 bg-white select-none shrink-0 shadow-sm">
      <div>
        {/* Header Branding */}
        <div className="border-b border-gray-200 p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm font-bold text-sm">
              LA
            </div>
            <div>
              <h1 className="text-base font-bold text-blue-600 leading-tight">
                Land Acquisition
              </h1>
              <p className="text-xs font-semibold text-gray-700 tracking-wide">
                Intelligence Platform
              </p>
            </div>
          </div>

          {/* Interactive Role Switcher Dropdown */}
          <div className="mt-4">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-blue-600" />
              Active Role Persona
            </label>
            <div className="relative">
              <select
                id="role-selector-dropdown"
                value={currentRole}
                onChange={(e) => setRole(e.target.value)}
                className="w-full appearance-none rounded-lg border border-blue-200 bg-blue-50/60 py-2 pl-3 pr-8 text-xs font-bold text-blue-900 shadow-sm transition-all hover:bg-blue-50 hover:border-blue-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/20 cursor-pointer"
              >
                {rolesList.map((r) => (
                  <option key={r} value={r} className="bg-white text-gray-900 font-medium py-1">
                    Role: {r}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-blue-600">
                <ChevronDown size={14} />
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1.5">
          <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Navigation
          </div>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs border-l-4 border-blue-600 pl-2.5'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <span className="shrink-0">{link.icon}</span>
              <span className="truncate">{link.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Role Profile Details in Footer */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/70">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-xs shrink-0">
            <UserCircle2 size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="text-xs font-bold text-gray-900 truncate">
                {roleInfo.officerName}
              </p>
            </div>
            <p className="text-[11px] text-gray-500 truncate">
              {roleInfo.designation}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
