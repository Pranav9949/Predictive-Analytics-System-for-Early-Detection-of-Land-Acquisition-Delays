import React, { useEffect, useState } from 'react'
import { API_BASE } from '../App'
import KPICards from '../components/KPICards'
import AlertFeed from '../components/AlertFeed'

export default function CommandCenter() {
  const [alerts, setAlerts] = useState([])
  const [metrics, setMetrics] = useState({ total: 0, critical: 0, avgRisk: 0, accuracy: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('auth_token')
        const headers = { Authorization: `Bearer ${token}` }
        
        // Fetch alerts
        const alertRes = await fetch(`${API_BASE}/alerts/trigger`, { headers })
        if (alertRes.ok) {
          setAlerts(await alertRes.json())
        }

        // Fetch basic stats from geo endpoint for KPIs
        const geoRes = await fetch(`${API_BASE}/projects/geo`, { headers })
        if (geoRes.ok) {
          const geoData = await geoRes.json()
          const features = geoData.features
          const total = features.length
          const critical = features.filter(f => f.properties.risk_score >= 75).length
          const avgRisk = features.reduce((acc, f) => acc + (f.properties.risk_score || 0), 0) / (total || 1)
          
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
  }, [])

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading Command Center...</div>
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">High-Risk Command Center</h1>
        <p className="text-gray-500">Operational overview of land acquisition risks and recommended interventions.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4 mb-8">
        <KPICards metrics={metrics} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Priority Actions Needed</h2>
            <p className="text-sm text-gray-500 mb-4">
              The following projects have reached critical risk levels and require immediate administrative intervention.
            </p>
            {/* Quick action grid */}
            <div className="grid grid-cols-2 gap-4">
               <div className="border border-red-100 bg-red-50 p-4 rounded-lg">
                 <h3 className="font-bold text-red-700 text-lg">{alerts.length}</h3>
                 <p className="text-sm text-red-600">Pending Critical Interventions</p>
               </div>
               <div className="border border-green-100 bg-green-50 p-4 rounded-lg">
                 <h3 className="font-bold text-green-700 text-lg">14</h3>
                 <p className="text-sm text-green-600">Interventions Logged (Last 7 Days)</p>
               </div>
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-1">
          <AlertFeed alerts={alerts} />
        </div>
      </div>
    </div>
  )
}
