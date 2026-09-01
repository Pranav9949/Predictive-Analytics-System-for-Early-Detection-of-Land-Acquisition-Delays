import React, { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import CommandCenter from './pages/CommandCenter'
import Analytics from './pages/Analytics'
import GISMapPage from './pages/GISMapPage'
import ModelHealth from './pages/ModelHealth'

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function App() {
  const [token, setToken] = useState(null)
  
  // Simple login handler for the MVP Demo
  const handleLogin = async (e) => {
    e.preventDefault()
    const username = e.target.username.value
    const password = e.target.password.value
    
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      if (res.ok) {
        const data = await res.json()
        setToken(data.access_token)
        localStorage.setItem('auth_token', data.access_token)
        localStorage.setItem('auth_role', data.role)
      } else {
        alert("Invalid login")
      }
    } catch (err) {
      console.error(err)
      alert("Error connecting to backend")
    }
  }

  if (!token) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
          <h2 className="mb-6 text-center text-2xl font-bold text-blue-600">Land Acquisition Intelligence</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Username</label>
              <input name="username" type="text" defaultValue="lao1" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input name="password" type="password" defaultValue="password123" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
            </div>
            <button type="submit" className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              Login to Command Center
            </button>
          </form>
          <div className="mt-4 text-xs text-gray-500 text-center">
            Demo Users: lao1, collector1, policy1 (Pass: password123)
          </div>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
        <Sidebar onLogout={() => { setToken(null); localStorage.clear(); }} />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<CommandCenter />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/map" element={<GISMapPage />} />
            <Route path="/model-health" element={<ModelHealth />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
