import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { io } from 'socket.io-client'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import InternalNotes from '../components/InternalNotes'
import ActivityTimeline from '../components/ActivityTimeline'
import notificationSound from '../sound/notification_message-notification-alert-8-331718.m4a'

const TicketDetail = () => {
  const { id } = useParams()
  const { user } = useAuth()
  const [ticket, setTicket] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)
  const [isTyping, setIsTyping] = useState(false)
  const [typingUser, setTypingUser] = useState('')
  const typingTimeoutRef = useRef(null)
  const socketRef = useRef(null)

  // Asset linking state
  const [assetSearch, setAssetSearch] = useState('')
  const [assetResults, setAssetResults] = useState([])
  const [assetDropdownOpen, setAssetDropdownOpen] = useState(false)
  const [assetSearching, setAssetSearching] = useState(false)
  const [showAssetSearch, setShowAssetSearch] = useState(false)
  const [savingAsset, setSavingAsset] = useState(false)
  const [categories, setCategories] = useState([])
  const [subcategories, setSubcategories] = useState([])
  const [catName, setCatName] = useState('')
  const [subCatName, setSubCatName] = useState('')
  const [catDropdownOpen, setCatDropdownOpen] = useState(false)
  const [subCatDropdownOpen, setSubCatDropdownOpen] = useState(false)
  const assetSearchRef = useRef(null)

  const [isDragging, setIsDragging] = useState(false)

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

  const handlePaste = (e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        handleSelectedFile(file);
      }
    }
  }

  const handleSelectedFile = (file) => {
    if (!file) return
    setSelectedFile(file)
    setPreviewImage(URL.createObjectURL(file))
  }

  const renderMessage = (text) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:opacity-80 transition-opacity break-all font-bold italic"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() && !selectedFile) return
    setSending(true)

    // Stop typing immediately when sending
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    socketRef.current.emit('stop_typing', { ticketId: ticket.id })

    try {
      const formData = new FormData();
      formData.append('message', newMessage);
      formData.append('sender_type', 'staff');
      if (selectedFile) {
        formData.append('image', selectedFile);
      }

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

  useEffect(() => {
    fetchTicket()
    fetchStaff()
    fetchCategories()
  }, [id])

  useEffect(() => {
    if (ticket?.category_id) {
      fetchSubcategories(ticket.category_id)
    } else {
      setSubcategories([])
    }
  }, [ticket?.category_id])

  const fetchCategories = async () => {
    try {
      const res = await axios.get('/api/categories')
      setCategories(res.data)
    } catch (err) {
      console.error('Error fetching categories:', err)
    }
  }

  const fetchSubcategories = async (categoryId) => {
    try {
      const res = await axios.get(`/api/categories/${categoryId}/subcategories`)
      setSubcategories(res.data)
    } catch (err) {
      console.error('Error fetching subcategories:', err)
    }
  }

  useEffect(() => {
    if (!ticket?.id) return

    socketRef.current = io()
    socketRef.current.emit('join_ticket', ticket.id)
    
    socketRef.current.on('new_message', (message) => {
      setMessages(prev => [...prev, message])
      if (message.sender_type === 'user') {
        const audio = new Audio(notificationSound);
        audio.play().catch(e => console.log('Audio error:', e));
      }
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

  useEffect(() => {
    if (ticket) {
      setCatName(ticket.category_name || '')
      setSubCatName(ticket.subcategory_name || '')
    }
  }, [ticket?.id, ticket?.category_id, ticket?.subcategory_id])

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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Asset linking ────────────────────────────────────────────
  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (assetSearchRef.current && !assetSearchRef.current.contains(e.target)) {
        setAssetDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Debounced live search
  useEffect(() => {
    if (!assetSearch.trim()) { setAssetResults([]); return }
    const timer = setTimeout(async () => {
      setAssetSearching(true)
      try {
        const res = await axios.get('/api/assets', { params: { search: assetSearch, limit: 8 } })
        setAssetResults(res.data.assets || [])
        setAssetDropdownOpen(true)
      } catch { setAssetResults([]) }
      finally { setAssetSearching(false) }
    }, 350)
    return () => clearTimeout(timer)
  }, [assetSearch])

  const handleLinkAsset = async (asset) => {
    setSavingAsset(true)
    try {
      const response = await axios.patch(`/api/tickets/${ticket.id}`, { asset_id: asset.id })
      setTicket(response.data.ticket)
      setShowAssetSearch(false)
      setAssetSearch('')
      setAssetResults([])
    } catch (err) {
      alert(err.response?.data?.message || 'Could not link asset')
    } finally { setSavingAsset(false) }
  }

  const handleUnlinkAsset = async () => {
    if (!confirm('Remove asset link from this ticket?')) return
    setSavingAsset(true)
    try {
      const response = await axios.patch(`/api/tickets/${ticket.id}`, { asset_id: null })
      setTicket(response.data.ticket)
    } catch (err) {
      alert('Could not unlink asset')
    } finally { setSavingAsset(false) }
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
      <div className="max-w-4xl mx-auto mt-8 p-6">
        <div className="card text-center py-12">
          <p className="text-xl text-slate-500 mb-4">Ticket not found.</p>
          <Link to="/tickets" className="btn-primary">Back to List</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{ticket.ticket_id}</h1>
            <div className="flex gap-2">
              {getStatusBadge(ticket.status)}
              {getPriorityBadge(ticket.priority)}
            </div>
          </div>
          <p className="text-slate-500 font-medium text-lg">{ticket.issue_title}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button 
            onClick={handleCopyLink}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border ${
              copied 
              ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-200' 
              : 'bg-white text-slate-600 border-slate-200 hover:border-primary-500 hover:text-primary-600'
            }`}
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                <span className="hidden xs:inline">Copied!</span>
                <span className="xs:hidden">✓</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                <span className="hidden xs:inline">Copy Link</span>
                <span className="xs:hidden">Link</span>
              </>
            )}
          </button>
          <Link to="/tickets" className="btn-secondary flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            <span className="hidden xs:inline">Back to List</span>
            <span className="xs:hidden">Back</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Main Content (Left Column - 2/3) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Issue Description Card */}
          <div className="card shadow-sm border-slate-200 bg-white overflow-hidden">
            <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2">
              <div className="p-2 bg-primary-50 rounded-lg text-primary-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              </div>
              <h2 className="font-bold text-slate-800">Issue Description</h2>
            </div>
            <div className="p-6 prose prose-slate max-w-none text-slate-700 leading-relaxed min-h-[120px] whitespace-pre-wrap text-base">
              {ticket.description ? renderMessage(ticket.description) : 'No description provided.'}
            </div>
          </div>

          {/* Attachments Section — Between Description and Chat */}
          {ticket.images?.length > 0 && (
            <div className="card shadow-sm border-slate-200 bg-white overflow-hidden">
              <div className="px-6 py-4 bg-amber-50/50 border-b border-amber-100/50 flex items-center gap-2">
                <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                </div>
                <h2 className="font-bold text-slate-800">Attachments ({ticket.images.length})</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {ticket.images.map((img, index) => (
                    <div key={index} className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 cursor-pointer shadow-sm hover:ring-4 hover:ring-amber-100 transition-all duration-300" onClick={() => setSelectedImage(img)}>
                      <img src={img} alt="Attach" className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <svg className="w-6 h-6 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Chat Section — Full Width in main column */}
          <div 
            className={`card shadow-sm border-slate-200 bg-white flex flex-col h-[700px] transition-all duration-300 ${isDragging ? 'ring-4 ring-indigo-500 ring-opacity-50 !border-indigo-400 scale-[1.005]' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                </div>
                <h2 className="font-bold text-slate-800">Ticket Conversation</h2>
              </div>
              <div className="flex items-center gap-2">
                 <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{messages.length} messages</span>
              </div>
            </div>
            
            <div className={`p-6 bg-slate-50/30 flex-1 overflow-y-auto border-b border-slate-100 scrollbar-thin scrollbar-thumb-slate-200 relative ${isDragging ? '!bg-indigo-50/50' : ''}`}>
              {isDragging && (
                <div className="absolute inset-x-6 inset-y-6 z-10 bg-indigo-500/10 backdrop-blur-[2px] flex items-center justify-center border-2 border-dashed border-indigo-400 rounded-3xl animate-in fade-in zoom-in duration-200 pointer-events-none">
                  <div className="bg-white px-8 py-6 rounded-3xl shadow-2xl flex flex-col items-center gap-3 border border-indigo-50">
                    <div className="text-5xl animate-bounce">🖼️</div>
                    <p className="font-black text-indigo-600 uppercase tracking-widest text-sm">Drop to share image</p>
                  </div>
                </div>
              )}
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                  <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"></path></svg>
                  <p className="text-lg font-medium">No messages yet</p>
                  <p className="text-sm">Be the first to respond to this request.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.sender_type === 'staff' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-5 py-4 shadow-sm ${
                        msg.sender_type === 'staff' 
                        ? 'bg-indigo-600 text-white rounded-br-none ring-4 ring-indigo-50 shadow-indigo-100' 
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-slate-100'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">{msg.sender_name}</span>
                          <span className="text-[11px] opacity-60 font-medium">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {msg.file_path && (
                          <div className="mb-3 rounded-xl overflow-hidden border border-black/5 cursor-pointer hover:ring-2 hover:ring-white/20 transition" onClick={() => setSelectedImage(msg.file_path)}>
                            <img src={msg.file_path} alt="Chat attachment" className="w-full h-auto max-h-80 object-cover" />
                          </div>
                        )}
                        {msg.message && <div className="text-[15px] leading-relaxed font-medium whitespace-pre-wrap">{renderMessage(msg.message)}</div>}
                      </div>
                    </div>
                  ))}
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
              )}
            </div>

            <div className="p-4 bg-white">
              {previewImage && (
                <div className="relative inline-block mb-4 p-2 bg-slate-50 border border-slate-200 rounded-2xl shadow-lg animate-in zoom-in duration-200">
                  <img src={previewImage} alt="Preview" className="h-32 w-32 object-cover rounded-xl" />
                  <button onClick={() => { setPreviewImage(null); setSelectedFile(null); }} className="absolute -top-3 -right-3 bg-rose-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs shadow-xl hover:bg-rose-600 transition hover:scale-110 active:scale-95 ring-4 ring-white">✕</button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex gap-3">
                <div className="flex-1 relative group">
                  <input 
                    type="text" 
                    value={newMessage} 
                    onChange={(e) => {
                      setNewMessage(e.target.value)
                      
                      // Typing Indicator logic
                      if (socketRef.current) {
                        socketRef.current.emit('typing', { 
                          ticketId: ticket.id, 
                          userName: user.full_name || 'Staff' 
                        })
                        
                        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
                        typingTimeoutRef.current = setTimeout(() => {
                          socketRef.current.emit('stop_typing', { ticketId: ticket.id })
                        }, 3000)
                      }
                    }} 
                    onPaste={handlePaste} 
                    placeholder="Write a message to the user..." 
                    className="input w-full pr-14 py-3.5 bg-slate-50 border-slate-200 focus:bg-white focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 transition-all rounded-2xl text-base shadow-sm"
                    autoComplete="off" 
                    disabled={sending} 
                  />
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()} 
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors w-10 h-10 flex items-center justify-center hover:bg-indigo-50 rounded-xl"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                  </button>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleSelectedFile(e.target.files[0])} />
                <button 
                  type="submit" 
                  className="px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 disabled:opacity-50 transition-all transform active:scale-95 flex items-center gap-2 h-[54px]"
                  disabled={sending}
                >
                  {sending ? <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full"></div> : <span>Send Response</span>}
                </button>
              </form>
            </div>
          </div>

          <ActivityTimeline ticketId={ticket.ticket_id} />
        </div>

        {/* Sidebar (Right Column - 1/3) */}
        <div className="space-y-6">
          
          {/* Status & Assignment Card */}
          <div className="card shadow-md border-primary-100 bg-white ring-1 ring-primary-50">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-primary-500 rounded-full"></span>
              Management
            </h2>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Current Status</label>
                <select 
                  value={ticket.status} 
                  onChange={(e) => handleUpdateTicket({ status: e.target.value })} 
                  className="input py-3 bg-slate-50 font-bold text-slate-800 border-slate-200 focus:bg-white transition-colors cursor-pointer rounded-xl"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Priority Level</label>
                <select 
                  value={ticket.priority} 
                  onChange={(e) => handleUpdateTicket({ priority: e.target.value })} 
                  className="input py-3 bg-slate-50 font-bold text-slate-800 border-slate-200 focus:bg-white transition-colors cursor-pointer rounded-xl"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Assigned Support</label>
                <select 
                  value={ticket.assigned_to || ''} 
                  onChange={(e) => handleUpdateTicket({ assigned_to: e.target.value || null })} 
                  className="input py-3 bg-slate-50 text-slate-800 border-slate-200 focus:bg-white transition-colors cursor-pointer rounded-xl font-medium"
                >
                  <option value="">Unassigned</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-3">Classification</label>
                <div className="space-y-4">
                  {/* Category Dropdown */}
                  <div className="space-y-1 relative">
                    <div className="input-group">
                      <input 
                        placeholder="Type or select Category"
                        value={catName} 
                        onChange={(e) => {
                          setCatName(e.target.value);
                          setCatDropdownOpen(true);
                        }}
                        onFocus={() => setCatDropdownOpen(true)}
                        onBlur={(e) => {
                          const val = e.target.value;
                          if (val !== (ticket.category_name || '')) {
                            handleUpdateTicket({ category_name: val });
                          }
                        }}
                        className="input py-2.5 bg-slate-50 text-slate-700 border-slate-100 focus:bg-white transition-colors rounded-lg text-sm w-full pr-10"
                      />
                      <svg className={`dropdown-icon w-4 h-4 right-3 transition-transform ${catDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </div>

                    {catDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setCatDropdownOpen(false)}></div>
                        <div className="absolute z-30 w-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-40 overflow-y-auto animate-in slide-in-from-top-1">
                          {categories.filter(c => c.name.toLowerCase().includes(catName.toLowerCase())).map(c => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setCatName(c.name);
                                setCatDropdownOpen(false);
                                handleUpdateTicket({ category_name: c.name });
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 text-xs font-bold border-b border-slate-50 last:border-0"
                            >
                              {c.name}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Subcategory Dropdown */}
                  <div className="space-y-1 relative">
                    <div className="input-group">
                      <input 
                        placeholder="Type or select Subcategory"
                        value={subCatName} 
                        onChange={(e) => {
                          setSubCatName(e.target.value);
                          setSubCatDropdownOpen(true);
                        }}
                        onFocus={() => setSubCatDropdownOpen(true)}
                        onBlur={(e) => {
                          const val = e.target.value;
                          if (val !== (ticket.subcategory_name || '')) {
                            handleUpdateTicket({ subcategory_name: val });
                          }
                        }}
                        className="input py-2.5 bg-slate-50 text-slate-700 border-slate-100 focus:bg-white transition-colors rounded-lg text-sm w-full pr-10"
                        disabled={!ticket.category_id && !catName}
                      />
                      <svg className={`dropdown-icon w-4 h-4 right-3 transition-transform ${subCatDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </div>

                    {subCatDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setSubCatDropdownOpen(false)}></div>
                        <div className="absolute z-30 w-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-40 overflow-y-auto animate-in slide-in-from-top-1">
                          {subcategories.filter(sc => sc.name.toLowerCase().includes(subCatName.toLowerCase())).map(sc => (
                            <button
                              key={sc.id}
                              type="button"
                              onClick={() => {
                                setSubCatName(sc.name);
                                setSubCatDropdownOpen(false);
                                handleUpdateTicket({ subcategory_name: sc.name });
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 text-xs font-bold border-b border-slate-50 last:border-0"
                            >
                              {sc.name}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Requester Profile Card */}
          <div className="card shadow-sm border-slate-200 bg-white overflow-hidden">
             <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                  Requester Profile
                </h2>
             </div>
             <div className="p-5">
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/50 mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-indigo-200">
                    {ticket.name?.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-extrabold text-slate-900 text-lg truncate leading-none mb-1">{ticket.name}</p>
                    <div className="flex items-center gap-1.5 text-indigo-600">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                      <span className="text-xs font-bold tracking-wide">{ticket.department || 'General'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 font-medium">Ticket Created</span>
                    <span className="text-slate-700 font-bold">{new Date(ticket.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 font-medium">Time</span>
                    <span className="text-slate-700 font-bold">{new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
             </div>
          </div>

          {/* Linked Asset Card */}
          <div className="card shadow-sm border-slate-200 bg-white overflow-hidden">
            <div className="px-5 py-4 bg-emerald-50/50 border-b border-emerald-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                Hardware Link
              </h2>
              {!showAssetSearch && (
                <button onClick={() => setShowAssetSearch(true)} className="text-xs font-extrabold text-emerald-600 hover:text-emerald-700 transition-colors uppercase tracking-widest">
                  {ticket.asset_id ? 'Change' : '+ Connect'}
                </button>
              )}
            </div>
            <div className="p-5">
              {ticket.asset_id && !showAssetSearch ? (
                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-md">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H7V9h2z"></path></svg>
                    </div>
                    <div className="min-w-0">
                      <Link to={`/assets/${ticket.asset_id}`} className="font-black text-emerald-900 text-base hover:underline truncate block">{ticket.asset_code}</Link>
                      <p className="text-xs font-bold text-emerald-600 truncate">{ticket.asset_name}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={handleUnlinkAsset} disabled={savingAsset} className="flex-1 py-2 text-xs font-bold text-rose-500 bg-white border border-rose-100 rounded-lg hover:bg-rose-50 transition active:scale-95">Disconnect Asset</button>
                    <Link to={`/assets/${ticket.asset_id}`} className="px-4 py-2 text-xs font-bold text-emerald-600 bg-white border border-emerald-100 rounded-lg hover:bg-emerald-50 transition flex items-center justify-center">Details</Link>
                  </div>
                </div>
              ) : !showAssetSearch && (
                <button onClick={() => setShowAssetSearch(true)} className="w-full h-24 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:bg-slate-50 hover:border-slate-300 transition-all group">
                  <svg className="w-8 h-8 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  <span className="text-xs font-bold uppercase tracking-widest">Connect Hardware</span>
                </button>
              )}

              {showAssetSearch && (
                <div ref={assetSearchRef} className="animate-in slide-in-from-top-2 duration-300">
                  <div className="relative mb-3">
                    <input 
                      type="text" 
                      value={assetSearch} 
                      onChange={e => setAssetSearch(e.target.value)} 
                      placeholder="S/N, Tag, or Model..." 
                      className="input w-full py-3 pl-10 pr-4 text-sm bg-white border-slate-200 rounded-xl shadow-inner italic" 
                      autoFocus 
                      autoComplete="off" 
                    />
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    {assetSearching && <div className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent"></div>}
                  </div>
                  {assetDropdownOpen && assetResults.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xl max-h-60 overflow-y-auto mb-3">
                      {assetResults.map(a => (
                        <button key={a.id} type="button" onClick={() => handleLinkAsset(a)} disabled={savingAsset} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 text-left transition border-b border-slate-50 last:border-0 group">
                          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${a.status === 'Available' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-blue-400'}`}></div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-black text-slate-800 leading-tight group-hover:text-emerald-700">{a.asset_code}</p>
                            <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">{a.name} · {a.brand}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] text-slate-400 font-medium italic">Type at least 3 characters</p>
                    <button type="button" onClick={() => { setShowAssetSearch(false); setAssetSearch(''); setAssetResults([]); setAssetDropdownOpen(false); }} className="text-xs font-bold text-slate-400 hover:text-slate-600 px-2 py-1">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <InternalNotes ticketId={ticket.ticket_id} />
        </div>
      </div>

       {/* Image Modal */}
       {selectedImage && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4 sm:p-8 animate-in fade-in duration-300" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-5xl w-full max-h-full flex items-center justify-center">
             <button className="absolute -top-12 right-0 text-white hover:text-slate-300 transition transform hover:rotate-90">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
             </button>
             <img src={selectedImage} alt="Full size" className="max-w-full max-h-full rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300" />
          </div>
        </div>
      )}
    </div>
  )
}

export default TicketDetail
