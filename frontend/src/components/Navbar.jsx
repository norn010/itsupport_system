import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { io } from 'socket.io-client'

const Navbar = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [showAssetMenu, setShowAssetMenu] = useState(false)
  const dropdownRef = useRef(null)
  const assetMenuRef = useRef(null)
  const socketRef = useRef(null)

  useEffect(() => {
    if (!user) return

    fetchNotifications()

    socketRef.current = io()
    
    socketRef.current.on('connect', () => {
      console.log('Socket connected, registering user:', user.id)
      socketRef.current.emit('register_user', user.id)
    })

    socketRef.current.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message)
    })

    socketRef.current.on('notification', (newNotif) => {
      console.log('New notification received:', newNotif)
      setNotifications(prev => [newNotif, ...prev])
    })

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
      if (assetMenuRef.current && !assetMenuRef.current.contains(e.target)) {
        setShowAssetMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      socketRef.current?.disconnect()
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [user])

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/api/notifications')
      setNotifications(res.data)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const handleMarkAsRead = async (id, ticketId) => {
    try {
      await axios.patch(`/api/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      if (ticketId) navigate(`/admin/ticket/${ticketId}`)
    } catch (error) {
      console.error(error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await axios.patch('/api/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (error) {
      console.error(error)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <nav className="bg-white/70 backdrop-blur-md shadow-[0_4px_30px_rgb(0,0,0,0.03)] border-b border-white sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-primary-600 mr-8">
              IT Support
            </Link>
            <div className="hidden sm:flex items-center space-x-6">
              <Link to="/knowledge-base" className="text-gray-600 hover:text-primary-600 font-medium transition">
                FAQ / Knowledge Base
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {/* Notification Bell */}
                <div className="relative" ref={dropdownRef}>
                  <button 
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="relative p-2 text-gray-500 hover:text-primary-600 transition"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-50">
                      <div className="flex justify-between items-center p-3 border-b border-gray-100 bg-gray-50">
                        <span className="font-semibold text-gray-700">Notifications</span>
                        <button onClick={handleMarkAllAsRead} className="text-xs text-primary-600 hover:text-primary-800">Mark all as read</button>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-sm text-gray-500">No notifications yet.</div>
                        ) : (
                          notifications.map((notif) => (
                            <div 
                              key={notif.id} 
                              onClick={() => handleMarkAsRead(notif.id, notif.related_ticket_id)}
                              className={`p-3 border-b border-gray-50 cursor-pointer transition ${notif.is_read ? 'bg-white opacity-70' : 'bg-blue-50/50 hover:bg-blue-50'}`}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span className={`text-sm ${notif.is_read ? 'font-medium text-gray-700' : 'font-bold text-gray-900'}`}>{notif.title}</span>
                                {!notif.is_read && <span className="w-2 h-2 rounded-full bg-blue-500 mt-1"></span>}
                              </div>
                              <p className="text-xs text-gray-500 line-clamp-2">{notif.message}</p>
                              <span className="text-[10px] text-gray-400 mt-1 block">{new Date(notif.created_at).toLocaleString()}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="h-6 border-l border-gray-300 mx-1"></div>

                <span className="text-gray-600 font-medium mr-2">{user.full_name || user.username}</span>
                <span className="badge badge-primary-100 text-primary-800 mr-2">{user.role}</span>
                <Link to="/dashboard" className="text-gray-600 hover:text-gray-900 font-medium mr-3">Dashboard</Link>
                <Link to="/tickets" className="text-gray-600 hover:text-gray-900 font-medium mr-3">Tickets</Link>

                {/* ITAM Dropdown Menu */}
                <div className="relative" ref={assetMenuRef}>
                  <button
                    onClick={() => setShowAssetMenu(!showAssetMenu)}
                    className="text-gray-600 hover:text-gray-900 font-medium mr-3 inline-flex items-center gap-1"
                  >
                    Assets
                    <svg className={`w-3 h-3 transition-transform ${showAssetMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showAssetMenu && (
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 py-1">
                      <Link to="/assets/dashboard" onClick={() => setShowAssetMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                        Asset Dashboard
                      </Link>
                      <Link to="/assets" onClick={() => setShowAssetMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                        All Assets
                      </Link>
                      <Link to="/licenses" onClick={() => setShowAssetMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                        Software Licenses
                      </Link>
                      <Link to="/inventory" onClick={() => setShowAssetMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                        Inventory & Stock
                      </Link>
                    </div>
                  )}
                </div>

                <Link to="/admin/kb" className="text-gray-600 hover:text-gray-900 font-medium mr-3">Articles</Link>
                <button onClick={handleLogout} className="btn-secondary text-sm px-4 py-1.5 focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">Logout</button>
              </>
            ) : (
              <Link to="/login" className="text-sm font-semibold text-primary-600 hover:text-primary-800">
                Staff Login &rarr;
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
