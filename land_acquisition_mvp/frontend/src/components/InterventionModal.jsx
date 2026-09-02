import React, { useEffect, useState } from 'react'
import api from '../services/api'

export default function InterventionModal({ project, onClose, onUpdate }) {
  const [prediction, setPrediction] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [action, setAction] = useState('')

  useEffect(() => {
    const getPrediction = async () => {
      try {
        const res = await api.post('/predict', project)
        setPrediction(res.data)
      } catch (err) {
        console.error('Failed to get prediction in modal:', err)
      } finally {
        setLoading(false)
      }
    }
    
    getPrediction()
  }, [project])

  const handleSubmitIntervention = async (e) => {
    e.preventDefault()
    if (!action) return
    
    setSubmitting(true)
    try {
      const res = await api.put('/projects/status', {
        project_id: project.project_id,
        intervention_taken: action
      })
      
      if (res.status === 200 || res.data) {
        if (onUpdate) onUpdate()
        onClose()
      } else {
        alert("Failed to submit intervention.")
      }
    } catch (err) {
      console.error('Failed to submit intervention:', err)
      alert(err.response?.data?.detail || "Failed to submit intervention.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-4xl rounded-lg bg-white shadow-2xl flex flex-col max-h-[90vh]">
        
        <div className="flex items-center justify-between border-b border-gray-200 p-6 bg-gray-50 rounded-t-lg">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Intervention Command: {project.project_name || `Project #${project.project_id}`}
            </h2>
            <p className="text-sm text-gray-500">{project.district} • {project.project_type}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-200 transition-colors">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center text-gray-500 py-12">Analyzing project risk...</div>
          ) : prediction ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Left Column: ML Insights */}
              <div className="space-y-6">
                <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-2">Current Risk Score</h3>
                  <div className="flex items-end gap-3 mb-2">
                    <span className={`text-4xl font-bold ${
                      prediction.risk_score >= 75 ? 'text-red-600' :
                      prediction.risk_score >= 50 ? 'text-orange-600' : 'text-green-600'
                    }`}>
                      {prediction.risk_score.toFixed(1)}%
                    </span>
                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
                      {prediction.category}
                    </span>
                  </div>
                  
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Top Risk Drivers (SHAP)</h4>
                    <div className="space-y-3">
                      {prediction.top_drivers.map((d, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{d.feature}</span>
                          <span className={`text-xs font-medium px-2 py-1 rounded ${
                            d.direction === 'increases risk' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'
                          }`}>
                            {d.direction}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-3">System Recommendation</h3>
                  <p className="text-sm text-gray-700 leading-relaxed bg-blue-50 border border-blue-100 p-3 rounded">
                    {prediction.recommendation}
                  </p>
                </div>
              </div>

              {/* Right Column: Action Form */}
              <div className="space-y-6">
                <form onSubmit={handleSubmitIntervention} className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-xs">1</span>
                    Select Intervention Action
                  </h3>
                  
                  <div className="space-y-3 mb-6">
                    {['Escalate Compensation Disbursement', 'Schedule Joint Court Hearing', 'Ownership Verification Drive', 'Expedite Single-Window Clearance', 'Deploy Survey Teams'].map((opt) => (
                      <label key={opt} className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition-colors ${action === opt ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <input
                          type="radio"
                          name="action"
                          value={opt}
                          checked={action === opt}
                          onChange={(e) => setAction(e.target.value)}
                          className="text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                        <span className="text-sm font-medium text-gray-700">{opt}</span>
                      </label>
                    ))}
                  </div>
                  
                  <button
                    type="submit"
                    disabled={!action || submitting}
                    className="w-full bg-blue-600 text-white font-medium py-2.5 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    {submitting ? 'Logging...' : 'Submit & Notify Teams'}
                  </button>
                  
                  {project.intervention_taken && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                      <strong>Previously Logged:</strong> {project.intervention_taken}
                    </div>
                  )}
                </form>
              </div>

            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
