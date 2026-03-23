import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { io } from 'socket.io-client'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

const TicketDetail = () => {
  const { id } = useParams()
  const { user } = useAuth()
  const [ticket, setTicket] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(null)
  const messagesEndRef = useRef(null)
  const socketRef = useRef(null)

  useEffect(() => {
    fetchTicket()
    fetchStaff()
    
    socketRef.current = io(window.location.origin)
    socketRef.current.emit('join_ticket', ticket?.id || id)
    
    socketRef.current.on('new_message', (message) => {
      setMessages(prev => [...prev, message])
    })

    return () => {
      socketRef.current?.disconnect()
    }
  }, [id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchTicket = async () => {
    try {
      const response = await axios.get(`/api/tickets/search/${id}`)
      setTicket(response.data)
      setMessages(response.data.messages || [])
    } catch (error) {
      console.error('Error fetching ticket:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStaff = async () => {
    try {
      const response = await axios.get('/api/tickets/staff/it')
      setStaff(response.data)
    } catch (error) {
      console.error('Error fetching staff:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleUpdateTicket = async (updates) => {
    try {
      const response = await axios.patch(`/api/tickets/${ticket.id}`, updates)
      setTicket(response.data.ticket)
    } catch (error) {
      console.error('Error updating ticket:', error)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    socketRef.current.emit('send_message', {
      ticket_id: ticket.id,
      sender_type: 'staff',
      sender_name: user.full_name,
      message: newMessage,
      user_id: user.id,
    })

    try {
      await axios.post(`/api/tickets/${ticket.id}/messages`, {
        message: newMessage,
        sender_type: 'staff',
      })
    } catch (err) {
      console.error('Error saving message:', err)
    }

    setNewMessage('')
  }

  const getStatusBadge = (status) => {
    const classes = {
      'Open': 'badge-open',
      'In Progress': 'badge-in-progress',
      'Resolved': 'badge-resolved',
      'Closed': 'badge-closed',
    }
    return <span className={classes[status] || 'badge'}>{status}</span>
  }

  const getPriorityBadge = (priority) => {
    const classes = {
      'High': 'badge-high',
      'Medium': 'badge-medium',
      'Low': 'badge-low',
    }
    return <span className={classes[priority] || 'badge'}>{priority}</span>
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Ticket not found.</p>
        <Link to="/tickets" className="text-primary-600 hover:underline">Back to tickets</Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{ticket.ticket_id}</h1>
        <div className="flex gap-2">
          <Link to="/tickets" className="btn-secondary">Back to List</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ticket Info */}
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Ticket Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">Title</label>
                <p className="font-medium">{ticket.issue_title}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Status</label>
                  <div className="mt-1">{getStatusBadge(ticket.status)}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Priority</label>
                  <div className="mt-1">{getPriorityBadge(ticket.priority)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">From</label>
                  <p className="font-medium">{ticket.name}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Department</label>
                  <p className="font-medium">{ticket.department || 'N/A'}</p>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-500">Description</label>
                <p className="mt-1">{ticket.description || 'No description provided.'}</p>
              </div>

              <div>
                <label className="text-sm text-gray-500">Created</label>
                <p>{new Date(ticket.created_at).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Update Ticket</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={ticket.status}
                  onChange={(e) => handleUpdateTicket({ status: e.target.value })}
                  className="input"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={ticket.priority}
                  onChange={(e) => handleUpdateTicket({ priority: e.target.value })}
                  className="input"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                <select
                  value={ticket.assigned_to || ''}
                  onChange={(e) => handleUpdateTicket({ assigned_to: e.target.value || null })}
                  className="input"
                >
                  <option value="">Unassigned</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Images */}
          {ticket.images?.length > 0 && (
            <div className="card">
              <h2 className="text-xl font-bold mb-4">Attachments</h2>
              <div className="grid grid-cols-3 gap-2">
                {ticket.images.map((img, index) => (
                  <img
                    key={index}
                    src={img}
                    alt={`Attachment ${index + 1}`}
                    className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-80"
                    onClick={() => setSelectedImage(img)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chat */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Chat</h2>
          
          <div className="bg-gray-50 rounded-lg p-4 h-[400px] overflow-y-auto mb-4">
            {messages.length === 0 ? (
              <p className="text-gray-500 text-center">No messages yet.</p>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={`mb-3 flex ${msg.sender_type === 'staff' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.sender_type === 'staff'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    <p className="text-xs opacity-75 mb-1">
                      {msg.sender_name} • {new Date(msg.created_at).toLocaleTimeString()}
                    </p>
                    <p>{msg.message}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="input flex-1"
            />
            <button type="submit" className="btn-primary">Send</button>
          </form>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setSelectedImage(null)}
        >
          <img src={selectedImage} alt="Full size" className="max-w-[90%] max-h-[90%] rounded" />
        </div>
      )}
    </div>
  )
}

export default TicketDetail
