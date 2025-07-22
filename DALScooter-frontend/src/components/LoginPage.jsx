"use client"

import { useState } from "react"
import LoginForm from "./LoginForm"

const LoginPage = () => { //LoginPage
  const [showLogin, setShowLogin] = useState(false)

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100">
      {!showLogin ? (
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full space-y-4 text-center">
          <h2 className="text-2xl font-bold">Welcome Back to DALScooter</h2>
          <p className="text-gray-600">Sign in to your account</p>
          <button
            onClick={() => setShowLogin(true)}
            className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign In
          </button>
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              Don't have an account?{" "}
              <button className="text-blue-600 hover:text-blue-800 font-semibold hover:underline transition-colors">
                Register here
              </button>
            </p>
          </div>
        </div>
      ) : (
        <LoginForm onBack={() => setShowLogin(false)} />
      )}
    </div>
  )
}

export default LoginPage
