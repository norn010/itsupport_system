import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

const InventoryList = () => {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({ name: '', category: '', quantity: 0, reorder_level: 5, location_id: '' })
  const [editQuantity, setEditQuantity] = useState('')
  const [locations, setLocations] = useState([])
  const [saving, setSaving] = useState(false)

  const fetchItems = async () => {
    try {
      const res = await axios.get('/api/inventory')
      setItems(res.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchItems() }, [])
  useEffect(() => {
    axios.get('/api/assets/locations').then(res => setLocations(res.data)).catch(() => {})
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await axios.post('/api/inventory', formData)
      setShowCreateModal(false)
      setFormData({ name: '', category: '', quantity: 0, reorder_level: 5, location_id: '' })
      fetchItems()
    } catch (err) { alert(err.response?.data?.message || 'Error') }
    finally { setSaving(false) }
  }

  const handleUpdateQuantity = async (id) => {
    try {
      await axios.put(`/api/inventory/${id}`, { quantity: parseInt(editQuantity) })
      setEditingId(null)
      fetchItems()
    } catch (err) { alert('Error updating') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this item?')) return
    try {
      await axios.delete(`/api/inventory/${id}`)
      fetchItems()
    } catch (err) { alert(err.response?.data?.message || 'Error') }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">Inventory & Stock</h1>
          <p className="text-slate-500 mt-1">{items.length} items tracked</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary text-sm">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          New Item
        </button>
      </div>

      {/* Low stock alert */}
      {items.filter(i => i.quantity <= i.reorder_level).length > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path></svg>
            <span className="font-bold text-amber-800">Low Stock Alert</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {items.filter(i => i.quantity <= i.reorder_level).map(i => (
              <span key={i.id} className="badge bg-amber-500/10 text-amber-700 border-amber-200">
                {i.name}: {i.quantity} left
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="card !p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-slate-400">No inventory items yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Name</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Category</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Quantity</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Reorder Level</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Location</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const isLow = item.quantity <= item.reorder_level
                return (
                  <tr key={item.id} className={`border-b border-slate-50 hover:bg-primary-50/30 transition-colors ${isLow ? 'bg-amber-50/30' : ''}`}>
                    <td className="py-3 px-4 font-medium text-slate-800">{item.name}</td>
                    <td className="py-3 px-4 text-slate-500">{item.category || '—'}</td>
                    <td className="py-3 px-4">
                      {editingId === item.id ? (
                        <div className="flex gap-2 items-center">
                          <input type="number" className="input !py-1 !px-2 w-20 text-sm" value={editQuantity}
                            onChange={e => setEditQuantity(e.target.value)} autoFocus />
                          <button onClick={() => handleUpdateQuantity(item.id)} className="text-xs text-emerald-600 font-semibold">✓</button>
                          <button onClick={() => setEditingId(null)} className="text-xs text-slate-400">✕</button>
                        </div>
                      ) : (
                        <span className={`font-bold cursor-pointer ${isLow ? 'text-red-600' : 'text-slate-800'}`}
                          onClick={() => { setEditingId(item.id); setEditQuantity(item.quantity) }}>
                          {item.quantity}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{item.reorder_level}</td>
                    <td className="py-3 px-4 text-slate-500">{item.location_name || '—'}</td>
                    <td className="py-3 px-4">
                      {isLow ? (
                        <span className="badge bg-red-500/10 text-red-700 border-red-200">Low Stock</span>
                      ) : (
                        <span className="badge bg-emerald-500/10 text-emerald-700 border-emerald-200">OK</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {user?.role === 'MANAGER' && (
                        <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 font-medium text-xs">Delete</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Add Inventory Item</h2>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Item Name *</label>
                <input className="input" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <input className="input" value={formData.category} onChange={e => setFormData(p => ({...p, category: e.target.value}))} placeholder="e.g. Toner, Cable, Mouse..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                  <input type="number" min="0" className="input" value={formData.quantity} onChange={e => setFormData(p => ({...p, quantity: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Reorder Level</label>
                  <input type="number" min="0" className="input" value={formData.reorder_level} onChange={e => setFormData(p => ({...p, reorder_level: e.target.value}))} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                <select className="input" value={formData.location_id} onChange={e => setFormData(p => ({...p, location_id: e.target.value}))}>
                  <option value="">Select</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Creating...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default InventoryList
