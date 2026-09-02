import React, { createContext, useContext, useState, useEffect } from 'react'

export const RoleContext = createContext()

export const ROLES = {
  LAO: {
    id: 'LAO',
    name: 'LAO',
    backendRole: 'LAO',
    user: 'lao1',
    officerName: 'Rajesh Kumar',
    designation: 'Land Acquisition Officer (LAO)',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Field operations, daily dispute tracking, and on-ground intervention logging.'
  },
  Collector: {
    id: 'Collector',
    name: 'Collector',
    backendRole: 'Collector',
    user: 'collector1',
    officerName: 'Dr. Anjali Sharma',
    designation: 'District Magistrate & Collector',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    description: 'District administrative oversight, statutory approvals, and model governance.'
  },
  'Policy Maker': {
    id: 'Policy Maker',
    name: 'Policy Maker',
    backendRole: 'PolicyMaker',
    user: 'policy1',
    officerName: 'Delhi HQ Strategic Cell',
    designation: 'Ministry / Policy Director',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'Statewide macro metrics, systemic bottleneck mitigation, and policy levers.'
  }
}

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export function RoleProvider({ children }) {
  const [currentRole, setCurrentRole] = useState(() => {
    return localStorage.getItem('app_current_role') || 'LAO'
  })

  const [token, setToken] = useState(() => localStorage.getItem('auth_token') || '')

  // Sync token whenever role changes
  useEffect(() => {
    localStorage.setItem('app_current_role', currentRole)
    const roleConfig = ROLES[currentRole] || ROLES.LAO
    localStorage.setItem('auth_role', roleConfig.backendRole)

    // Automatically authenticate/sync token with backend
    const syncAuth = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: roleConfig.user,
            password: 'password123'
          })
        })
        if (res.ok) {
          const data = await res.json()
          setToken(data.access_token)
          localStorage.setItem('auth_token', data.access_token)
        }
      } catch (err) {
        console.warn('Backend auto-sync token warning:', err)
      }
    }

    syncAuth()
  }, [currentRole])

  const setRole = (newRole) => {
    if (ROLES[newRole]) {
      setCurrentRole(newRole)
    }
  }

  const roleInfo = ROLES[currentRole] || ROLES.LAO

  return (
    <RoleContext.Provider
      value={{
        currentRole,
        setRole,
        roleInfo,
        token,
        rolesList: Object.keys(ROLES)
      }}
    >
      {children}
    </RoleContext.Provider>
  )
}

export const useRole = () => useContext(RoleContext)
