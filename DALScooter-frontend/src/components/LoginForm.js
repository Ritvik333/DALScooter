"use client"

import { useState } from "react"
import {
  Mail,
  Lock,
  Shield,
  Key,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  LogIn,
  ArrowLeft,
  Sparkles,
} from "lucide-react"
import axios from "axios"
// import { useNavigate } from "react-router-dom"

const LoginForm = ({ onBack, onSwitchToRegister, onLoginSuccess }) => { //LoginForm
  const [step, setStep] = useState(1) // Step 1: Login, Step 2: Security Question, Step 3: Caesar Cipher
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [securityAnswer, setSecurityAnswer] = useState("")
  const [caesarAnswer, setCaesarAnswer] = useState("")
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sessionData, setSessionData] = useState("")
  const [securityQuestion, setSecurityQuestion] = useState("")
  const [caesarChallenge, setCaesarChallenge] = useState("")
  // const navigate = useNavigate(); // Add this line

  const apiEndpoint = "https://e09ryoby30.execute-api.us-east-1.amazonaws.com/prod/auth"

  const handleLogin = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage("Signing in...")

    const requestBody = {
      action: "login",  
      email,
      password,
    }

    try {
      // console.log("responseL:",response);
      const response = await axios.post(apiEndpoint, requestBody)
      console.log("responseL:",response);

      if (response.data.idToken) {
        // Login successful
        localStorage.setItem('idToken', response.data.idToken)
        localStorage.setItem('AccessToken', response.data.AccessToken)
        localStorage.setItem('email', email)
        localStorage.setItem('role',response.data.role)
        setMessage("Login successful!")
        console.log("Login successful:", response.data)
        onLoginSuccess(response.data.role) // Call onLoginSuccess with role
      } else if (response.data.session) {
        console.log("SD:", response.data.session)
        setSessionData(response.data.session)
        setSecurityQuestion(response.data.securityQuestion || "What is your security question answer?")
        setMessage("Multi-factor authentication required")
        setStep(2)
      }
    } catch (error) {
      console.error("Login error:", error.response?.status, error.response?.data)
      setMessage("Login failed. Please check your credentials.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSecurityQuestion = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage("Verifying security answer...")

    const requestBody = {
      action: "respond_to_challenge",
      email,
      session: sessionData,
      answer: securityAnswer,
    }

    try {
      console.log(requestBody)
      const response = await axios.post(apiEndpoint, requestBody)
      console.log("response 2:",response);
      if (response.data.idToken) {
        // Login successful after security question
        setMessage("Authentication successful! Redirecting...")
        setTimeout(() => {
          console.log("Login successful:", response.data)
        }, 1500)
      } else if (response.data.challenge) {
        // Caesar cipher challenge
        setSessionData(response.data.session)
        console.log("setting session data 2: ",sessionData);
        setCaesarChallenge(response.data.cipherText)
        setMessage("Additional security challenge required")
        setStep(3)
      }
    } catch (error) {
      console.error("Login error:", error.response?.status, error.response?.data)
      setMessage("Security verification failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCaesarChallenge = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage("Verifying challenge response...")
    console.log("SD-2:",sessionData);

    const requestBody = {
      action: "respond_to_challenge",
      email,
      session: sessionData,
      answer: caesarAnswer,
    }

    try {
      const response = await axios.post(apiEndpoint, requestBody)

      if (response.data.idToken) {
        setMessage("Authentication successful! Redirecting...")
        localStorage.setItem('idToken', response.data.idToken);
        localStorage.setItem('AccessToken', response.data.AccessToken);
        localStorage.setItem('email', email);
        localStorage.setItem('role',response.data.role)
        setMessage("Authentication successful!")
        console.log("Login successful:", response.data)
        onLoginSuccess(response.data.role) // Call onLoginSuccess with role
        } else {
          setMessage("Challenge verification failed. Please try again.")
        }
    } catch (error) {
      setMessage("Challenge verification failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const getMessageStyle = (message) => {
    if (message.includes("successful") || message.includes("Redirecting")) {
      return "text-green-600 bg-green-50 border border-green-200"
    }
    if (message.includes("failed") || message.includes("Please try again")) {
      return "text-red-600 bg-red-50 border border-red-200"
    }
    return "text-blue-600 bg-blue-50 border border-blue-200"
  }

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return "Sign In"
      case 2:
        return "Security Verification"
      case 3:
        return "Security Challenge"
      default:
        return "Sign In"
    }
  }

  const getStepDescription = () => {
    switch (step) {
      case 1:
        return "Enter your credentials to continue"
      case 2:
        return "Answer your security question"
      case 3:
        return "Complete the security challenge"
      default:
        return "Enter your credentials to continue"
    }
  }

  return (
    <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8 w-full max-w-md animate-scale-in">
      {/* Back Button */}
      {step === 1 && (
        <button
          onClick={onBack}
          className="mb-4 flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back
        </button>
      )}

      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          {step === 1 ? (
            <LogIn className="w-10 h-10 text-white" />
          ) : step === 2 ? (
            <Shield className="w-10 h-10 text-white" />
          ) : (
            <Key className="w-10 h-10 text-white" />
          )}
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">{getStepTitle()}</h2>
        <p className="text-gray-600">{getStepDescription()}</p>
      </div>

      {/* Progress Indicator for MFA */}
      {step > 1 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Step {step - 1} of 2</span>
            <span className="text-sm font-medium text-gray-700">{step === 2 ? "Security Question" : "Challenge"}</span>
          </div>
          <div className="flex items-center">
            <div className="flex-1 h-3 rounded-l-full bg-gradient-to-r from-blue-600 to-indigo-600"></div>
            <div
              className={`flex-1 h-3 rounded-r-full transition-all duration-500 ${
                step >= 3 ? "bg-gradient-to-r from-blue-600 to-indigo-600" : "bg-gray-200"
              }`}
            ></div>
          </div>
        </div>
      )}

      {/* Step 1: Login Form */}
      {step === 1 && (
        <form onSubmit={handleLogin} className="space-y-6">
          {/* Email Field */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 flex items-center">
              <Mail className="w-4 h-4 mr-2 text-blue-600" />
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm hover:bg-white/90"
              placeholder="Enter your email address"
            />
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 flex items-center">
              <Lock className="w-4 h-4 mr-2 text-blue-600" />
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm hover:bg-white/90 pr-12"
                placeholder="Enter your password"
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Signing in...
              </div>
            ) : (
              <div className="flex items-center">
                <LogIn className="w-5 h-5 mr-3" />
                Sign In
              </div>
            )}
          </button>

          {/* Forgot Password */}
          <div className="text-center">
            <button
              type="button"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline transition-colors"
            >
              Forgot your password?
            </button>
          </div>
        </form>
      )}

      {/* Step 2: Security Question */}
      {step === 2 && (
        <form onSubmit={handleSecurityQuestion} className="space-y-6">
          {/* Security Question Display */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-center">
              <Shield className="w-5 h-5 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-blue-900">Security Question:</p>
                <p className="text-sm text-blue-700">{securityQuestion}</p>
              </div>
            </div>
          </div>

          {/* Security Answer Input */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 flex items-center">
              <Key className="w-4 h-4 mr-2 text-blue-600" />
              Your Answer
            </label>
            <input
              type="text"
              value={securityAnswer}
              onChange={(e) => setSecurityAnswer(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm hover:bg-white/90"
              placeholder="Enter your security answer"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 px-6 rounded-xl hover:from-green-700 hover:to-emerald-700 font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Verifying...
              </div>
            ) : (
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 mr-3" />
                Verify Answer
              </div>
            )}
          </button>
        </form>
      )}

      {/* Step 3: Caesar Cipher Challenge */}
      {step === 3 && (
        <form onSubmit={handleCaesarChallenge} className="space-y-6">
          {/* Caesar Challenge Display */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4 mb-6">
            <div className="flex items-center">
              <Key className="w-5 h-5 text-purple-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-purple-900">Security Challenge:</p>
                <p className="text-sm text-purple-700 font-mono">{caesarChallenge}</p>
              </div>
            </div>
          </div>

          {/* Challenge Info */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
            <div className="flex items-start">
              <AlertCircle className="w-4 h-4 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-yellow-800">
                Decode the message by shifting each letter backward by the specified number.
              </p>
            </div>
          </div>

          {/* Caesar Answer Input */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 flex items-center">
              <Key className="w-4 h-4 mr-2 text-blue-600" />
              Decoded Message
            </label>
            <input
              type="text"
              value={caesarAnswer}
              onChange={(e) => setCaesarAnswer(e.target.value.toUpperCase())}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm hover:bg-white/90 font-mono text-lg text-center tracking-widest"
              placeholder="DECODED MESSAGE"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 px-6 rounded-xl hover:from-purple-700 hover:to-pink-700 font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Verifying...
              </div>
            ) : (
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 mr-3" />
                Complete Challenge
              </div>
            )}
          </button>
        </form>
      )}

      {/* Message Display */}
      {message && (
        <div
          className={`mt-6 p-4 rounded-xl text-center text-sm font-medium animate-fade-in ${getMessageStyle(message)}`}
        >
          <div className="flex items-center justify-center">
            {message.includes("successful") ? (
              <CheckCircle className="w-4 h-4 mr-2" />
            ) : message.includes("failed") ? (
              <AlertCircle className="w-4 h-4 mr-2" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            {message}
          </div>
        </div>
      )}
    </div>
  )
}

export default LoginForm
