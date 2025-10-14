
"use client"

import { useState, useEffect } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import LoginPage from "./pages/LoginPage"
import AdminDashboard from "./pages/admin/Dashboard"
import AdminAssignTask from "./pages/admin/AssignTask"
import License from "./pages/License"
import "./index.css"
import Inventory from "./pages/Inventory"

// Auth wrapper component to protect routes
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const username = sessionStorage.getItem("username")
  const userRole = sessionStorage.getItem("role")

  // If no user is logged in, redirect to login
  if (!username) {
    return <Navigate to="/login" replace />
  }

  // If this is an admin-only route and user is not admin, redirect to dashboard
  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    return <Navigate to="/dashboard/admin" replace />
  }

  return children
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Login route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Dashboard redirect */}
        <Route path="/dashboard" element={<Navigate to="/dashboard/assign-task" replace />} />

        {/* Admin & User Dashboard route - keep this for any direct access */}
        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/assign-task"
          element={
            <ProtectedRoute>
              <AdminAssignTask />
            </ProtectedRoute>
          }
        />
       <Route
          path="/dashboard/Inventory"
          element={
            <ProtectedRoute>
              <Inventory/>
            </ProtectedRoute>
          }
        />

        {/* Available Pages Routes */}
        {/* <Route
          path="/dashboard/Crockery"
          element={
            <ProtectedRoute>
              <CrockeryPage/>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/Disposal"
          element={
            <ProtectedRoute>
              <DisposalPage/>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/Decor"
          element={
            <ProtectedRoute>
              <DecorPage/>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/Dresses"
          element={
            <ProtectedRoute>
              <DressesPage/>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/Grocery"
          element={
            <ProtectedRoute>
              <GroceryPage/>
            </ProtectedRoute>
          }
        />  */}

        {/* <Route
          path="/dashboard/Filter"
          element={
            <ProtectedRoute>
              <Filter/>
            </ProtectedRoute>
          }
        />  */}

        <Route
          path="/dashboard/License"
          element={
            <ProtectedRoute>
              <License />
            </ProtectedRoute>
          }
        />

        {/* Backward compatibility redirects */}
        <Route path="/admin/*" element={<Navigate to="/dashboard/admin" replace />} />
        <Route path="/admin/dashboard" element={<Navigate to="/dashboard/admin" replace />} />
        <Route path="/admin/assign-task" element={<Navigate to="/dashboard/assign-task" replace />} />
        <Route path="/user/*" element={<Navigate to="/dashboard/admin" replace />} />

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  )
}

export default App