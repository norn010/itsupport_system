import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const Navbar = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-primary-600">
              IT Support
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-gray-600">{user.full_name || user.username}</span>
                <span className="badge badge-primary-100 text-primary-800">{user.role}</span>
                <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
                <Link to="/tickets" className="text-gray-600 hover:text-gray-900">Tickets</Link>
                <button onClick={handleLogout} className="btn-secondary">Logout</button>
              </>
            ) : (
              <Link to="/login" className="btn-primary">Staff Login</Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
