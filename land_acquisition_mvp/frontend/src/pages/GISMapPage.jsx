import React, { useEffect, useState, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { API_BASE } from '../App'
import InterventionModal from '../components/InterventionModal'

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
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const [data, setData] = useState(null)
  const [selectedProject, setSelectedProject] = useState(null)

  useEffect(() => {
    const fetchGeoData = async () => {
      try {
        const token = localStorage.getItem('auth_token')
        const headers = { Authorization: `Bearer ${token}` }
        const res = await fetch(`${API_BASE}/projects/geo`, { headers })
        if (res.ok) {
          setData(await res.json())
        }
      } catch (err) {
        console.error("Geo fetch error", err)
      }
    }
    fetchGeoData()
  }, [])

  useEffect(() => {
    if (!mapInstance.current && mapRef.current) {
      // Light theme OpenStreetMap tiles
      mapInstance.current = L.map(mapRef.current).setView([19.7515, 75.7139], 7)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstance.current)
    }

    if (mapInstance.current && data) {
      // Clear old layers
      mapInstance.current.eachLayer((layer) => {
        if (layer instanceof L.GeoJSON) {
          mapInstance.current.removeLayer(layer)
        }
      })

      L.geoJSON(data, {
        pointToLayer: (feature, latlng) => {
          const props = feature.properties
          let color = '#10b981' // Green
          if (props.risk_score >= 75) color = '#ef4444' // Red
          else if (props.risk_score >= 50) color = '#f59e0b' // Orange
          else if (props.risk_score >= 25) color = '#fbbf24' // Yellow
          
          if (props.intervention_taken) color = '#3b82f6' // Blue = Intervention taken

          return L.marker(latlng, { icon: getMarkerIcon(color) })
        },
        onEachFeature: (feature, layer) => {
          const p = feature.properties
          
          // Setup popup
          const popupContent = document.createElement('div')
          popupContent.className = 'p-2 min-w-[200px]'
          popupContent.innerHTML = `
            <div class="font-bold text-sm mb-1">${p.project_name || `Project #${p.project_id}`}</div>
            <div class="text-xs text-gray-600 mb-2">${p.district} • ${p.project_type}</div>
            
            <div class="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-200 mb-2">
              <span class="text-xs font-medium">Risk Score:</span>
              <span class="text-sm font-bold ${p.risk_score >= 75 ? 'text-red-600' : 'text-gray-900'}">${p.risk_score.toFixed(1)}%</span>
            </div>
            
            ${p.intervention_taken 
              ? `<div class="text-xs bg-blue-50 text-blue-700 p-1.5 rounded border border-blue-100 mb-2">✅ ${p.intervention_taken}</div>` 
              : `<div class="text-xs bg-red-50 text-red-700 p-1.5 rounded border border-red-100 mb-2">⚠️ Action Needed</div>`
            }
          `
          
          const btn = document.createElement('button')
          btn.className = 'w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 rounded font-medium mt-1 transition-colors'
          btn.innerText = 'Take Action'
          btn.onclick = () => setSelectedProject(p)
          
          popupContent.appendChild(btn)
          layer.bindPopup(popupContent)
        }
      }).addTo(mapInstance.current)
    }
  }, [data])

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="absolute top-4 left-4 z-[400] bg-white bg-opacity-90 backdrop-blur rounded-lg shadow-md border border-gray-200 p-4 min-w-[250px]">
        <h2 className="font-bold text-gray-900 mb-3">Live Risk Map</h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500"></span> Critical (&gt;75%)</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-500"></span> High (50-75%)</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-400"></span> Moderate (25-50%)</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500"></span> Low (&lt;25%)</div>
          <div className="border-t border-gray-200 my-2 pt-2"></div>
          <div className="flex items-center gap-2 font-medium text-blue-700"><span className="w-3 h-3 rounded-full bg-blue-500 border border-white shadow-sm"></span> Intervention Logged</div>
        </div>
      </div>
      
      <div ref={mapRef} className="w-full h-full z-0"></div>

      {selectedProject && (
        <InterventionModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onUpdate={() => window.location.reload()}
        />
      )}
    </div>
  )
}
