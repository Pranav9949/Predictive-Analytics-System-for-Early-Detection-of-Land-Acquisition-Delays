import React from 'react'
import { AlertCircle, CheckCircle } from 'lucide-react'

export default function AlertFeed({ alerts }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-full flex flex-col items-center justify-center text-center">
        <CheckCircle className="text-green-500 mb-2" size={32} />
        <h3 className="text-lg font-medium text-gray-900">All clear</h3>
        <p className="text-sm text-gray-500">No new high-risk alerts.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-[500px]">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center rounded-t-lg">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <AlertCircle size={18} className="text-red-500" />
          Live Alert Feed
        </h3>
        <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">
          {alerts.length} New
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {alerts.map((alert) => (
          <div key={alert.project_id} className="border-l-4 border-red-500 bg-red-50 p-4 rounded-r-md">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-semibold text-gray-900 text-sm">
                Project #{alert.project_id} - Risk: {alert.risk_score}
              </h4>
            </div>
            <p className="text-xs text-gray-700 mb-2 font-medium">
              {alert.alert_message}
            </p>
            <div className="bg-white bg-opacity-60 p-2 rounded text-xs text-red-800 border border-red-100 mb-3">
              <span className="font-bold">Recommended:</span> {alert.recommended_action}
            </div>
            <button className="text-xs bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-50 transition-colors">
              Mark as Reviewed
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
