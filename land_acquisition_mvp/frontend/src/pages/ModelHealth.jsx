import React, { useState } from 'react'
import { API_BASE } from '../App'
import { useRole } from '../context/RoleContext'
import { Activity, Cpu, ArrowRight, ShieldCheck } from 'lucide-react'

export default function ModelHealth() {
  const { currentRole, setRole, roleInfo, token } = useRole()
  const [feedback, setFeedback] = useState({ project_id: '', actual_delay_days: '' })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const isAuthorized = currentRole === 'Collector' || currentRole === 'Policy Maker'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    try {
      const authToken = token || localStorage.getItem('auth_token')
      const headers = { 
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
      const res = await fetch(`${API_BASE}/feedback/outcome`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          project_id: parseInt(feedback.project_id),
          actual_delay_days: parseInt(feedback.actual_delay_days)
        })
      })
      if (res.ok) {
        setResult(await res.json())
        setFeedback({ project_id: '', actual_delay_days: '' })
      } else {
        alert("Failed to submit feedback")
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthorized) {
    return (
      <div className="p-8 max-w-4xl mx-auto w-full">
        <div className="bg-white border border-amber-200 rounded-2xl p-8 shadow-xs text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center">
            <ShieldCheck size={28} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            Model Governance & Continuous Learning
          </h2>
          <p className="text-sm text-gray-600 max-w-lg mx-auto">
            You are currently viewing as <strong>{currentRole}</strong>. Model Health diagnostics, error logging, and continuous retraining triggers are governed by <strong>District Collectors</strong> and <strong>Policy Makers</strong>.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => setRole('Collector')}
              className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-xs transition-colors"
            >
              Switch to Collector Persona <ArrowRight size={14} />
            </button>
            <button
              onClick={() => setRole('Policy Maker')}
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-xs transition-colors"
            >
              Switch to Policy Maker <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-5xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Model Health & Continuous Learning</h1>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${roleInfo.badgeColor}`}>
              {currentRole} Oversight
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Real-time diagnostics, performance drift monitoring, and closed-loop continuous retraining triggers.
          </p>
        </div>
      </div>

      {/* Status Cards */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6">
        <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
          Active ML Pipeline State (XGBoost + SHAP)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50/80 border border-gray-100 p-4 rounded-xl text-center">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Accuracy (ROC-AUC)</div>
            <div className="text-3xl font-extrabold text-gray-900 mt-1">96.2%</div>
          </div>
          <div className="bg-gray-50/80 border border-gray-100 p-4 rounded-xl text-center">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Macro F1 Score</div>
            <div className="text-3xl font-extrabold text-gray-900 mt-1">0.950</div>
          </div>
          <div className="bg-gray-50/80 border border-gray-100 p-4 rounded-xl text-center">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Training Samples</div>
            <div className="text-3xl font-extrabold text-gray-900 mt-1">4,000+</div>
          </div>
        </div>
      </div>

      {/* Continuous Learning Simulation Form */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6">
        <h2 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Cpu className="text-blue-600" size={18} />
          Simulate Project Outcome (Feedback Loop)
        </h2>
        <p className="text-xs text-gray-600 mb-6">
          Submit the ground-truth actual delay for a completed project. When 50 cumulative verified outcomes are registered, the model triggers an automated background retraining cycle.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="w-full sm:w-1/3">
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Project ID</label>
            <input 
              type="number" 
              required
              value={feedback.project_id}
              onChange={e => setFeedback({...feedback, project_id: e.target.value})}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" 
              placeholder="e.g. 5001"
            />
          </div>
          <div className="w-full sm:w-1/3">
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Actual Delay (Days)</label>
            <input 
              type="number" 
              required
              value={feedback.actual_delay_days}
              onChange={e => setFeedback({...feedback, actual_delay_days: e.target.value})}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" 
              placeholder="e.g. 45"
            />
          </div>
          <div className="w-full sm:w-1/3">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs"
            >
              {loading ? 'Submitting...' : 'Submit Ground Truth'}
            </button>
          </div>
        </form>

        {result && (
          <div className="mt-6 bg-emerald-50/70 border border-emerald-200 rounded-xl p-4">
            <h3 className="font-bold text-emerald-900 text-sm mb-2">Outcome Feedback Processed:</h3>
            <ul className="text-xs text-emerald-800 space-y-1.5 font-medium">
              <li>Prediction Error: <span className="font-bold text-emerald-950">{result.prediction_error}</span></li>
              <li>Feedback Queue: <span className="font-bold text-emerald-950">{result.unused_entries_count} / 50</span></li>
              <li>Retraining Triggered: <span className="font-bold text-emerald-950">{result.retraining_triggered ? 'Yes (Retrained)' : 'No (Queued)'}</span></li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
