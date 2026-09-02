import React, { useState, useEffect } from 'react'
import { API_BASE } from '../App'
import { useRole } from '../context/RoleContext'
import {
  Activity,
  Cpu,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Database,
  BarChart2,
  RefreshCw,
  SlidersHorizontal,
  Lock
} from 'lucide-react'

export default function ModelHealth() {
  const { currentRole, setRole, roleInfo, token } = useRole()
  const [modelHealth, setModelHealth] = useState(null)
  const [healthLoading, setHealthLoading] = useState(true)
  const [feedback, setFeedback] = useState({ project_id: '', actual_delay_days: '' })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const isAuthorized = currentRole === 'Collector' || currentRole === 'Policy Maker'

  useEffect(() => {
    const fetchModelHealth = async () => {
      try {
        setHealthLoading(true)
        const res = await fetch(`${API_BASE}/model/health`)
        if (res.ok) {
          const data = await res.json()
          setModelHealth(data)
        }
      } catch (err) {
        console.error('Failed to load model health:', err)
      } finally {
        setHealthLoading(false)
      }
    }

    fetchModelHealth()
  }, [])

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
            You are currently viewing as <strong>{currentRole}</strong>. Model Health diagnostics, test set evaluation metrics, and retraining triggers are governed by <strong>District Collectors</strong> and <strong>Policy Makers</strong>.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => setRole('Collector')}
              className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Switch to Collector Persona <ArrowRight size={14} />
            </button>
            <button
              onClick={() => setRole('Policy Maker')}
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Switch to Policy Maker <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Model Health & Governance</h1>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${roleInfo.badgeColor}`}>
              {currentRole} Oversight
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Genuine model evaluation metrics, test set performance, strict data leakage boundaries, and outcome feedback.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
          <span className="text-xs font-bold text-emerald-800">
            {modelHealth?.status || 'Model Operational'}
          </span>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      {healthLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500 flex items-center justify-center gap-3">
          <RefreshCw size={18} className="animate-spin text-blue-600" />
          <span>Fetching live model diagnostics from ML pipeline...</span>
        </div>
      ) : modelHealth ? (
        <div className="space-y-8">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-white border border-gray-200 p-4 rounded-xl text-center shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">ROC-AUC</div>
              <div className="text-2xl font-black text-blue-600 mt-1">{modelHealth.roc_auc}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">Test Set Benchmark</div>
            </div>

            <div className="bg-white border border-gray-200 p-4 rounded-xl text-center shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Delay Recall</div>
              <div className="text-2xl font-black text-emerald-600 mt-1">{(modelHealth.recall * 100).toFixed(1)}%</div>
              <div className="text-[10px] text-gray-400 mt-0.5">Early Detection Focus</div>
            </div>

            <div className="bg-white border border-gray-200 p-4 rounded-xl text-center shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Precision</div>
              <div className="text-2xl font-black text-indigo-600 mt-1">{(modelHealth.precision * 100).toFixed(1)}%</div>
              <div className="text-[10px] text-gray-400 mt-0.5">Delay Class Precision</div>
            </div>

            <div className="bg-white border border-gray-200 p-4 rounded-xl text-center shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">F1 Score</div>
              <div className="text-2xl font-black text-purple-600 mt-1">{modelHealth.f1_score}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">Harmonic Mean</div>
            </div>

            <div className="bg-white border border-gray-200 p-4 rounded-xl text-center shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Accuracy</div>
              <div className="text-2xl font-black text-gray-900 mt-1">{(modelHealth.accuracy * 100).toFixed(1)}%</div>
              <div className="text-[10px] text-gray-400 mt-0.5">Overall Correct</div>
            </div>

            <div className="bg-white border border-gray-200 p-4 rounded-xl text-center shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Test Samples</div>
              <div className="text-2xl font-black text-gray-900 mt-1">{modelHealth.test_size}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">Out-of-Sample Eval</div>
            </div>
          </div>

          {/* Model Specification & Confusion Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Model Architecture & Features Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Cpu size={18} className="text-blue-600" />
                  Active Model Configuration
                </h2>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  {modelHealth.model_name}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-gray-500 block">Model Version</span>
                  <span className="font-bold text-gray-900">{modelHealth.model_version}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-gray-500 block">Prediction Target</span>
                  <span className="font-bold text-gray-900">{modelHealth.prediction_target} (Binary 0/1)</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-gray-500 block">Training Features</span>
                  <span className="font-bold text-gray-900">{modelHealth.raw_features_count} Raw ({modelHealth.encoded_features_count} Encoded)</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-gray-500 block">Training Sample Size</span>
                  <span className="font-bold text-gray-900">{modelHealth.train_size} Projects</span>
                </div>
              </div>

              <div className="text-xs text-gray-600 space-y-1 pt-2">
                <div className="font-semibold text-gray-800">Evaluation Strategy:</div>
                <p className="text-[11px] bg-blue-50/50 p-2.5 rounded-lg border border-blue-100 text-blue-900">
                  {modelHealth.evaluation_strategy}
                </p>
                <div className="text-[10px] text-gray-400 pt-1">
                  Last Retrained Timestamp: {modelHealth.timestamp}
                </div>
              </div>
            </div>

            {/* Actual Confusion Matrix */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <BarChart2 size={18} className="text-indigo-600" />
                  Test Set Confusion Matrix (n={modelHealth.test_size})
                </h2>
                <span className="text-xs font-semibold text-gray-500">
                  Out-of-sample evaluation
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl text-center">
                  <div className="text-xs font-semibold text-emerald-800">True Negatives (TN)</div>
                  <div className="text-3xl font-black text-emerald-700 mt-1">
                    {modelHealth.confusion_matrix.true_negatives}
                  </div>
                  <div className="text-[10px] text-emerald-600 mt-1 font-medium">
                    Correctly Predicted On-Time
                  </div>
                </div>

                <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl text-center">
                  <div className="text-xs font-semibold text-amber-800">False Positives (FP)</div>
                  <div className="text-3xl font-black text-amber-700 mt-1">
                    {modelHealth.confusion_matrix.false_positives}
                  </div>
                  <div className="text-[10px] text-amber-600 mt-1 font-medium">
                    Precautionary Over-Warning
                  </div>
                </div>

                <div className="p-4 bg-red-50/60 border border-red-200 rounded-xl text-center">
                  <div className="text-xs font-semibold text-red-800">False Negatives (FN)</div>
                  <div className="text-3xl font-black text-red-700 mt-1">
                    {modelHealth.confusion_matrix.false_negatives}
                  </div>
                  <div className="text-[10px] text-red-600 mt-1 font-medium">
                    Missed Delays (Minimized)
                  </div>
                </div>

                <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl text-center">
                  <div className="text-xs font-semibold text-blue-800">True Positives (TP)</div>
                  <div className="text-3xl font-black text-blue-700 mt-1">
                    {modelHealth.confusion_matrix.true_positives}
                  </div>
                  <div className="text-[10px] text-blue-600 mt-1 font-medium">
                    Correct Early Delay Detected
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Data Leakage Prevention Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Lock size={18} className="text-emerald-600" />
              Strict Data Leakage Prevention Contract
            </h2>
            <p className="text-xs text-gray-500">
              In accordance with official SIH guidelines, only variables available at prediction time are used. Target, identifiers, and post-prediction outcomes are strictly quarantined.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  Allowed Prediction-Time Features (13)
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {modelHealth.prediction_features.map((feat) => (
                    <span key={feat} className="text-[11px] font-semibold bg-white border border-emerald-200 text-emerald-900 px-2 py-0.5 rounded-md shadow-xs">
                      {feat}
                    </span>
                  ))}
                </div>
              </div>

              <div className="border border-red-200 bg-red-50/40 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-red-800 uppercase tracking-wider">
                  <AlertCircle size={16} className="text-red-600" />
                  Quarantined Outcome & Leakage Columns (6)
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {modelHealth.leakage_prevented_columns.map((col) => (
                    <span key={col} className="text-[11px] font-semibold bg-white border border-red-200 text-red-900 px-2 py-0.5 rounded-md shadow-xs line-through">
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Continuous Learning Feedback Loop */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6 space-y-4">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <Database className="text-blue-600" size={18} />
          Closed-Loop Continuous Retraining Pipeline
        </h2>
        <p className="text-xs text-gray-600">
          Submit ground-truth actual delay outcomes for completed projects. When 50 cumulative verified outcomes accumulate, the system triggers a controlled background retraining cycle and logs drift metrics.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 items-end pt-2">
          <div className="w-full sm:w-1/3">
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Project ID</label>
            <input
              type="number"
              required
              value={feedback.project_id}
              onChange={e => setFeedback({ ...feedback, project_id: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="e.g. 5001"
            />
          </div>
          <div className="w-full sm:w-1/3">
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Confirmed Actual Delay (Days)</label>
            <input
              type="number"
              required
              value={feedback.actual_delay_days}
              onChange={e => setFeedback({ ...feedback, actual_delay_days: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="e.g. 45"
            />
          </div>
          <div className="w-full sm:w-1/3">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer text-sm"
            >
              {loading ? 'Submitting Outcome...' : 'Submit Ground Truth'}
            </button>
          </div>
        </form>

        {result && (
          <div className="mt-4 bg-emerald-50/80 border border-emerald-200 rounded-xl p-4">
            <h3 className="font-bold text-emerald-900 text-xs mb-2">Outcome Registered in Retraining Queue:</h3>
            <ul className="text-xs text-emerald-800 space-y-1.5 font-medium">
              <li>Prediction Error: <span className="font-bold text-emerald-950">{result.prediction_error}</span></li>
              <li>Queue Accumulation: <span className="font-bold text-emerald-950">{result.unused_entries_count} / 50</span></li>
              <li>Retraining Triggered: <span className="font-bold text-emerald-950">{result.retraining_triggered ? 'Yes (Retrained)' : 'No (Queued)'}</span></li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
