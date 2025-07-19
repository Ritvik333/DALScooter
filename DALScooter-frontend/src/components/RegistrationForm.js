// import React, { useState } from 'react';
// import axios from 'axios';

// const RegistrationForm = ({ role }) => {
//   const [step, setStep] = useState(1); // Step 1: Info, Step 2: OTP
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [securityQuestion, setSecurityQuestion] = useState('');
//   const [securityAnswer, setSecurityAnswer] = useState('');
//   const [otp, setOtp] = useState('');
//   const [message, setMessage] = useState('');

//   const apiEndpoint = 'https://e09ryoby30.execute-api.us-east-1.amazonaws.com/prod/auth';

//   const securityQuestions = [
//     "What is your pet's name?",
//     "What is your mother's maiden name?",
//     "What is your favorite color?",
//     "What city were you born in?",
//     "What was your first school's name?"
//   ];

//   const handleSignup = async (e) => {
//     e.preventDefault();
//     setMessage('Sending OTP...');
//     const requestBody = {
//       action: 'signup',
//       email,
//       password,
//       role,
//       security_question: securityQuestion,
//       security_answer: securityAnswer,
//     };
//     try {
//       const response = await axios.post(apiEndpoint, requestBody);
//       setMessage(response.data.message || 'OTP sent to your email');
//       setStep(2); // Move to OTP input
//     } catch (error) {
//       setMessage('Signup failed. Try again.');
//     }
//   };

//   const handleOtpConfirm = async (e) => {
//     e.preventDefault();
//     setMessage('Verifying OTP...');
//     const requestBody = {
//       action: 'signup',
//       email,
//       password,
//       role,
//       security_question: securityQuestion,
//       security_answer: securityAnswer,
//       otp,
//     };
//     try {
//       const response = await axios.post(apiEndpoint, requestBody);
//       setMessage(response.data.message || 'Account verified successfully!');
//       // Wait a moment (optional), then reset form to step 1
//     setTimeout(() => {
//         setStep(1);
//         setOtp('');
//         setMessage('');
//         // Optionally reset other fields if you want a clean form:
//         setEmail('');
//         setPassword('');
//         setSecurityQuestion('');
//         setSecurityAnswer('');
//       }, 2000);  // 2 seconds delay to show success message before reset
//     } catch (error) {
//       setMessage('OTP verification failed. Try again.');
//     }
//   };

//   return (
//     <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
//       <h2 className="text-2xl font-bold mb-4 text-center">{`Register as ${role}`}</h2>
//       {step === 1 ? (
//         <form onSubmit={handleSignup} className="space-y-4">
//           <div>
//             <label>Email</label>
//             <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full border p-2" />
//           </div>
//           <div>
//             <label>Password</label>
//             <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full border p-2" />
//           </div>
//           <div>
//             <label>Security Question</label>
//             <select
//               value={securityQuestion}
//               onChange={e => setSecurityQuestion(e.target.value)}
//               required
//               className="w-full border p-2"
//             >
//               <option value="">Select a question...</option>
//               {securityQuestions.map((question, idx) => (
//                 <option key={idx} value={question}>{question}</option>
//               ))}
//             </select>
//           </div>
//           <div>
//             <label>Security Answer</label>
//             <input type="text" value={securityAnswer} onChange={e => setSecurityAnswer(e.target.value)} required className="w-full border p-2" />
//           </div>
//           <button className="w-full bg-blue-600 text-white p-2 rounded">Send OTP</button>
//         </form>
//       ) : (
//         <form onSubmit={handleOtpConfirm} className="space-y-4">
//           <div>
//             <label>Enter OTP</label>
//             <input type="text" value={otp} onChange={e => setOtp(e.target.value)} required className="w-full border p-2" />
//           </div>
//           <button className="w-full bg-green-600 text-white p-2 rounded">Verify OTP</button>
//         </form>
//       )}
//       {message && <p className="mt-4 text-center text-sm text-gray-600">{message}</p>}
//     </div>
//   );
// };

// export default RegistrationForm;

"use client"

import { useState } from "react"
import { Mail, Lock, Shield, Key, CheckCircle, AlertCircle, Eye, EyeOff, Send, Sparkles } from "lucide-react"
import axios from "axios"

const RegistrationForm = ({ role }) => {
  const [step, setStep] = useState(1) // Step 1: Info, Step 2: OTP
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [securityQuestion, setSecurityQuestion] = useState("")
  const [securityAnswer, setSecurityAnswer] = useState("")
  const [otp, setOtp] = useState("")
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const apiEndpoint = "https://xza3hz7hal.execute-api.us-east-1.amazonaws.com/prod/auth"

  const securityQuestions = [
    "What is your pet's name?",
    "What is your mother's maiden name?",
    "What is your favorite color?",
    "What city were you born in?",
    "What was your first school's name?",
  ]

  const handleSignup = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage("Sending OTP...")

    const requestBody = {
      action: "signup",
      email,
      password,
      role,
      security_question: securityQuestion,
      security_answer: securityAnswer,
    }

    try {
      const response = await axios.post(apiEndpoint, requestBody)
      setMessage(response.data.message || "OTP sent to your email")
      setStep(2) // Move to OTP input
    } catch (error) {
      setMessage("Signup failed. Try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOtpConfirm = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage("Verifying OTP...")

    const requestBody = {
      action: "signup",
      email,
      password,
      role,
      security_question: securityQuestion,
      security_answer: securityAnswer,
      otp,
    }

    try {
      const response = await axios.post(apiEndpoint, requestBody)
      setMessage(response.data.message || "Account verified successfully!")

      // Wait a moment, then reset form to step 1
      setTimeout(() => {
        setStep(1)
        setOtp("")
        setMessage("")
        setEmail("")
        setPassword("")
        setSecurityQuestion("")
        setSecurityAnswer("")
      }, 2000)
    } catch (error) {
      setMessage("OTP verification failed. Try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const getMessageStyle = (message) => {
    if (message.includes("successfully") || message.includes("sent")) {
      return "text-green-600 bg-green-50 border border-green-200"
    }
    if (message.includes("failed") || message.includes("Try again")) {
      return "text-red-600 bg-red-50 border border-red-200"
    }
    return "text-blue-600 bg-blue-50 border border-blue-200"
  }

  return (
    <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8 w-full max-w-md animate-scale-in">
      {/* Header */}
      <div className="text-center mb-8">
        <div
          className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg ${
            role === "customer"
              ? "bg-gradient-to-r from-blue-600 to-indigo-600"
              : "bg-gradient-to-r from-green-600 to-emerald-600"
          }`}
        >
          {step === 1 ? <Shield className="w-10 h-10 text-white" /> : <Key className="w-10 h-10 text-white" />}
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          {step === 1 ? `Register as ${role}` : "Verify Your Email"}
        </h2>
        <p className="text-gray-600">
          {step === 1 ? "Create your account to get started" : "Enter the OTP sent to your email"}
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Step {step} of 2</span>
          <span className="text-sm font-medium text-gray-700">{step === 1 ? "Account Info" : "Verification"}</span>
        </div>
        <div className="flex items-center">
          <div
            className={`flex-1 h-3 rounded-l-full transition-all duration-500 ${
              step >= 1 ? "bg-gradient-to-r from-blue-600 to-indigo-600" : "bg-gray-200"
            }`}
          ></div>
          <div
            className={`flex-1 h-3 rounded-r-full transition-all duration-500 ${
              step >= 2 ? "bg-gradient-to-r from-blue-600 to-indigo-600" : "bg-gray-200"
            }`}
          ></div>
        </div>
      </div>

      {step === 1 ? (
        <form onSubmit={handleSignup} className="space-y-6">
          {/* Email Field */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 flex items-center">
              <Mail className="w-4 h-4 mr-2 text-blue-600" />
              Email Address
            </label>
            <div className="relative group">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm hover:bg-white/90 pl-4"
                placeholder="Enter your email address"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 flex items-center">
              <Lock className="w-4 h-4 mr-2 text-blue-600" />
              Password
            </label>
            <div className="relative group">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm hover:bg-white/90 pr-12"
                placeholder="Create a strong password"
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

          {/* Security Question */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 flex items-center">
              <Shield className="w-4 h-4 mr-2 text-blue-600" />
              Security Question
            </label>
            <select
              value={securityQuestion}
              onChange={(e) => setSecurityQuestion(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm hover:bg-white/90"
            >
              <option value="">Select a security question...</option>
              {securityQuestions.map((question, idx) => (
                <option key={idx} value={question}>
                  {question}
                </option>
              ))}
            </select>
          </div>

          {/* Security Answer */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 flex items-center">
              <Key className="w-4 h-4 mr-2 text-blue-600" />
              Security Answer
            </label>
            <input
              type="text"
              value={securityAnswer}
              onChange={(e) => setSecurityAnswer(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm hover:bg-white/90"
              placeholder="Enter your answer"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full text-white py-4 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 flex items-center justify-center ${
              role === "customer"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                : "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Sending OTP...
              </div>
            ) : (
              <div className="flex items-center">
                <Send className="w-5 h-5 mr-3" />
                Send OTP
              </div>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleOtpConfirm} className="space-y-6">
          {/* OTP Info */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-center">
              <Mail className="w-5 h-5 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-blue-900">OTP sent to:</p>
                <p className="text-sm text-blue-700">{email}</p>
              </div>
            </div>
          </div>

          {/* OTP Input */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 flex items-center">
              <Key className="w-4 h-4 mr-2 text-blue-600" />
              Enter OTP Code
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/70 backdrop-blur-sm hover:bg-white/90 text-center text-lg font-mono tracking-widest"
              placeholder="000000"
              maxLength="6"
            />
            <p className="text-xs text-gray-500 text-center">Check your email for the 6-digit code</p>
          </div>

          {/* Verify Button */}
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
                Verify OTP
              </div>
            )}
          </button>

          {/* Resend OTP */}
          <div className="text-center">
            <button
              type="button"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline transition-colors"
              onClick={() => {
                // You can implement resend OTP functionality here
                setMessage("Resending OTP...")
              }}
            >
              Didn't receive the code? Resend OTP
            </button>
          </div>
        </form>
      )}

      {/* Message Display */}
      {message && (
        <div
          className={`mt-6 p-4 rounded-xl text-center text-sm font-medium animate-fade-in ${getMessageStyle(message)}`}
        >
          <div className="flex items-center justify-center">
            {message.includes("successfully") ? (
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

export default RegistrationForm
