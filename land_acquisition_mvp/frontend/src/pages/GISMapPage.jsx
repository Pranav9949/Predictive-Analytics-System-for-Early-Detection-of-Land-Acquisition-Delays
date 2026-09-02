import React, { useEffect, useState, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../services/api'
import InterventionModal from '../components/InterventionModal'
import { useRole } from '../context/RoleContext'

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom colored markers
const getMarkerIcon = (color) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  })
}

export default function GISMapPage() {
  const { currentRole, roleInfo, token } = useRole()
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const [data, setData] = useState(null)
  const [selectedProject, setSelectedProject] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const fetchGeoData = async () => {
      try {
        setLoading(true)
        const res = await api.get('/projects/geo')
        if (isMounted) {
          setData(res.data)
        }
      } catch (err) {
        console.error("Geo fetch error", err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchGeoData()
    return () => { isMounted = false }
  }, [token, currentRole])

  useEffect(() => {
    if (!mapRef.current) return

    // Initialize Leaflet map if not already created
    if (!mapInstance.current) {
      const map = L.map(mapRef.current, {
        preferCanvas: true
      }).setView([19.7515, 75.7139], 7)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map)

      mapInstance.current = map
    }

    const map = mapInstance.current

    if (map && data) {
      // Clear old GeoJSON layers
      map.eachLayer((layer) => {
        if (layer instanceof L.GeoJSON) {
          map.removeLayer(layer)
        }
      })

      L.geoJSON(data, {
        pointToLayer: (feature, latlng) => {
          const props = feature.properties || {}
          let color = '#10b981' // Green
          if (props.risk_score >= 75) color = '#ef4444' // Red
          else if (props.risk_score >= 50) color = '#f59e0b' // Orange
          else if (props.risk_score >= 25) color = '#fbbf24' // Yellow
          
          if (props.intervention_taken) color = '#3b82f6' // Blue = Intervention taken

          return L.circleMarker(latlng, {
            radius: 7,
            fillColor: color,
            color: '#ffffff',
            weight: 1.5,
            opacity: 1,
            fillOpacity: 0.85
          })
        },
        onEachFeature: (feature, layer) => {
          const p = feature.properties || {}
          
          // Setup popup
          const popupContent = document.createElement('div')
          popupContent.className = 'p-2 min-w-[220px]'
          popupContent.innerHTML = `
            <div class="font-bold text-sm mb-1 text-gray-900">${p.project_name || `Project #${p.project_id}`}</div>
            <div class="text-xs text-gray-600 mb-2">${p.district} • ${p.project_type}</div>
            
            <div class="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-200 mb-2">
              <span class="text-xs font-medium text-gray-600">Predicted Risk:</span>
              <span class="text-sm font-bold ${p.risk_score >= 75 ? 'text-red-600' : p.risk_score >= 50 ? 'text-orange-600' : 'text-emerald-600'}">
                ${p.risk_score ? Number(p.risk_score).toFixed(1) : 0}%
              </span>
            </div>
            
            ${p.intervention_taken 
              ? `<div class="text-xs bg-blue-50 text-blue-700 p-1.5 rounded border border-blue-100 mb-2 font-medium">✅ ${p.intervention_taken}</div>` 
              : `<div class="text-xs bg-red-50 text-red-700 p-1.5 rounded border border-red-100 mb-2 font-medium">⚠️ Action Needed</div>`
            }
          `
          
          const btn = document.createElement('button')
          btn.className = 'w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 rounded font-medium mt-1 transition-colors shadow-xs cursor-pointer'
          btn.innerText = currentRole === 'Policy Maker' ? 'Inspect Project Intelligence' : 'Take Administrative Action'
          btn.onclick = () => setSelectedProject(p)
          
          popupContent.appendChild(btn)
          layer.bindPopup(popupContent)
        }
      }).addTo(map)
    }
  }, [data, currentRole])

  return (
    <div className="flex flex-col h-full bg-white relative w-full overflow-hidden">
      {/* Floating Control Legend */}
      <div className="absolute top-4 left-4 z-[400] bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 p-4 min-w-[260px]">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <h2 className="font-bold text-gray-900 text-sm">Live Spatial Risk Map</h2>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleInfo.badgeColor}`}>
            {currentRole}
          </span>
        </div>
        <p className="text-[11px] text-gray-500 mb-3">
          {currentRole === 'Policy Maker'
            ? 'Statewide spatial cluster visualization.'
            : currentRole === 'Collector'
            ? 'District administrative jurisdiction clusters.'
            : 'Field-level pinpoint location tracking.'}
        </p>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2 text-gray-700">
            <span className="w-3 h-3 rounded-full bg-red-500 shrink-0"></span> Critical (&gt;75%)
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <span className="w-3 h-3 rounded-full bg-orange-500 shrink-0"></span> High (50-75%)
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <span className="w-3 h-3 rounded-full bg-yellow-400 shrink-0"></span> Moderate (25-50%)
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></span> Low (&lt;25%)
          </div>
          <div className="border-t border-gray-100 my-2 pt-2"></div>
          <div className="flex items-center gap-2 font-semibold text-blue-700">
            <span className="w-3 h-3 rounded-full bg-blue-500 border border-white shadow-xs shrink-0"></span>
            Intervention Logged
          </div>
        </div>
      </div>
      
      <div ref={mapRef} className="w-full h-full z-0"></div>

      {selectedProject && (
        <InterventionModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onUpdate={async () => {
            try {
              const res = await api.get('/projects/geo')
              setData(res.data)
            } catch (err) {
              console.error(err)
            }
          }}
        />
      )}
    </div>
  )
}
