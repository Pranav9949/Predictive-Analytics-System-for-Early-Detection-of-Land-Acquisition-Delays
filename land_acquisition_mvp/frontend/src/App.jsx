import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { RoleProvider } from './context/RoleContext'
import Sidebar from './components/Sidebar'
import CommandCenter from './pages/CommandCenter'
import EarlyWarningPredictor from './pages/EarlyWarningPredictor'
import Analytics from './pages/Analytics'
import GISMapPage from './pages/GISMapPage'
import ModelHealth from './pages/ModelHealth'

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function App() {
  return (
    <RoleProvider>
      <BrowserRouter>
        <div className="flex h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto flex flex-col min-w-0">
            <Routes>
              <Route path="/" element={<CommandCenter />} />
              <Route path="/predict-risk" element={<EarlyWarningPredictor />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/map" element={<GISMapPage />} />
              <Route path="/model-health" element={<ModelHealth />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </RoleProvider>
  )
}

export default App
