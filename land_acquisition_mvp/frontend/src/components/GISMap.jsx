import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './GISMap.css';

/**
 * GISMap — React-Leaflet Map with Risk-Colored Markers
 * =====================================================
 * Plots project locations on a map of Maharashtra, India.
 * Markers are color-coded by risk category.
 * Clicking a marker shows a popup with project details.
 */

const RISK_COLORS = {
  Low: '#10b981',
  Moderate: '#f59e0b',
  High: '#f97316',
  Critical: '#ef4444',
};

// Center on Maharashtra, India
const MAP_CENTER = [19.5, 75.0];
const MAP_ZOOM = 7;

function GISMap({ projects, onSelectProject }) {
  return (
    <div className="gis-map-wrapper">
      <MapContainer
        center={MAP_CENTER}
        zoom={MAP_ZOOM}
        className="gis-map"
        scrollWheelZoom={true}
      >
        {/* Dark-themed tile layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> | CartoDB'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Project Markers */}
        {projects.map((project) => (
          <CircleMarker
            key={project.project_id}
            center={[project.lat, project.lon]}
            radius={project.risk_category === 'Critical' ? 8 : 6}
            pathOptions={{
              color: RISK_COLORS[project.risk_category] || '#6366f1',
              fillColor: RISK_COLORS[project.risk_category] || '#6366f1',
              fillOpacity: 0.7,
              weight: 2,
            }}
            eventHandlers={{
              click: () => {},
            }}
          >
            <Popup className="map-popup">
              <div className="popup-content">
                <div className="popup-header">
                  <span className="popup-id">#{project.project_id}</span>
                  <span
                    className="popup-badge"
                    style={{
                      background: `${RISK_COLORS[project.risk_category]}20`,
                      color: RISK_COLORS[project.risk_category],
                      border: `1px solid ${RISK_COLORS[project.risk_category]}40`,
                    }}
                  >
                    {project.risk_category}
                  </span>
                </div>
                <div className="popup-details">
                  <div className="popup-row">
                    <span className="popup-label">District</span>
                    <span className="popup-value">{project.district}</span>
                  </div>
                  <div className="popup-row">
                    <span className="popup-label">Type</span>
                    <span className="popup-value">{project.project_type}</span>
                  </div>
                  <div className="popup-row">
                    <span className="popup-label">Risk Score</span>
                    <span className="popup-value" style={{ color: RISK_COLORS[project.risk_category], fontWeight: 700 }}>
                      {project.risk_score}
                    </span>
                  </div>
                  <div className="popup-row">
                    <span className="popup-label">Acres</span>
                    <span className="popup-value">{project.total_acres}</span>
                  </div>
                </div>
                <button
                  className="popup-detail-btn"
                  onClick={() => onSelectProject(project)}
                >
                  View Full Analysis →
                </button>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Map Legend */}
      <div className="map-legend">
        {Object.entries(RISK_COLORS).map(([label, color]) => (
          <div key={label} className="legend-item">
            <span className="legend-dot" style={{ background: color }}></span>
            <span className="legend-label">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default GISMap;
