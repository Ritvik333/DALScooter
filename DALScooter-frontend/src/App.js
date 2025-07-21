"use client"

import { useState } from "react"
import { BikeIcon as Scooter, ArrowLeft, Sparkles } from "lucide-react"
import RegistrationForm from "./components/RegistrationForm"

import Dashboard from './components/Dashboard'

const App = () => {
  const [selectedRole, setSelectedRole] = useState(null)

  if (!selectedRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col items-center justify-center p-4">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-3xl shadow-2xl">
              <Scooter className="h-16 w-16 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            DALScooter
          </h1>
          <p className="text-gray-600 text-lg font-medium mb-2">Smart Mobility Solutions</p>
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }}></div>
          </div>
        </div>

        {/* Role Selection Card */}
        <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8 max-w-md w-full animate-scale-in">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Join DALScooter</h2>
            <p className="text-gray-600">Choose your role to get started</p>
          </div>

          <div className="space-y-4">
            <button
              className="w-full group bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center"
              onClick={() => setSelectedRole("customer")}
            >
              <div className="flex items-center">
                <span className="text-lg">Register as Customer</span>
                <div className="ml-3 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <ArrowLeft className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>

            <button
              className="w-full group bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center"
              onClick={() => setSelectedRole("operator")}
            >
              <div className="flex items-center">
                <span className="text-lg">Register as Operator</span>
                <div className="ml-3 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <ArrowLeft className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{" "}
              <button className="text-blue-600 hover:text-blue-800 font-semibold hover:underline transition-colors">
                Sign in here
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>© 2024 DALScooter. All rights reserved.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => setSelectedRole(null)}
          className="mb-6 flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to role selection
        </button>
        <RegistrationForm role={selectedRole} />
        <button
          className="bg-gray-800 text-white px-6 py-3 rounded hover:bg-gray-900"
          onClick={() => setShowDashboard(true)}
        >
          🔓 Bypass Login → Go to Dashboard
        </button>
      </div>
    </div>
  )
}

export default App