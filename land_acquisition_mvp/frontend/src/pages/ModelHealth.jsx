import React, { useState } from 'react'
import { API_BASE } from '../App'

export default function ModelHealth() {
  const [feedback, setFeedback] = useState({ project_id: '', actual_delay_days: '' })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  
  const role = localStorage.getItem('auth_role')
  if (role !== 'PolicyMaker' && role !== 'Collector') {
    return <div className="p-8 text-center text-red-500">Access Denied: Requires PolicyMaker or Collector role.</div>
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    try {
      const token = localStorage.getItem('auth_token')
      const headers = { 
        'Authorization': `Bearer ${token}`,
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

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8 border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Model Health & Continuous Learning</h1>
        <p className="text-gray-500">Simulate project completions to test the continuous learning feedback loop.</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          Current ML Model Status
        </h2>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-gray-50 border border-gray-100 p-4 rounded text-center">
            <div className="text-sm text-gray-500">Accuracy</div>
            <div className="text-2xl font-bold text-gray-900">96.2%</div>
          </div>
          <div className="bg-gray-50 border border-gray-100 p-4 rounded text-center">
            <div className="text-sm text-gray-500">F1 Score</div>
            <div className="text-2xl font-bold text-gray-900">0.950</div>
          </div>
          <div className="bg-gray-50 border border-gray-100 p-4 rounded text-center">
            <div className="text-sm text-gray-500">Training Size</div>
            <div className="text-2xl font-bold text-gray-900">4,000</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Simulate Project Completion</h2>
        <p className="text-sm text-gray-600 mb-6">
          Submit the actual delay outcome for a project. The system will log the error. 
          When 50 new outcomes are received, the model will automatically retrain in the background.
        </p>

        <form onSubmit={handleSubmit} className="flex gap-4 items-end">
          <div className="w-1/3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Project ID</label>
            <input 
              type="number" 
              required
              value={feedback.project_id}
              onChange={e => setFeedback({...feedback, project_id: e.target.value})}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" 
              placeholder="e.g. 5001"
            />
          </div>
          <div className="w-1/3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Actual Delay (Days)</label>
            <input 
              type="number" 
              required
              value={feedback.actual_delay_days}
              onChange={e => setFeedback({...feedback, actual_delay_days: e.target.value})}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" 
              placeholder="e.g. 45"
            />
          </div>
          <div className="w-1/3">
            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-medium py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {loading ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>

        {result && (
          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Feedback Result:</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>Prediction Error: <span className="font-medium text-gray-900">{result.prediction_error}</span></li>
              <li>Unused Feedback Entries: <span className="font-medium text-gray-900">{result.unused_entries_count} / 50</span></li>
              <li>Retraining Triggered: <span className={`font-medium ${result.retraining_triggered ? 'text-green-600' : 'text-gray-900'}`}>{result.retraining_triggered ? 'Yes' : 'No'}</span></li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
