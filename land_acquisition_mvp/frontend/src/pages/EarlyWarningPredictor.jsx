import React, { useState, useEffect, useRef } from 'react'
import api from '../services/api'
import { useRole } from '../context/RoleContext'
import {
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Sparkles,
  Layers,
  FileCheck,
  Building2,
  TrendingDown,
  Send,
  RefreshCw,
  ShieldAlert,
  ArrowRight,
  Search,
  X
} from 'lucide-react'

// Section 8 Pune Highway sample from the official SIH specification
const SAMPLE_PRESETS = {
  puneHighway: {
    name: 'Pune Highway (High Risk)',
    data: {
      district: 'Pune',
      project_type: 'Highway',
      total_acres: 250,
      land_acquired_pct: 62,
      approval_days_pending: 96,
      compensation_disbursed_pct: 38,
      legal_cases_count: 8,
      ownership_disputes: 5,
      rnp_progress_pct: 42,
      possession_pct: 25,
      affected_families: 180,
      doc_deficiency_score: 35,
      historical_district_delay_avg: 18,
      project_id: 101,
      project_name: 'Pune-Solapur Highway Expansion #101',
    }
  },
  nagpurMetro: {
    name: 'Nagpur Metro (Low Risk Sample)',
    data: {
      district: 'Nagpur',
      project_type: 'Metro',
      total_acres: 120,
      land_acquired_pct: 92,
      approval_days_pending: 15,
      compensation_disbursed_pct: 95,
      legal_cases_count: 1,
      ownership_disputes: 1,
      rnp_progress_pct: 88,
      possession_pct: 85,
      affected_families: 45,
      doc_deficiency_score: 10,
      historical_district_delay_avg: 12,
      project_id: 202,
      project_name: 'Nagpur Metro Corridor Phase II #202',
    }
  },
  nashikRailway: {
    name: 'Nashik Railway (Moderate Risk Sample)',
    data: {
      district: 'Nashik',
      project_type: 'Railway',
      total_acres: 380,
      land_acquired_pct: 75,
      approval_days_pending: 45,
      compensation_disbursed_pct: 60,
      legal_cases_count: 3,
      ownership_disputes: 4,
      rnp_progress_pct: 65,
      possession_pct: 55,
      affected_families: 210,
      doc_deficiency_score: 25,
      historical_district_delay_avg: 22,
      project_id: 303,
      project_name: 'Nashik-Pune Semi High-Speed Rail #303',
    }
  },
  aurangabadIrrigation: {
    name: 'Aurangabad Irrigation (Critical Risk Sample)',
    data: {
      district: 'Aurangabad',
      project_type: 'Irrigation',
      total_acres: 540,
      land_acquired_pct: 35,
      approval_days_pending: 110,
      compensation_disbursed_pct: 22,
      legal_cases_count: 11,
      ownership_disputes: 9,
      rnp_progress_pct: 18,
      possession_pct: 15,
      affected_families: 420,
      doc_deficiency_score: 65,
      historical_district_delay_avg: 28,
      project_id: 404,
      project_name: 'Marathwada Canal Storage Project #404',
    }
  }
}

export default function EarlyWarningPredictor() {
  const { currentRole, roleInfo } = useRole()

  const [formData, setFormData] = useState(SAMPLE_PRESETS.puneHighway.data)
  const [activePresetKey, setActivePresetKey] = useState('puneHighway')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [prediction, setPrediction] = useState(null)

  // Project Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1)
  const [selectedProjectMeta, setSelectedProjectMeta] = useState({
    formatted_id: 'PRJ-2026-0101',
    project_id: 101,
    project_name: 'Pune-Solapur Highway Expansion #101',
    district: 'Pune',
    project_type: 'Highway',
    source: 'preset',
    presetLabel: 'Pune Highway (High Risk)'
  })

  const searchContainerRef = useRef(null)
  const searchInputRef = useRef(null)

  // What-If Simulation State
  const [whatifFeature, setWhatifFeature] = useState('compensation_disbursed_pct')
  const [whatifValue, setWhatifValue] = useState(75)
  const [whatifResult, setWhatifResult] = useState(null)
  const [whatifLoading, setWhatifLoading] = useState(false)

  // Intervention State
  const [interventionText, setInterventionText] = useState('')
  const [interventionDate, setInterventionDate] = useState(new Date().toISOString().split('T')[0])
  const [interventionSubmitting, setInterventionSubmitting] = useState(false)
  const [interventionSuccess, setInterventionSuccess] = useState(false)

  const handleInputChange = (field, value) => {
    const integerFields = ['approval_days_pending', 'legal_cases_count', 'ownership_disputes', 'affected_families', 'project_id']
    const floatFields = ['total_acres', 'land_acquired_pct', 'compensation_disbursed_pct', 'rnp_progress_pct', 'possession_pct', 'doc_deficiency_score', 'historical_district_delay_avg']
    
    let processedValue = value
    if (value !== '' && value !== null && value !== undefined) {
      if (integerFields.includes(field)) {
        const num = parseInt(value, 10)
        if (!isNaN(num)) processedValue = Math.abs(num)
      } else if (floatFields.includes(field)) {
        const num = parseFloat(value)
        if (!isNaN(num)) processedValue = Math.abs(num)
      }
    }
    setFormData(prev => ({ ...prev, [field]: processedValue }))
  }

  const loadPreset = (presetKey) => {
    const preset = SAMPLE_PRESETS[presetKey]
    if (preset) {
      setFormData(preset.data)
      setActivePresetKey(presetKey)
      setSelectedProjectMeta({
        formatted_id: `PRJ-2026-${String(preset.data.project_id).padStart(4, '0')}`,
        project_id: preset.data.project_id,
        project_name: preset.data.project_name,
        district: preset.data.district,
        project_type: preset.data.project_type,
        source: 'preset',
        presetLabel: preset.name
      })
      setPrediction(null)
      setWhatifResult(null)
      setInterventionSuccess(false)
      setError(null)
      setSearchQuery('')
      setSearchResults([])
      setSearchOpen(false)
    }
  }

  // Search Debounce Effect
  useEffect(() => {
    const q = searchQuery.trim()
    if (!q) {
      setSearchResults([])
      setSearchLoading(false)
      return
    }

    setSearchLoading(true)
    const timeoutId = setTimeout(async () => {
      try {
        const res = await api.get('/projects/search', {
          params: { q, limit: 10 }
        })
        setSearchResults(res.data || [])
      } catch (err) {
        console.error('Project search error:', err)
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    }, 250)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  // Click Outside to Dismiss Search Dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle Search Result Selection
  const handleSelectProject = (project) => {
    setFormData({
      district: project.district || 'Pune',
      project_type: project.project_type || 'Highway',
      total_acres: Math.abs(Number(project.total_acres) || 0),
      land_acquired_pct: Math.min(100, Math.abs(Number(project.land_acquired_pct) || 0)),
      approval_days_pending: Math.abs(Number(project.approval_days_pending) || 0),
      compensation_disbursed_pct: Math.min(100, Math.abs(Number(project.compensation_disbursed_pct) || 0)),
      legal_cases_count: Math.abs(Number(project.legal_cases_count) || 0),
      ownership_disputes: Math.abs(Number(project.ownership_disputes) || 0),
      rnp_progress_pct: Math.min(100, Math.abs(Number(project.rnp_progress_pct) || 0)),
      possession_pct: Math.min(100, Math.abs(Number(project.possession_pct) || 0)),
      affected_families: Math.abs(Number(project.affected_families) || 0),
      doc_deficiency_score: Math.abs(Number(project.doc_deficiency_score) || 0),
      historical_district_delay_avg: Math.abs(Number(project.historical_district_delay_avg) || 0),
      project_id: project.project_id ? Math.abs(Number(project.project_id)) : undefined,
      project_name: project.project_name
    })

    setSelectedProjectMeta({
      formatted_id: project.formatted_id || `PRJ-2026-${String(project.project_id).padStart(4, '0')}`,
      project_id: project.project_id ? Math.abs(Number(project.project_id)) : undefined,
      project_name: project.project_name,
      district: project.district,
      project_type: project.project_type,
      risk_score: project.risk_score !== undefined && project.risk_score !== null ? Math.abs(Number(project.risk_score)) : undefined,
      risk_category: project.risk_category,
      source: 'database'
    })

    setActivePresetKey(null)
    setSearchQuery('')
    setSearchResults([])
    setSearchOpen(false)
    setPrediction(null)
    setWhatifResult(null)
    setInterventionSuccess(false)
    setError(null)
  }

  // Keyboard navigation inside search dropdown
  const handleSearchKeyDown = (e) => {
    if (!searchOpen || searchResults.length === 0) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setSearchOpen(true)
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveSearchIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveSearchIndex(prev => (prev > 0 ? prev - 1 : searchResults.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeSearchIndex >= 0 && activeSearchIndex < searchResults.length) {
        handleSelectProject(searchResults[activeSearchIndex])
      }
    } else if (e.key === 'Escape') {
      setSearchOpen(false)
    }
  }

  const handleChangeProject = () => {
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
    setSearchOpen(true)
  }

  const handlePredict = async (e) => {
    if (e) e.preventDefault()
    setLoading(true)
    setError(null)
    setInterventionSuccess(false)

    try {
      // Send strictly the 13 prediction-time features using absolute values
      const payload = {
        district: formData.district,
        project_type: formData.project_type,
        total_acres: Math.abs(parseFloat(formData.total_acres) || 0),
        land_acquired_pct: Math.min(100, Math.abs(parseFloat(formData.land_acquired_pct) || 0)),
        approval_days_pending: Math.abs(parseInt(formData.approval_days_pending, 10) || 0),
        compensation_disbursed_pct: Math.min(100, Math.abs(parseFloat(formData.compensation_disbursed_pct) || 0)),
        legal_cases_count: Math.abs(parseInt(formData.legal_cases_count, 10) || 0),
        ownership_disputes: Math.abs(parseInt(formData.ownership_disputes, 10) || 0),
        rnp_progress_pct: Math.min(100, Math.abs(parseFloat(formData.rnp_progress_pct) || 0)),
        possession_pct: Math.min(100, Math.abs(parseFloat(formData.possession_pct) || 0)),
        affected_families: Math.abs(parseInt(formData.affected_families, 10) || 0),
        doc_deficiency_score: Math.abs(parseFloat(formData.doc_deficiency_score) || 0),
        historical_district_delay_avg: Math.abs(parseFloat(formData.historical_district_delay_avg) || 0),
        project_id: formData.project_id ? Math.abs(parseInt(formData.project_id, 10)) : undefined,
        project_name: formData.project_name || undefined
      }

      const res = await api.post('/predict', payload)
      setPrediction(res.data)

      // Initialize What-If slider with improved compensation
      setWhatifFeature('compensation_disbursed_pct')
      setWhatifValue(Math.min(100, Math.round(Math.abs(parseFloat(formData.compensation_disbursed_pct) || 0) + 35)))
      setWhatifResult(null)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Prediction request failed')
    } finally {
      setLoading(false)
    }
  }

  const handleRunWhatIf = async () => {
    if (!prediction) return
    setWhatifLoading(true)
    try {
      const payload = {
        project: {
          district: formData.district,
          project_type: formData.project_type,
          total_acres: Math.abs(parseFloat(formData.total_acres) || 0),
          land_acquired_pct: Math.min(100, Math.abs(parseFloat(formData.land_acquired_pct) || 0)),
          approval_days_pending: Math.abs(parseInt(formData.approval_days_pending, 10) || 0),
          compensation_disbursed_pct: Math.min(100, Math.abs(parseFloat(formData.compensation_disbursed_pct) || 0)),
          legal_cases_count: Math.abs(parseInt(formData.legal_cases_count, 10) || 0),
          ownership_disputes: Math.abs(parseInt(formData.ownership_disputes, 10) || 0),
          rnp_progress_pct: Math.min(100, Math.abs(parseFloat(formData.rnp_progress_pct) || 0)),
          possession_pct: Math.min(100, Math.abs(parseFloat(formData.possession_pct) || 0)),
          affected_families: Math.abs(parseInt(formData.affected_families, 10) || 0),
          doc_deficiency_score: Math.abs(parseFloat(formData.doc_deficiency_score) || 0),
          historical_district_delay_avg: Math.abs(parseFloat(formData.historical_district_delay_avg) || 0),
          project_id: formData.project_id ? Math.abs(parseInt(formData.project_id, 10)) : undefined,
        },
        feature_to_change: whatifFeature,
        new_value: Math.abs(parseFloat(whatifValue) || 0)
      }

      const res = await api.post('/whatif', payload)
      setWhatifResult(res.data)
    } catch (err) {
      console.error('What-If calculation error:', err)
    } finally {
      setWhatifLoading(false)
    }
  }

  const handleLogIntervention = async (e) => {
    e.preventDefault()
    if (!interventionText) return

    setInterventionSubmitting(true)
    try {
      const projId = formData.project_id ? parseInt(formData.project_id, 10) : 101
      const res = await api.put('/projects/status', {
        project_id: projId,
        intervention_taken: interventionText,
        intervention_date: interventionDate
      })

      if (res.status === 200 || res.data) {
        setInterventionSuccess(true)
      }
    } catch (err) {
      console.error('Intervention log failed:', err)
    } finally {
      setInterventionSubmitting(false)
    }
  }

  const getRiskBadge = (cat) => {
    switch (cat) {
      case 'Critical':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'Moderate':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    }
  }

  const getRiskColorClass = (cat) => {
    switch (cat) {
      case 'Critical':
        return 'text-red-700'
      case 'High':
        return 'text-orange-600'
      case 'Moderate':
        return 'text-amber-600'
      default:
        return 'text-emerald-600'
    }
  }

  const getProgressBarColor = (cat) => {
    switch (cat) {
      case 'Critical':
        return 'bg-red-600'
      case 'High':
        return 'bg-orange-500'
      case 'Moderate':
        return 'bg-amber-500'
      default:
        return 'bg-emerald-500'
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="border-b border-gray-200 pb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold shadow-xs">
                <Sparkles size={22} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                  Early-Warning Delay Prediction
                </h1>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3.5 py-2">
            <ShieldAlert size={16} className="text-blue-600" />
            <span className="text-xs font-bold text-blue-900">
              Active Persona: {roleInfo.officerName} ({currentRole})
            </span>
          </div>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
        <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
          <Layers size={14} className="text-blue-600" />
          Quick-Load Evaluator Test Scenarios
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {Object.entries(SAMPLE_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              type="button"
              onClick={() => loadPreset(key)}
              className={`text-left p-3 rounded-lg border transition-all text-xs font-medium flex flex-col justify-between group cursor-pointer ${
                activePresetKey === key
                  ? 'border-blue-500 bg-blue-50/70 shadow-xs ring-1 ring-blue-400/30'
                  : 'border-gray-200 bg-gray-50 hover:bg-blue-50/40 hover:border-blue-300'
              }`}
            >
              <span className="font-semibold text-gray-900 group-hover:text-blue-700">
                {preset.name.split(' (')[0]}
              </span>
              <span className="text-[11px] text-gray-500 mt-1">
                {preset.name.includes('(') ? preset.name.split(' (')[1].replace(')', '') : ''}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Search Existing Project Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs relative" ref={searchContainerRef}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-blue-600" />
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
              Search Existing Project
            </h2>
          </div>
          <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
            Search by Project ID, District or Project Type
          </span>
        </div>

        {/* Search Input Bar */}
        <div className="relative">
          <div className="relative flex items-center">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Search size={18} />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value)
                setSearchOpen(true)
                setActiveSearchIndex(-1)
              }}
              onFocus={() => {
                if (searchQuery.trim().length > 0 || searchResults.length > 0) {
                  setSearchOpen(true)
                }
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="🔍 Search by Project ID, District or Project Type... (e.g. PRJ-2026-184, Pune, Highway)"
              className="w-full pl-10 pr-28 py-2.5 bg-gray-50 hover:bg-white focus:bg-white border border-gray-300 focus:border-blue-500 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 transition-all"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5">
              {searchLoading && (
                <RefreshCw size={15} className="animate-spin text-blue-600" />
              )}
              {searchQuery && !searchLoading && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setSearchResults([])
                    setSearchOpen(false)
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-md transition-colors"
                  title="Clear search"
                >
                  <X size={16} />
                </button>
              )}
              <span className="text-[11px] text-gray-400 border-l border-gray-200 pl-2 font-mono">
                5,000 DB Records
              </span>
            </div>
          </div>

          {/* Dynamic Search Dropdown Panel */}
          {searchOpen && (searchQuery.trim().length > 0 || searchResults.length > 0 || searchLoading) && (
            <div className="absolute z-30 left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-fadeIn max-h-80 overflow-y-auto">
              {searchLoading ? (
                <div className="p-6 text-center text-gray-500 text-xs flex items-center justify-center gap-2">
                  <RefreshCw size={16} className="animate-spin text-blue-600" />
                  <span>Searching project registry...</span>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  <div className="px-4 py-2 bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider flex justify-between items-center">
                    <span>Matching Projects ({searchResults.length})</span>
                    <span className="text-[10px] lowercase font-normal text-gray-400">Click to auto-fill form parameters</span>
                  </div>
                  {searchResults.map((proj, idx) => {
                    const isSelected = activeSearchIndex === idx
                    return (
                      <div
                        key={proj.project_id}
                        onClick={() => handleSelectProject(proj)}
                        onMouseEnter={() => setActiveSearchIndex(idx)}
                        className={`p-3.5 cursor-pointer transition-colors flex items-center justify-between gap-4 ${
                          isSelected ? 'bg-blue-50/80 border-l-4 border-l-blue-600' : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {proj.formatted_id}
                            </span>
                            <h4 className="text-sm font-semibold text-gray-900 truncate">
                              {proj.project_name}
                            </h4>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span className="font-medium text-gray-700">{proj.district} • {proj.project_type}</span>
                            <span>•</span>
                            <span>{proj.total_acres} Acres</span>
                            <span>•</span>
                            <span>{proj.land_acquired_pct}% Acquired</span>
                            <span>•</span>
                            <span>{proj.compensation_disbursed_pct}% Disbursed</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-semibold text-blue-600 bg-blue-50/80 hover:bg-blue-100 px-2.5 py-1 rounded-md border border-blue-200 transition-colors">
                            Select Project
                          </span>
                          <ArrowRight size={15} className={`text-gray-400 ${isSelected ? 'text-blue-600 translate-x-0.5' : ''} transition-all`} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500 space-y-1">
                  <p className="text-xs font-semibold text-gray-700">No projects found matching "{searchQuery}"</p>
                  <p className="text-[11px] text-gray-400">
                    Try searching by ID (e.g. "PRJ-2026-184", "184"), District ("Pune", "Nagpur", "Nashik"), or Sector ("Highway", "Metro").
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected Project Indicator */}
        {selectedProjectMeta && (
          <div className="mt-4 pt-3.5 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/60 rounded-xl p-3.5 border border-blue-100">
            <div className="flex items-start sm:items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs font-bold text-xs">
                {selectedProjectMeta.project_type === 'Highway' ? 'HW' :
                 selectedProjectMeta.project_type === 'Metro' ? 'MT' :
                 selectedProjectMeta.project_type === 'Railway' ? 'RL' : 'IR'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/80 px-1.5 py-0.5 rounded">
                    Selected Project
                  </span>
                  <span className="font-mono text-xs font-bold text-gray-900">
                    {selectedProjectMeta.formatted_id}
                  </span>
                  {selectedProjectMeta.source === 'preset' ? (
                    <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 font-medium">
                      {selectedProjectMeta.presetLabel}
                    </span>
                  ) : (
                    <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 font-medium">
                      Database Record
                    </span>
                  )}
                </div>
                <div className="text-xs font-bold text-gray-900 mt-0.5">
                  {selectedProjectMeta.project_name}
                  <span className="text-gray-500 font-medium ml-2">
                    {selectedProjectMeta.district} • {selectedProjectMeta.project_type}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md font-medium flex items-center gap-1">
                <CheckCircle2 size={12} className="text-emerald-600" />
                13 Features Auto-Populated
              </span>
              <button
                type="button"
                onClick={handleChangeProject}
                className="text-xs font-bold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 px-3 py-1 rounded-md transition-colors shadow-xs cursor-pointer"
              >
                Change Project
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Parameter Input Form */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50/70 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Current Project State Parameters (13 Features)</h2>
            <p className="text-xs text-gray-500">Provide verifiable milestones known today. Outcome columns are strictly quarantined.</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-white border border-gray-200 rounded-md text-gray-600">
            No Future Leakage
          </span>
        </div>

        <form onSubmit={handlePredict} className="p-6 space-y-6">
          {/* Categorical & Scale Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">District</label>
              <select
                value={formData.district}
                onChange={e => handleInputChange('district', e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
              >
                {['Pune', 'Mumbai', 'Nagpur', 'Nashik', 'Aurangabad'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Project Sector Type</label>
              <select
                value={formData.project_type}
                onChange={e => handleInputChange('project_type', e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
              >
                {['Highway', 'Railway', 'Metro', 'Irrigation'].map(pt => (
                  <option key={pt} value={pt}>{pt}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Total Land Area (Acres)</label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={formData.total_acres}
                onChange={e => handleInputChange('total_acres', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                placeholder="250"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Affected Families (Count)</label>
              <input
                type="number"
                min="0"
                required
                value={formData.affected_families}
                onChange={e => handleInputChange('affected_families', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                placeholder="180"
              />
            </div>
          </div>

          {/* Lifecycle Milestone Progress Percentages */}
          <div className="border-t border-gray-100 pt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">
              Lifecycle Progress Milestones (%)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span>Land Acquired</span>
                  <span className="font-bold text-blue-600">{formData.land_acquired_pct}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.land_acquired_pct}
                  onChange={e => handleInputChange('land_acquired_pct', e.target.value)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span>Compensation Disbursed</span>
                  <span className="font-bold text-blue-600">{formData.compensation_disbursed_pct}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.compensation_disbursed_pct}
                  onChange={e => handleInputChange('compensation_disbursed_pct', e.target.value)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span>R&R Progress</span>
                  <span className="font-bold text-blue-600">{formData.rnp_progress_pct}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.rnp_progress_pct}
                  onChange={e => handleInputChange('rnp_progress_pct', e.target.value)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span>Physical Possession</span>
                  <span className="font-bold text-blue-600">{formData.possession_pct}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.possession_pct}
                  onChange={e => handleInputChange('possession_pct', e.target.value)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Friction & Dispute Indicators */}
          <div className="border-t border-gray-100 pt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">
              Dispute, Statutory & Delay Vectors
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Approval Days Pending</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.approval_days_pending}
                  onChange={e => handleInputChange('approval_days_pending', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                  placeholder="96"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Legal Cases Count</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.legal_cases_count}
                  onChange={e => handleInputChange('legal_cases_count', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                  placeholder="8"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Ownership Disputes</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.ownership_disputes}
                  onChange={e => handleInputChange('ownership_disputes', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                  placeholder="5"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Doc Deficiency Score (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  required
                  value={formData.doc_deficiency_score}
                  onChange={e => handleInputChange('doc_deficiency_score', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                  placeholder="35"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">District Delay Avg (Days)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={formData.historical_district_delay_avg}
                  onChange={e => handleInputChange('historical_district_delay_avg', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                  placeholder="18"
                />
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="border-t border-gray-100 pt-5 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Project Name: <strong>{formData.project_name || 'Manual Project Assessment'}</strong>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-xs transition-colors disabled:opacity-50 text-sm cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Running XGBoost Model & SHAP Explainer...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Analyze Project Risk
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-sm font-medium">
          ⚠️ {error}
        </div>
      )}

      {/* Results Dashboard */}
      {prediction && (
        <div className="space-y-8 animate-fadeIn">
          {/* 1. Primary Risk Probability Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 lg:p-8">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">
              PROJECT RISK ASSESSMENT (EARLY WARNING)
            </div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className={`text-5xl lg:text-6xl font-black tracking-tight leading-none ${getRiskColorClass(prediction.risk_category)}`}>
                  {prediction.risk_score}%
                </div>
                <div className="flex flex-col justify-center">
                  <span className="text-lg lg:text-xl font-bold text-gray-900 leading-tight">
                    Probability of Future Delay
                  </span>
                  <span className="text-xs text-gray-500 mt-0.5">
                    Evaluated by trained XGBoost Classifier (P = {prediction.delay_probability})
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-center text-center gap-1.5">
                <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                  Risk Classification
                </span>
                <span className={`text-base font-black px-4 py-1.5 rounded-xl border uppercase tracking-wider shadow-xs ${getRiskBadge(prediction.risk_category)}`}>
                  {prediction.risk_category} RISK
                </span>
              </div>
            </div>
          </div>

          {/* 2. SHAP Explainability: Why Is This Project At Risk? */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <AlertTriangle size={18} className="text-red-500" />
                    Top Risk Drivers (SHAP +)
                  </h3>
                  <p className="text-xs text-gray-500">Parameters pushing this project into delay risk</p>
                </div>
                <span className="text-[11px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                  Increases Risk
                </span>
              </div>

              <div className="space-y-3 pt-2">
                {prediction.top_risk_drivers.length > 0 ? (
                  prediction.top_risk_drivers.map((driver, idx) => (
                    <div key={idx} className="p-3 rounded-xl border border-red-100 bg-red-50/40 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900">
                          {idx + 1}. {driver.feature}
                        </span>
                        <span className="text-xs font-extrabold text-red-700">
                          +{driver.impact || driver.shap_value} SHAP
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-600">
                        <span>Current Value: <strong>{driver.value ?? formData[driver.raw_feature] ?? '—'}</strong></span>
                        <span className="text-red-600 font-semibold">High Risk Contribution</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 italic">No significant risk drivers identified.</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-500" />
                    Protective Factors (SHAP -)
                  </h3>
                  <p className="text-xs text-gray-500">Parameters stabilizing the timeline and reducing delay risk</p>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  Decreases Risk
                </span>
              </div>

              <div className="space-y-3 pt-2">
                {prediction.protective_factors.length > 0 ? (
                  prediction.protective_factors.map((factor, idx) => (
                    <div key={idx} className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900">
                          {idx + 1}. {factor.feature}
                        </span>
                        <span className="text-xs font-extrabold text-emerald-700">
                          {factor.impact || factor.shap_value} SHAP
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-600">
                        <span>Current Value: <strong>{factor.value ?? formData[factor.raw_feature] ?? '—'}</strong></span>
                        <span className="text-emerald-600 font-semibold">Mitigating Delay Risk</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 italic">No protective factors identified.</p>
                )}
              </div>
            </div>
          </div>

          {/* 3. 6-Stage Lifecycle Risk Assessment */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Layers size={18} className="text-blue-600" />
                  Land Acquisition Lifecycle Stage Risk Indicators
                </h3>
                <p className="text-xs text-gray-500">
                  Vulnerability across all 6 statutory stages (Notification, Documentation, Approval, Compensation, R&R, Possession)
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md">
                Transparent Rule Indicators
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {prediction.stage_risks_list && prediction.stage_risks_list.map((stg) => (
                <div key={stg.stage} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900">{stg.stage} Stage</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${getRiskBadge(stg.category)}`}>
                      {stg.category}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-gray-500">Stage Risk Score</span>
                    <span className="text-base font-extrabold text-gray-900">{stg.risk}%</span>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${getProgressBarColor(stg.category)}`}
                      style={{ width: `${Math.min(100, Math.max(5, stg.risk))}%` }}
                    ></div>
                  </div>

                  <p className="text-[11px] text-gray-600 leading-normal">
                    {stg.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Dynamic Administrative Recommendations */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Building2 size={18} className="text-indigo-600" />
                  Recommended Administrative Directives
                </h3>
                <p className="text-xs text-gray-500">
                  Synthesized dynamically from the project's current bottlenecks and dominant SHAP factors
                </p>
              </div>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                Action Required
              </span>
            </div>

            <div className="space-y-3 pt-2">
              {prediction.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/40">
                  <span className="h-6 w-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-xs font-medium text-gray-800 leading-relaxed">
                    {rec}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Interactive What-If Simulator */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Sliders size={18} className="text-blue-600" />
                Intervention Impact Simulator (What-If Analysis)
              </h3>
              <p className="text-xs text-gray-500">
                Test the effect of proactive administrative measures using the <strong>SAME trained XGBoost model</strong> without retraining.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Select Parameter to Improve</label>
                <select
                  value={whatifFeature}
                  onChange={e => {
                    const feat = e.target.value
                    setWhatifFeature(feat)
                    if (feat === 'compensation_disbursed_pct') setWhatifValue(85)
                    else if (feat === 'legal_cases_count') setWhatifValue(1)
                    else if (feat === 'approval_days_pending') setWhatifValue(30)
                    else if (feat === 'possession_pct') setWhatifValue(80)
                    else if (feat === 'doc_deficiency_score') setWhatifValue(10)
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-900 focus:outline-none focus:border-blue-500"
                >
                  <option value="compensation_disbursed_pct">Compensation Disbursed %</option>
                  <option value="legal_cases_count">Legal Cases Count</option>
                  <option value="approval_days_pending">Approval Days Pending</option>
                  <option value="possession_pct">Physical Possession %</option>
                  <option value="doc_deficiency_score">Documentation Deficiency %</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1.5">
                  <span>Simulated New Target:</span>
                  <span className="font-bold text-blue-600">{whatifValue}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={whatifFeature.includes('count') ? 15 : whatifFeature.includes('days') ? 120 : 100}
                  step="1"
                  value={whatifValue}
                  onChange={e => setWhatifValue(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleRunWhatIf}
                  disabled={whatifLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-xs transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  {whatifLoading ? <RefreshCw size={14} className="animate-spin" /> : <TrendingDown size={14} />}
                  Simulate Model Prediction
                </button>
              </div>
            </div>

            {whatifResult && (
              <div className="border border-blue-200 bg-blue-50/50 rounded-xl p-5 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div className="bg-white p-3.5 rounded-lg border border-gray-200 shadow-xs">
                    <div className="text-[11px] font-semibold text-gray-500 uppercase">Current Risk</div>
                    <div className="text-2xl font-black text-red-600 mt-1">{whatifResult.original_risk}%</div>
                    <div className="text-[11px] text-gray-500 font-medium">Original Value: {whatifResult.original_value}</div>
                  </div>

                  <div className="bg-white p-3.5 rounded-lg border border-gray-200 shadow-xs">
                    <div className="text-[11px] font-semibold text-gray-500 uppercase">Simulated Risk</div>
                    <div className="text-2xl font-black text-emerald-600 mt-1">{whatifResult.new_risk}%</div>
                    <div className="text-[11px] text-gray-500 font-medium">New Target: {whatifResult.new_value}</div>
                  </div>

                  <div className="bg-white p-3.5 rounded-lg border border-blue-300 bg-blue-50 shadow-xs">
                    <div className="text-[11px] font-bold text-blue-700 uppercase">Risk Reduction</div>
                    <div className="text-2xl font-black text-blue-700 mt-1">
                      {whatifResult.reduction > 0 ? `-${whatifResult.reduction}%` : `+${Math.abs(whatifResult.reduction)}%`}
                    </div>
                    <div className="text-[11px] text-blue-600 font-semibold">
                      {whatifResult.reduction > 0 ? 'Achievable Risk Savings' : 'Risk Increase'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 6. Intervention Logging */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <FileCheck size={18} className="text-emerald-600" />
                Log Administrative Intervention (Outcome & Learning Dataset)
              </h3>
              <p className="text-xs text-gray-500">
                Records interventions to audit logs and feedback datasets for controlled model retraining.
              </p>
            </div>

            <form onSubmit={handleLogIntervention} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-2">
              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Administrative Action Taken</label>
                <select
                  value={interventionText}
                  onChange={e => setInterventionText(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select official intervention...</option>
                  <option value="Direct DBT Compensation Release Batch Sanctioned">Direct DBT Compensation Release Batch Sanctioned</option>
                  <option value="Special Land Lok Adalat / Joint Revenue Hearing Scheduled">Special Land Lok Adalat / Joint Revenue Hearing Scheduled</option>
                  <option value="Single-Window Clearance High-Level Escalation Filed">Single-Window Clearance High-Level Escalation Filed</option>
                  <option value="Village Revenue Talathi Survey & Record Rectification Drive">Village Revenue Talathi Survey & Record Rectification Drive</option>
                  <option value="Joint Revenue-Police Demarcation Drive Conducted">Joint Revenue-Police Demarcation Drive Conducted</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Intervention Date</label>
                <input
                  type="date"
                  required
                  value={interventionDate}
                  onChange={e => setInterventionDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={interventionSubmitting || !interventionText}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg text-xs transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {interventionSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                  Record Administrative Action
                </button>
              </div>
            </form>

            {interventionSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                Intervention recorded in the audit database. Outcome will be tracked for feedback-driven retraining.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
