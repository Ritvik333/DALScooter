"use client"

import { useState } from "react"
import { Mail, Lock, User, Shield, Eye, EyeOff, Sparkles, ArrowRight } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"
import MultiFactorAuth from "./MultiFactorAuth"
import toast from "react-hot-toast"

const Login = () => { //Login 
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "Customer",
    securityQuestion: "",
    securityAnswer: "",
  })
  const [showMFA, setShowMFA] = useState(false)
  const [mfaSession, setMfaSession] = useState(null)
  const [loading, setLoading] = useState(false)

  const { login, register } = useAuth()

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isLogin) {
        const result = await login(formData.email, formData.password)
        if (result.requiresMFA) {
          setMfaSession(result.session)
          setShowMFA(true)
        } else {
          toast.success("Login successful!")
        }
      } else {
        await register(formData)
        toast.success("Registration successful! Please check your email for verification.")
        setIsLogin(true)
      }
    } catch (error) {
      toast.error(error.message || "Authentication failed")
    } finally {
      setLoading(false)
    }
  }

  const handleMFAComplete = () => {
    setShowMFA(false)
    setMfaSession(null)
    toast.success("Login successful!")
  }

  if (showMFA) {
    return (
      <MultiFactorAuth
        email={formData.email}
        session={mfaSession}
        onComplete={handleMFAComplete}
        onCancel={() => {
          setShowMFA(false)
          setMfaSession(null)
        }}
      />
    )
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8 animate-scale-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{isLogin ? "Welcome Back!" : "Join DALScooter"}</h2>
          <p className="text-gray-600">{isLogin ? "Sign in to your account" : "Create your account to get started"}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Field */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm hover:bg-white/90"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Password</label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm hover:bg-white/90"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Registration Fields */}
          {!isLogin && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Role</label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm hover:bg-white/90"
                  >
                    <option value="Customer">Customer</option>
                    <option value="Operator">Operator</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Security Question</label>
                <input
                  type="text"
                  name="securityQuestion"
                  value={formData.securityQuestion}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm hover:bg-white/90"
                  placeholder="What is your mother's maiden name?"
                  required={!isLogin}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Security Answer</label>
                <input
                  type="text"
                  name="securityAnswer"
                  value={formData.securityAnswer}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm hover:bg-white/90"
                  placeholder="Enter your answer"
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center group"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Processing...
              </div>
            ) : (
              <div className="flex items-center">
                {isLogin ? "Sign In" : "Create Account"}
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            )}
          </button>
        </form>

        {/* Toggle Auth Mode */}
        <div className="mt-8 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 hover:text-blue-800 font-semibold transition-colors group"
          >
            {isLogin ? (
              <span className="flex items-center justify-center">
                Don't have an account? <span className="ml-1 group-hover:underline">Sign up</span>
                <Sparkles className="w-4 h-4 ml-1" />
              </span>
            ) : (
              <span className="group-hover:underline">Already have an account? Sign in</span>
            )}
          </button>
        </div>

        {/* Guest Access */}
        <div className="mt-6 text-center">
          <button className="text-gray-500 hover:text-gray-700 text-sm transition-colors hover:underline">
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  )
}

export default Login
