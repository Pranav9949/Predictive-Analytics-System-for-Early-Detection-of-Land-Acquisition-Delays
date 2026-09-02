import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import './DrillDownModal.css';

/**
 * DrillDownModal — Project Deep-Dive with What-If Simulator
 * ==========================================================
 * Shows risk score, stage-wise bars, SHAP drivers, and an
 * interactive What-If slider that calls the /whatif API.
 */

const RISK_COLORS = {
  Low: '#10b981',
  Moderate: '#f59e0b',
  High: '#f97316',
  Critical: '#ef4444',
};

const STAGE_ICONS = {
  'Approval Stage': '📋',
  'Compensation Stage': '💰',
  'Legal Stage': '⚖️',
  'Possession Stage': '🏗️',
};

// Feature ranges for the What-If slider
const WHATIF_FEATURES = [
  { key: 'compensation_disbursed_pct', label: 'Compensation Disbursed %', min: 10, max: 100, step: 1 },
  { key: 'legal_cases_count', label: 'Legal Cases Count', min: 0, max: 12, step: 1 },
  { key: 'ownership_disputes', label: 'Ownership Disputes', min: 0, max: 15, step: 1 },
  { key: 'approval_days_pending', label: 'Approval Days Pending', min: 0, max: 120, step: 5 },
  { key: 'rnp_progress_pct', label: 'R&R Progress %', min: 10, max: 100, step: 1 },
  { key: 'possession_pct', label: 'Possession %', min: 10, max: 100, step: 1 },
  { key: 'doc_deficiency_score', label: 'Doc Deficiency Score', min: 0, max: 1, step: 0.05 },
];

function DrillDownModal({ project, onClose }) {
  // ── State ─────────────────────────────────────────────────
  const [prediction, setPrediction] = useState(null);
  const [predLoading, setPredLoading] = useState(true);
  const [predError, setPredError] = useState(null);

  const [selectedFeature, setSelectedFeature] = useState(WHATIF_FEATURES[0].key);
  const [sliderValue, setSliderValue] = useState(project[WHATIF_FEATURES[0].key]);
  const [whatifResult, setWhatifResult] = useState(null);
  const [whatifLoading, setWhatifLoading] = useState(false);

  // ── Fetch Prediction on Mount ─────────────────────────────
  useEffect(() => {
    const fetchPrediction = async () => {
      try {
        setPredLoading(true);
        const body = {
          project_id: project.project_id ? Math.abs(Number(project.project_id)) : undefined,
          district: project.district,
          project_type: project.project_type,
          total_acres: Math.abs(parseFloat(project.total_acres) || 0),
          land_acquired_pct: Math.min(100, Math.abs(parseFloat(project.land_acquired_pct) || 0)),
          approval_days_pending: Math.abs(parseInt(project.approval_days_pending, 10) || 0),
          compensation_disbursed_pct: Math.min(100, Math.abs(parseFloat(project.compensation_disbursed_pct) || 0)),
          legal_cases_count: Math.abs(parseInt(project.legal_cases_count, 10) || 0),
          ownership_disputes: Math.abs(parseInt(project.ownership_disputes, 10) || 0),
          rnp_progress_pct: Math.min(100, Math.abs(parseFloat(project.rnp_progress_pct) || 0)),
          possession_pct: Math.min(100, Math.abs(parseFloat(project.possession_pct) || 0)),
          affected_families: Math.abs(parseInt(project.affected_families, 10) || 0),
          doc_deficiency_score: Math.abs(parseFloat(project.doc_deficiency_score) || 0),
          historical_district_delay_avg: Math.abs(parseFloat(project.historical_district_delay_avg) || 0),
        };

        const resp = await api.post('/predict', body);
        setPrediction(resp.data);
        setPredError(null);
      } catch (err) {
        console.error('Prediction failed:', err);
        setPredError(err.response?.data?.detail || err.message);
      } finally {
        setPredLoading(false);
      }
    };

    fetchPrediction();
  }, [project]);

  // ── Handle Feature Select Change ──────────────────────────
  const handleFeatureChange = (featureKey) => {
    setSelectedFeature(featureKey);
    setSliderValue(project[featureKey]);
    setWhatifResult(null);
  };

  // ── Call What-If API ──────────────────────────────────────
  const callWhatIf = useCallback(async (value) => {
    try {
      setWhatifLoading(true);
      const body = {
        project: {
          project_id: project.project_id ? Math.abs(Number(project.project_id)) : undefined,
          district: project.district,
          project_type: project.project_type,
          total_acres: Math.abs(parseFloat(project.total_acres) || 0),
          land_acquired_pct: Math.min(100, Math.abs(parseFloat(project.land_acquired_pct) || 0)),
          approval_days_pending: Math.abs(parseInt(project.approval_days_pending, 10) || 0),
          compensation_disbursed_pct: Math.min(100, Math.abs(parseFloat(project.compensation_disbursed_pct) || 0)),
          legal_cases_count: Math.abs(parseInt(project.legal_cases_count, 10) || 0),
          ownership_disputes: Math.abs(parseInt(project.ownership_disputes, 10) || 0),
          rnp_progress_pct: Math.min(100, Math.abs(parseFloat(project.rnp_progress_pct) || 0)),
          possession_pct: Math.min(100, Math.abs(parseFloat(project.possession_pct) || 0)),
          affected_families: Math.abs(parseInt(project.affected_families, 10) || 0),
          doc_deficiency_score: Math.abs(parseFloat(project.doc_deficiency_score) || 0),
          historical_district_delay_avg: Math.abs(parseFloat(project.historical_district_delay_avg) || 0),
        },
        feature_to_change: selectedFeature,
        new_value: Math.abs(parseFloat(value) || 0),
      };

      const resp = await api.post('/whatif', body);
      setWhatifResult(resp.data);
    } catch (err) {
      console.error('What-If failed:', err);
    } finally {
      setWhatifLoading(false);
    }
  }, [project, selectedFeature]);

  // Debounced slider change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (sliderValue !== project[selectedFeature]) {
        callWhatIf(sliderValue);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [sliderValue, selectedFeature, project, callWhatIf]);

  // ── Helpers ───────────────────────────────────────────────
  const getRiskColor = (score) => {
    if (score >= 75) return RISK_COLORS.Critical;
    if (score >= 50) return RISK_COLORS.High;
    if (score >= 25) return RISK_COLORS.Moderate;
    return RISK_COLORS.Low;
  };

  const currentFeature = WHATIF_FEATURES.find(f => f.key === selectedFeature);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-row">
            <div>
              <h2>Project #{project.project_id} Analysis</h2>
              <p className="modal-subtitle">
                {project.district} • {project.project_type} • {project.total_acres} acres
              </p>
            </div>
            <button className="modal-close" onClick={onClose}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="modal-body">
          {predLoading ? (
            <div className="modal-loading">
              <div className="loader"></div>
              <p>Running ML prediction & SHAP analysis...</p>
            </div>
          ) : predError ? (
            <div className="modal-error">
              <p>⚠️ Prediction failed: {predError}</p>
              <p className="error-hint">Make sure the backend is running.</p>
            </div>
          ) : prediction ? (
            <>
              {/* Risk Score Gauge */}
              <div className="risk-gauge-section">
                <div className="risk-gauge">
                  <div
                    className="risk-gauge-fill"
                    style={{
                      background: `conic-gradient(${getRiskColor(prediction.risk_score)} ${prediction.risk_score * 3.6}deg, rgba(255,255,255,0.05) 0deg)`,
                    }}
                  >
                    <div className="risk-gauge-inner">
                      <span className="gauge-value" style={{ color: getRiskColor(prediction.risk_score) }}>
                        {prediction.risk_score}
                      </span>
                      <span className="gauge-label">{prediction.category}</span>
                    </div>
                  </div>
                </div>
                <div className="recommendation-box">
                  <h4>💡 Recommendation</h4>
                  <p>{prediction.recommendation}</p>
                </div>
              </div>

              {/* Stage-Wise Risk Bars */}
              <div className="section">
                <h3 className="section-title">Stage-Wise Risk Breakdown</h3>
                <div className="stage-bars">
                  {prediction.stage_risks.map((stage) => (
                    <div key={stage.stage} className="stage-row">
                      <div className="stage-label">
                        <span className="stage-icon">{STAGE_ICONS[stage.stage] || '📊'}</span>
                        <span>{stage.stage}</span>
                      </div>
                      <div className="stage-bar-track">
                        <div
                          className="stage-bar-fill"
                          style={{
                            width: `${stage.risk}%`,
                            background: getRiskColor(stage.risk),
                          }}
                        ></div>
                      </div>
                      <span className="stage-value" style={{ color: getRiskColor(stage.risk) }}>
                        {stage.risk}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SHAP Drivers */}
              <div className="section">
                <h3 className="section-title">🔍 Top Delay Drivers (SHAP)</h3>
                <div className="shap-drivers">
                  {prediction.top_drivers.map((driver, i) => (
                    <div key={i} className="shap-driver-card">
                      <div className="shap-rank">#{i + 1}</div>
                      <div className="shap-info">
                        <span className="shap-feature">{driver.feature}</span>
                        <span className={`shap-direction ${driver.direction === 'increases risk' ? 'risk-up' : 'risk-down'}`}>
                          {driver.direction === 'increases risk' ? '⬆' : '⬇'} {driver.direction}
                        </span>
                      </div>
                      <div className="shap-value-bar">
                        <div
                          className="shap-value-fill"
                          style={{
                            width: `${Math.min(Math.abs(driver.shap_value) * 200, 100)}%`,
                            background: driver.shap_value > 0 ? '#ef4444' : '#10b981',
                          }}
                        ></div>
                      </div>
                      <span className="shap-value-num">
                        {driver.shap_value > 0 ? '+' : ''}{driver.shap_value.toFixed(3)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* What-If Simulator */}
              <div className="section whatif-section">
                <h3 className="section-title">🎛️ What-If Simulator</h3>
                <p className="whatif-desc">
                  Adjust a parameter to see how it impacts the predicted risk score.
                </p>

                {/* Feature selector */}
                <div className="whatif-selector">
                  {WHATIF_FEATURES.map((feat) => (
                    <button
                      key={feat.key}
                      className={`whatif-chip ${selectedFeature === feat.key ? 'active' : ''}`}
                      onClick={() => handleFeatureChange(feat.key)}
                    >
                      {feat.label}
                    </button>
                  ))}
                </div>

                {/* Slider */}
                <div className="whatif-slider-section">
                  <div className="slider-header">
                    <span className="slider-label">{currentFeature?.label}</span>
                    <span className="slider-value">{sliderValue}</span>
                  </div>
                  <input
                    type="range"
                    className="whatif-slider"
                    min={currentFeature?.min}
                    max={currentFeature?.max}
                    step={currentFeature?.step}
                    value={sliderValue}
                    onChange={(e) => setSliderValue(parseFloat(e.target.value))}
                  />
                  <div className="slider-range">
                    <span>{currentFeature?.min}</span>
                    <span>Current: {project[selectedFeature]}</span>
                    <span>{currentFeature?.max}</span>
                  </div>
                </div>

                {/* What-If Result */}
                {whatifLoading && (
                  <div className="whatif-loading">
                    <div className="loader small"></div>
                    <span>Recalculating...</span>
                  </div>
                )}

                {whatifResult && !whatifLoading && (
                  <div className="whatif-result">
                    <div className="whatif-comparison">
                      <div className="whatif-box original">
                        <span className="whatif-box-label">Original Risk</span>
                        <span className="whatif-box-value" style={{ color: getRiskColor(whatifResult.original_risk) }}>
                          {whatifResult.original_risk}
                        </span>
                      </div>
                      <div className="whatif-arrow">
                        →
                      </div>
                      <div className="whatif-box modified">
                        <span className="whatif-box-label">New Risk</span>
                        <span className="whatif-box-value" style={{ color: getRiskColor(whatifResult.new_risk) }}>
                          {whatifResult.new_risk}
                        </span>
                      </div>
                      <div className={`whatif-box reduction ${whatifResult.reduction > 0 ? 'positive' : 'negative'}`}>
                        <span className="whatif-box-label">Change</span>
                        <span className="whatif-box-value">
                          {whatifResult.reduction > 0 ? '↓' : '↑'} {Math.abs(whatifResult.reduction).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default DrillDownModal;
