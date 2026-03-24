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
  const dropdownRef = useRef(null)
  const socketRef = useRef(null)

  useEffect(() => {
    if (!user) return

    fetchNotifications()

    socketRef.current = io()
    socketRef.current.emit('register_user', user.id)

    socketRef.current.on('notification', (newNotif) => {
      setNotifications(prev => [newNotif, ...prev])
    })

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
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
