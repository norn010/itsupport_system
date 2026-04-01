import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import axios from 'axios'
import notificationSound from '../sound/notification_message-notification-alert-8-331718.m4a'
import { saveRecentTicket } from '../utils/ticketStorage'
import { getBrowserMetadata } from '../utils/browserInfo'

const ViewTicket = () => {
  const { id } = useParams()
  const [ticket, setTicket] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [previewImage, setPreviewImage] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)
  const socketRef = useRef(null)
  const senderNameRef = useRef('')

  const [feedbackRating, setFeedbackRating] = useState(0)
  const [feedbackComment, setFeedbackComment] = useState('')
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [typingUser, setTypingUser] = useState('')
  const typingTimeoutRef = useRef(null)

  useEffect(() => {
    fetchTicket()
  }, [id])

  useEffect(() => {
    if (!ticket?.id) return

    socketRef.current = io()
    socketRef.current.emit('join_ticket', ticket.id)
    
    socketRef.current.on('new_message', (message) => {
      setMessages(prev => [...prev, message])
      if (message.sender_type === 'staff') {
        const audio = new Audio(notificationSound);
        audio.play().catch(e => console.log('Audio error:', e));
      }
    })

    socketRef.current.on('ticket_updated', (updatedTicket) => {
      setTicket(prev => ({
        ...prev,
        ...updatedTicket,
        feedback_rating: prev.feedback_rating,
        feedback_comment: prev.feedback_comment
      }))
    })

    socketRef.current.on('typing', ({ userName }) => {
      setTypingUser(userName)
      setIsTyping(true)
    })

    socketRef.current.on('stop_typing', () => {
      setIsTyping(false)
      setTypingUser('')
    })

    return () => {
      socketRef.current?.disconnect()
    }
  }, [ticket?.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchTicket = async () => {
    try {
      const response = await axios.get(`/api/tickets/search/${id}`)
      setTicket(response.data)
      saveRecentTicket(response.data)
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

  const [isDragging, setIsDragging] = useState(false)

  const handlePaste = (e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        handleSelectedFile(file);
      }
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      if (files[0].type.startsWith('image/')) {
        handleSelectedFile(files[0])
      }
    }
  }

  const handleSelectedFile = (file) => {
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() && !selectedFile) return
    setSending(true)

    // Stop typing immediately when sending
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    socketRef.current.emit('stop_typing', { ticketId: ticket.id })

    const senderName = senderNameRef.current || 'User'
    
    try {
      const formData = new FormData();
      formData.append('message', newMessage);
      formData.append('sender_type', 'user');
      formData.append('sender_name', senderName);
      if (selectedFile) {
        formData.append('image', selectedFile);
      }
      
      const assetInfo = ticket.asset_id ? {
        name: ticket.asset_name,
        model: ticket.asset_model,
        asset_code: ticket.asset_code
      } : null;
      
      const metadata = getBrowserMetadata(assetInfo);
      formData.append('metadata', JSON.stringify(metadata));

      await axios.post(`/api/tickets/${ticket.id}/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      setNewMessage('')
      setSelectedFile(null)
      setPreviewImage(null)
    } catch (err) {
      console.error('Error saving message:', err)
    } finally {
      setSending(false)
    }
  }

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault()
    if (!feedbackRating) return alert('Please select a rating')
    setSubmittingFeedback(true)
    try {
      const { data } = await axios.post(`/api/tickets/${ticket.ticket_id}/feedback`, {
        rating: feedbackRating,
        comment: feedbackComment
      })
      setTicket(prev => ({ 
        ...prev, 
        feedback_rating: data.feedback.rating, 
        feedback_comment: data.feedback.comment 
      }))
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit feedback')
    } finally {
      setSubmittingFeedback(false)
    }
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

        {/* Feedback Section */}
        {(ticket.status === 'Resolved' || ticket.status === 'Closed') && (
          <div className="mt-8 border-t pt-6">
            <h3 className="text-lg font-bold mb-4">How was our service?</h3>
            {ticket.feedback_rating ? (
              <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                <p className="font-semibold text-green-800 flex items-center gap-2">
                  <span className="text-xl">{'⭐'.repeat(ticket.feedback_rating)} </span>
                  Thank you for your feedback!
                </p>
                {ticket.feedback_comment && (
                  <p className="text-green-700 mt-2 text-sm italic">"{ticket.feedback_comment}"</p>
                )}
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button 
                      key={star} 
                      type="button" 
                      onClick={() => setFeedbackRating(star)}
                      className={`text-3xl hover:scale-110 transition ${feedbackRating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <textarea 
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Any comments? (Optional)"
                  className="input w-full mb-3 text-sm h-20"
                />
                <button type="submit" disabled={submittingFeedback || !feedbackRating} className="btn-primary text-sm">
                  {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Chat */}
      <div 
        className={`card transition-all duration-300 ${isDragging ? 'ring-4 ring-primary-500 ring-opacity-50 border-primary-500 scale-[1.01]' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <h2 className="text-xl font-bold mb-4">Chat with IT Support</h2>
        
        <div className={`bg-gray-50 rounded-lg p-4 h-80 overflow-y-auto mb-4 relative ${isDragging ? 'bg-primary-50' : ''}`}>
          {isDragging && (
            <div className="absolute inset-0 z-10 bg-primary-500/10 backdrop-blur-[2px] flex items-center justify-center border-2 border-dashed border-primary-500 rounded-lg animate-in fade-in zoom-in duration-200">
               <div className="bg-white px-6 py-4 rounded-2xl shadow-xl flex flex-col items-center gap-2">
                 <div className="text-4xl">🖼️</div>
                 <p className="font-black text-primary-600 uppercase tracking-widest text-sm">Drop Image to Attach</p>
               </div>
            </div>
          )}
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
                  {msg.file_path && (
                    <img 
                      src={msg.file_path} 
                      alt="Chat attachment" 
                      className="max-w-full rounded mb-2 cursor-pointer hover:opacity-90"
                      onClick={() => setSelectedImage(msg.file_path)}
                    />
                  )}
                  {msg.message && <p>{msg.message}</p>}
                </div>
              </div>
            ))
          )}
          {isTyping && (
            <div className="flex items-center gap-2 mb-3 text-xs text-gray-500 italic animate-pulse">
              <div className="flex gap-1">
                <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></span>
                <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
              {typingUser} is typing...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {previewImage && (
          <div className="relative inline-block mb-4">
            <img src={previewImage} alt="Preview" className="h-20 w-20 object-cover rounded border" />
            <button
              onClick={() => { setPreviewImage(null); setSelectedFile(null); }}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
            >✕</button>
          </div>
        )}
        
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            placeholder="Your name (optional)"
            className="input w-1/4"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                document.getElementById('chat-message-input').focus()
              }
            }}
            onChange={(e) => senderNameRef.current = e.target.value}
          />
          <div className="flex-1 relative">
            <input
              id="chat-message-input"
              type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value)
                
                // Typing Indicator logic
                if (socketRef.current) {
                  socketRef.current.emit('typing', { 
                    ticketId: ticket.id, 
                    userName: senderNameRef.current || 'User' 
                  })
                  
                  if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
                  typingTimeoutRef.current = setTimeout(() => {
                    socketRef.current.emit('stop_typing', { ticketId: ticket.id })
                  }, 3000)
                }
              }}
              onPaste={handlePaste}
              placeholder="Type your message or paste an image..."
              className="input w-full pr-10"
              autoComplete="off"
              disabled={sending}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-600"
            >
              📎
            </button>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={(e) => handleSelectedFile(e.target.files[0])}
          />
          <button type="submit" className="btn-primary" disabled={sending}>
            {sending ? 'Sending...' : 'Send'}
          </button>
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
