import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import axios from 'axios'

const ViewTicket = () => {
  const { id } = useParams()
  const [ticket, setTicket] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const messagesEndRef = useRef(null)
  const socketRef = useRef(null)
  const senderNameRef = useRef('')

  useEffect(() => {
    fetchTicket()
    
    // Setup socket connection
    socketRef.current = io(window.location.origin)
    socketRef.current.emit('join_ticket', id)
    
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
    } catch (err) {
      setError('Ticket not found')
    } finally {
      setLoading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const senderName = senderNameRef.current || 'User'
    
    // Send via socket
    socketRef.current.emit('send_message', {
      ticket_id: ticket.id,
      sender_type: 'user',
      sender_name: senderName,
      message: newMessage,
    })

    // Also save via API
    try {
      await axios.post(`/api/tickets/${ticket.id}/messages`, {
        message: newMessage,
        sender_type: 'user',
        sender_name: senderName,
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-6">
        <div className="card text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold text-red-600">{error}</h2>
          <p className="text-gray-600 mt-2">Please check the ticket ID and try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto mt-8 p-6">
      {/* Ticket Info */}
      <div className="card mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold">{ticket.issue_title}</h1>
            <p className="text-gray-500">{ticket.ticket_id}</p>
          </div>
          <div className="flex gap-2">
            {getStatusBadge(ticket.status)}
            {getPriorityBadge(ticket.priority)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500">From</p>
            <p className="font-medium">{ticket.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Department</p>
            <p className="font-medium">{ticket.department || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Created</p>
            <p className="font-medium">{new Date(ticket.created_at).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Assigned To</p>
            <p className="font-medium">{ticket.assigned_name || 'Unassigned'}</p>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-500 mb-1">Description</p>
          <p className="text-gray-800">{ticket.description || 'No description provided.'}</p>
        </div>

        {ticket.images?.length > 0 && (
          <div>
            <p className="text-sm text-gray-500 mb-2">Attachments</p>
            <div className="grid grid-cols-4 gap-2">
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
        <h2 className="text-xl font-bold mb-4">Chat with IT Support</h2>
        
        <div className="bg-gray-50 rounded-lg p-4 h-80 overflow-y-auto mb-4">
          {messages.length === 0 ? (
            <p className="text-gray-500 text-center">No messages yet. Start the conversation!</p>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`mb-3 flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    msg.sender_type === 'user'
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
            placeholder="Your name (optional)"
            className="input w-1/4"
            onChange={(e) => senderNameRef.current = e.target.value}
          />
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

export default ViewTicket
