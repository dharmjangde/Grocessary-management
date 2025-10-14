"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { User, Lock, Eye, EyeOff, Zap } from "lucide-react"

const LoginPage = () => {
  const navigate = useNavigate()
  const [isDataLoading, setIsDataLoading] = useState(false)
  const [isLoginLoading, setIsLoginLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [masterData, setMasterData] = useState({
    userCredentials: {}, // Object where keys are usernames and values are passwords
    userRoles: {} // Object where keys are usernames and values are roles
  })
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  })
  const [toast, setToast] = useState({ show: false, message: "", type: "" })

  // Fetch master data on component mount
  useEffect(() => {
    const fetchMasterData = async () => {
      const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz_705CZWY7WafvEwM309BuWKOOYi24B9tlCuwUaLBvQSy9PzD7nkojRUcRajaBCchv/exec"

      try {
        setIsDataLoading(true)

        // Fetch data from your Apps Script
        const response = await fetch(`${SCRIPT_URL}?sheet=Main&action=fetch`)
        const result = await response.json()
        
        if (!result.success) {
          throw new Error(result.error || "Failed to fetch data")
        }

        // Create userCredentials and userRoles objects from the sheet data
        const userCredentials = {}
        const userRoles = {}

        // Process the data rows (skip header row at index 0)
        const data = result.data
        console.log("Raw sheet data:", data)

        // Start from index 1 to skip header row
        for (let i = 1; i < data.length; i++) {
          const row = data[i]
          
          // Extract data from columns B, C, D (indices 1, 2, 3)
          const username = row[1] ? String(row[1]).trim().toLowerCase() : '';
          const password = row[2] ? String(row[2]).trim() : '';
          const role = row[3] ? String(row[3]).trim().toLowerCase() : 'user';

          console.log(`Processing row ${i}: username=${username}, password=${password}, role=${role}`);

          // Only process if we have both username and password
          if (username && password && password.trim() !== '') {
            // Store in our maps
            userCredentials[username] = password;
            userRoles[username] = role;

            console.log(`Added credential for: ${username}, Role: ${role}`);
          }
        }

        setMasterData({ userCredentials, userRoles })
        console.log("Loaded credentials from Main sheet:", Object.keys(userCredentials).length)
        console.log("Credentials map:", userCredentials)
        console.log("Roles map:", userRoles)

        // Debug - check admin roles specifically
        const adminUsers = Object.entries(userRoles)
          .filter(([, role]) => role === 'admin')
          .map(([username]) => username);
        console.log("Admin users found:", adminUsers);

      } catch (error) {
        console.error("Error Fetching Master Data:", error)
        showToast(`Error loading user data: ${error.message}. Please try again later.`, "error")
      } finally {
        setIsDataLoading(false)
      }
    }

    fetchMasterData()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoginLoading(true)

    try {
      const trimmedUsername = formData.username.trim().toLowerCase()
      const trimmedPassword = formData.password.trim()

      console.log("Login Attempt Details:")
      console.log("Entered Username:", trimmedUsername)
      console.log("Entered Password:", trimmedPassword) // For debugging (remove in production)
      console.log("Available Credentials Count:", Object.keys(masterData.userCredentials).length)
      console.log("Current userCredentials:", masterData.userCredentials)
      console.log("Current userRoles:", masterData.userRoles)

      // Check if the username exists in our credentials map
      if (trimmedUsername in masterData.userCredentials) {
        const correctPassword = masterData.userCredentials[trimmedUsername]
        const userRole = masterData.userRoles[trimmedUsername]

        console.log("Found user in credentials map")
        console.log("Expected Password:", correctPassword)
        console.log("Password Match:", correctPassword === trimmedPassword)
        console.log("User Role:", userRole)

        // Check if password matches
        if (correctPassword === trimmedPassword) {
          // Store user info in sessionStorage
          sessionStorage.setItem('username', trimmedUsername)

          // Check if user is admin - explicitly compare with the string "admin"
          const isAdmin = userRole === "admin";
          console.log(`User ${trimmedUsername} is admin: ${isAdmin}`);

          // Set role based on the fetched role
          sessionStorage.setItem('role', isAdmin ? 'admin' : 'user')

          // For admin users, we don't want to restrict by department
          if (isAdmin) {
            sessionStorage.setItem('department', 'all') // Admin sees all departments
            sessionStorage.setItem('isAdmin', 'true') // Additional flag to ensure admin permissions
            console.log("ADMIN LOGIN - Setting full access permissions");
          } else {
            sessionStorage.setItem('department', trimmedUsername)
            sessionStorage.setItem('isAdmin', 'false')
            console.log("USER LOGIN - Setting restricted access");
          }

          // Navigate to Add Inventory
          navigate("/dashboard/assign-task")

          showToast(`Login successful. Welcome, ${trimmedUsername}!`, "success")
          return
        } else {
          showToast("Username or password is incorrect. Please try again.", "error")
        }
      } else {
        showToast("Username or password is incorrect. Please try again.", "error")
      }

      // If we got here, login failed
      console.error("Login Failed", {
        usernameExists: trimmedUsername in masterData.userCredentials,
        passwordMatch: (trimmedUsername in masterData.userCredentials) ?
          "Password did not match" : 'Username not found',
        userRole: masterData.userRoles[trimmedUsername] || 'No role'
      })
    } catch (error) {
      console.error("Login Error:", error)
      showToast(`Login failed: ${error.message}. Please try again.`, "error")
    } finally {
      setIsLoginLoading(false)
    }
  }

  const showToast = (message, type) => {
    setToast({ show: true, message, type })
    setTimeout(() => {
      setToast({ show: false, message: "", type: "" })
    }, 5000) // Toast duration
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-200 p-1">
        <div className="bg-white rounded-2xl p-6 shadow-inner">
          {/* Header with Icon */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4 shadow-lg">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">GROSSERY IMS</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="block text-gray-700 text-sm font-medium">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Enter your username"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-gray-700 text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-base font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none shadow-lg mt-6"
              disabled={isLoginLoading || isDataLoading}
            >
              {isLoginLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Signing In...
                </div>
              ) : isDataLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Loading...
                </div>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Fixed Footer */}
      <div className="fixed left-0 right-0 bottom-0 py-1 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-center text-sm shadow-md z-10">
        <a
          href="https://www.botivate.in/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          Powered by-<span className="font-semibold">Botivate</span>
        </a>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${toast.type === "success"
          ? "bg-green-100 text-green-800 border-l-4 border-green-500"
          : "bg-red-100 text-red-800 border-l-4 border-red-500"
          }`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}

export default LoginPage