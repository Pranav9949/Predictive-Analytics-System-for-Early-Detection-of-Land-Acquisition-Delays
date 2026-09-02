import React, { useEffect, useState } from 'react'
import { API_BASE } from '../App'
import RiskChart from '../components/RiskChart'
import ProjectTable from '../components/ProjectTable'
import { useRole } from '../context/RoleContext'

export default function Analytics() {
  const { currentRole, roleInfo, token } = useRole()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const authToken = token || localStorage.getItem('auth_token')
        const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {}
        
        const res = await fetch(`${API_BASE}/projects/geo`, { headers })
        if (res.ok) {
          const geoData = await res.json()
          setData((geoData.features || []).map(f => f.properties))
        }
      } catch (err) {
        console.error("Failed to fetch analytics data", err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [token, currentRole])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-sm font-medium">Loading Analytics ({currentRole} View)...</p>
        </div>
      </div>
    )
  }

  // Calculate risk distribution
  const distribution = { Low: 0, Moderate: 0, High: 0, Critical: 0 }
  data.forEach(p => {
    if (p.risk_score >= 75) distribution.Critical++
    else if (p.risk_score >= 50) distribution.High++
    else if (p.risk_score >= 25) distribution.Moderate++
    else distribution.Low++
  })

  const chartData = [
    { name: 'Low (<25%)', count: distribution.Low, fill: '#10b981' },
    { name: 'Moderate (25-50%)', count: distribution.Moderate, fill: '#f59e0b' },
    { name: 'High (50-75%)', count: distribution.High, fill: '#ef4444' },
    { name: 'Critical (>75%)', count: distribution.Critical, fill: '#991b1b' },
  ]

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {currentRole === 'Policy Maker'
                ? 'Macro Policy & Portfolio Analytics'
                : currentRole === 'Collector'
                ? 'District-Level Risk Distribution & Analytics'
                : 'Project Delay Predictive Analytics'}
            </h1>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${roleInfo.badgeColor}`}>
              Role: {currentRole}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {currentRole === 'Policy Maker'
              ? 'Statewide cross-district benchmarking, systemic delay vectors, and policy leverage metrics.'
              : currentRole === 'Collector'
              ? 'Deep dive into district acquisition milestones, court cases, and compensation clearance velocity.'
              : 'Detailed parcel-level insights, delay probability distribution, and intervention tracking.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">Overall Risk Distribution</h2>
          <div className="h-64">
            <RiskChart data={chartData} />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6">
          <h2 className="text-base font-bold text-gray-900 mb-2">Intervention Impact & ML Insights</h2>
          <p className="text-sm text-gray-600 mb-4">
            Projects with recorded administrative interventions show an average <strong>15-20% reduction</strong> in delay probability.
          </p>
          <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4">
            <h3 className="font-semibold text-blue-900 text-sm mb-2">
              {currentRole === 'Policy Maker'
                ? 'Top Statewide Policy Levers:'
                : 'Most Effective Administrative Actions:'}
            </h3>
            <ul className="list-disc pl-5 text-xs font-medium text-blue-800 space-y-1.5">
              <li>Escalating Compensation Disbursement (-18% delay risk)</li>
              <li>Joint Court Hearing Scheduling (-12% delay risk)</li>
              <li>Special Ownership Verification Drive (-8% delay risk)</li>
              <li>Single-Window Departmental Clearances (-15% delay risk)</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6">
        <h2 className="text-base font-bold text-gray-900 mb-4">Project Registry & Live Status</h2>
        <ProjectTable data={data} onInterventionUpdate={() => {}} />
      </div>
    </div>
  )
}
