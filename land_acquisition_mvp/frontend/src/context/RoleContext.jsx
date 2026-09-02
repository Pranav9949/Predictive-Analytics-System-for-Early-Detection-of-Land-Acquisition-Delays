import React, { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'


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
        const res = await api.post('/auth/login', {
          username: roleConfig.user,
          password: 'password123'
        })
        if (res.data?.access_token) {
          setToken(res.data.access_token)
          localStorage.setItem('auth_token', res.data.access_token)
        }
      } catch (err) {
        console.warn('Backend auto-sync token warning:', err.response?.data?.detail || err.message)
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
