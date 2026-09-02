import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE } from '../App'
import KPICards from '../components/KPICards'
import AlertFeed from '../components/AlertFeed'
import { useRole } from '../context/RoleContext'
import { Shield, Sparkles, Building2, MapPin, Gauge, ArrowRight } from 'lucide-react'

export default function CommandCenter() {
  const { currentRole, roleInfo, token } = useRole()
  const [alerts, setAlerts] = useState([])
  const [metrics, setMetrics] = useState({ total: 0, critical: 0, avgRisk: 0, accuracy: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const authToken = token || localStorage.getItem('auth_token')
        const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {}
        
        // Fetch alerts
        const alertRes = await fetch(`${API_BASE}/alerts/trigger`, { headers })
        if (alertRes.ok) {
          setAlerts(await alertRes.json())
        }

        // Fetch basic stats from geo endpoint for KPIs
        const geoRes = await fetch(`${API_BASE}/projects/geo`, { headers })
        if (geoRes.ok) {
          const geoData = await geoRes.json()
          const features = geoData.features || []
          const total = features.length
          const critical = features.filter(f => f.properties?.risk_score >= 75).length
          const avgRisk = features.reduce((acc, f) => acc + (f.properties?.risk_score || 0), 0) / (total || 1)
          
          setMetrics({
            total,
            critical,
            avgRisk: avgRisk.toFixed(1),
            accuracy: 96.2 // from baseline ML run
          })
        }
      } catch (err) {
        console.error("Failed to fetch command center data", err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [token, currentRole])

  const getRoleHeader = () => {
    switch (currentRole) {
      case 'Collector':
        return {
          title: 'District Collector Executive Dashboard',
          subtitle: 'Administrative oversight of district land acquisition pipelines, statutory milestones, and dispute resolution.',
          icon: <Building2 className="text-amber-600" size={24} />,
          badge: 'District Magistrate & Collector Review'
        }
      case 'Policy Maker':
        return {
          title: 'Statewide Strategic Command Center',
          subtitle: 'Macro portfolio oversight, systemic risk early warning, and cross-district bottleneck indicators.',
          icon: <Gauge className="text-purple-600" size={24} />,
          badge: 'State HQ Strategic Intelligence'
        }
      default: // LAO
        return {
          title: 'High-Risk Field Command Center',
          subtitle: 'Operational tracking of active land parcels, critical delays, and immediate field-level intervention logs.',
          icon: <Shield className="text-blue-600" size={24} />,
          badge: 'Field Operations & Dispute Escalation'
        }
    }
  }

  const roleHeader = getRoleHeader()

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-sm font-medium">Loading Command Center ({currentRole} View)...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Dynamic Header based on active role */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {roleHeader.title}
            </h1>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${roleInfo.badgeColor}`}>
              {roleHeader.badge}
            </span>
          </div>
          <p className="text-sm text-gray-500 max-w-3xl">
            {roleHeader.subtitle}
          </p>
        </div>

        {/* Action Controls & Live Persona Pill */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/predict-risk"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-xs text-xs transition-colors cursor-pointer"
          >
            <Sparkles size={15} />
            Assess Project Delay Risk
            <ArrowRight size={13} />
          </Link>

          <div className="flex items-center gap-2.5 bg-white border border-gray-200 shadow-xs px-3.5 py-2 rounded-xl">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <div className="text-xs">
              <span className="text-gray-400 font-medium">Viewing as: </span>
              <span className="font-bold text-gray-800">{roleInfo.officerName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <KPICards metrics={metrics} />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  {currentRole === 'Policy Maker'
                    ? 'Statewide Priority Mitigation Actions'
                    : currentRole === 'Collector'
                    ? 'District Escalations Requiring Approval'
                    : 'Priority Field Actions Needed'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {currentRole === 'Policy Maker'
                    ? 'Systemic policy bottlenecks flagged across regional corridors.'
                    : currentRole === 'Collector'
                    ? 'High-impact land parcels pending administrative sanction.'
                    : 'Projects that have reached critical risk levels and require immediate field intervention.'}
                </p>
              </div>
            </div>

            {/* Action metric cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="border border-red-100 bg-red-50/70 p-5 rounded-xl">
                <div className="flex items-baseline justify-between">
                  <h3 className="font-extrabold text-red-700 text-3xl">{alerts.length}</h3>
                  <span className="text-xs font-semibold uppercase tracking-wider text-red-600 bg-red-100/80 px-2 py-0.5 rounded">
                    Action Required
                  </span>
                </div>
                <p className="text-xs font-medium text-red-800 mt-2">
                  Pending Critical Interventions
                </p>
              </div>

              <div className="border border-emerald-100 bg-emerald-50/70 p-5 rounded-xl">
                <div className="flex items-baseline justify-between">
                  <h3 className="font-extrabold text-emerald-700 text-3xl">14</h3>
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 bg-emerald-100/80 px-2 py-0.5 rounded">
                    Resolved
                  </span>
                </div>
                <p className="text-xs font-medium text-emerald-800 mt-2">
                  Interventions Logged (Last 7 Days)
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Alerts Feed */}
        <div className="lg:col-span-1">
          <AlertFeed alerts={alerts} />
        </div>
      </div>
    </div>
  )
}
