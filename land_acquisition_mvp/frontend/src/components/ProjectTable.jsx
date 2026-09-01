import React, { useState } from 'react'
import InterventionModal from './InterventionModal'

export default function ProjectTable({ data, onInterventionUpdate }) {
  const [search, setSearch] = useState('')
  const [selectedProject, setSelectedProject] = useState(null)
  const [page, setPage] = useState(0)
  const rowsPerPage = 10

  const filtered = data.filter(d => 
    d.district.toLowerCase().includes(search.toLowerCase()) ||
    (d.project_name || '').toLowerCase().includes(search.toLowerCase())
  )

  const sorted = [...filtered].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
  const paginated = sorted.slice(page * rowsPerPage, (page + 1) * rowsPerPage)

  const totalPages = Math.ceil(sorted.length / rowsPerPage)

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <input
          type="text"
          placeholder="Search by District or Project Name..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="w-1/3 rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900"
        />
        <div className="text-sm text-gray-500">
          Showing {page * rowsPerPage + 1} - {Math.min((page + 1) * rowsPerPage, sorted.length)} of {sorted.length} projects
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-gray-900 uppercase text-xs font-semibold">
            <tr>
              <th className="px-4 py-3">Project ID</th>
              <th className="px-4 py-3">District</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Risk Score</th>
              <th className="px-4 py-3">Intervention Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {paginated.map((row) => (
              <tr key={row.project_id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">#{row.project_id}</td>
                <td className="px-4 py-3">{row.district}</td>
                <td className="px-4 py-3">{row.project_type}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                    ${row.risk_score >= 75 ? 'bg-red-100 text-red-800' : 
                      row.risk_score >= 50 ? 'bg-orange-100 text-orange-800' : 
                      row.risk_score >= 25 ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-green-100 text-green-800'}`}
                  >
                    {row.risk_score.toFixed(1)}%
                  </span>
                </td>
                <td className="px-4 py-3">
                  {row.intervention_taken ? (
                    <span className="text-green-600 font-medium text-xs border border-green-200 bg-green-50 px-2 py-1 rounded">
                      ✅ Logged: {row.intervention_taken}
                    </span>
                  ) : row.risk_score >= 50 ? (
                    <span className="text-red-600 font-medium text-xs border border-red-200 bg-red-50 px-2 py-1 rounded">
                      ⚠️ Action Required
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setSelectedProject(row)}
                    className="text-blue-600 hover:text-blue-800 font-medium text-xs bg-blue-50 px-3 py-1.5 rounded hover:bg-blue-100 transition-colors"
                  >
                    Investigate & Act
                  </button>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                  No projects found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          className="rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 disabled:opacity-50 hover:bg-gray-50"
        >
          Previous
        </button>
        <div className="text-sm text-gray-500">
          Page {page + 1} of {totalPages || 1}
        </div>
        <button
          onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
          disabled={page >= totalPages - 1}
          className="rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 disabled:opacity-50 hover:bg-gray-50"
        >
          Next
        </button>
      </div>

      {selectedProject && (
        <InterventionModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onUpdate={onInterventionUpdate}
        />
      )}
    </div>
  )
}
