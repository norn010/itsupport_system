import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

const STATUS_COLORS = {
  'Available': 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  'In Use': 'bg-blue-500/10 text-blue-700 border-blue-200',
  'Repair': 'bg-amber-500/10 text-amber-700 border-amber-200',
  'Lost': 'bg-red-500/10 text-red-700 border-red-200',
  'Retired': 'bg-slate-500/10 text-slate-700 border-slate-200',
}

const AssetList = () => {
  const { user } = useAuth()
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ status: '', category_id: '', location_id: '', search: '' })
  const [categories, setCategories] = useState([])
  const [locations, setLocations] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '', category_id: '', subcategory_id: '', brand: '', model: '',
    serial_number: '', purchase_date: '', warranty_expiry: '', cost: '',
    vendor_id: '', location_id: '', description: ''
  })
  const [subcategories, setSubcategories] = useState([])
  const [vendors, setVendors] = useState([])
  const [saving, setSaving] = useState(false)

  const fetchAssets = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 25, ...filters }
      Object.keys(params).forEach(k => { if (!params[k]) delete params[k] })
      const res = await axios.get('/api/assets', { params })
      setAssets(res.data.assets || [])
      setTotal(res.data.total || 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [page, filters])

  useEffect(() => { fetchAssets() }, [fetchAssets])

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [catRes, locRes, venRes] = await Promise.all([
          axios.get('/api/assets/categories'),
          axios.get('/api/assets/locations'),
          axios.get('/api/assets/vendors')
        ])
        setCategories(catRes.data)
        setLocations(locRes.data)
        setVendors(venRes.data)
      } catch (err) { console.error(err) }
    }
    loadLookups()
  }, [])

  useEffect(() => {
    if (formData.category_id) {
      axios.get(`/api/assets/categories/${formData.category_id}/subcategories`)
        .then(res => setSubcategories(res.data))
        .catch(() => setSubcategories([]))
    } else {
      setSubcategories([])
    }
  }, [formData.category_id])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await axios.post('/api/assets', formData)
      setShowCreateModal(false)
      setFormData({ name: '', category_id: '', subcategory_id: '', brand: '', model: '', serial_number: '', purchase_date: '', warranty_expiry: '', cost: '', vendor_id: '', location_id: '', description: '' })
      fetchAssets()
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating asset')
    } finally {
      setSaving(false)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const totalPages = Math.ceil(total / 25)

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
            IT Assets
          </h1>
          <p className="text-slate-500 mt-1">{total} assets registered</p>
        </div>
        <div className="flex gap-3">
          <Link to="/assets/dashboard" className="btn-secondary text-sm">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
            Dashboard
          </Link>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary text-sm">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            New Asset
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6 !p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Search code, name, serial..."
            className="input !py-2 text-sm"
            value={filters.search}
            onChange={e => handleFilterChange('search', e.target.value)}
          />
          <select className="input !py-2 text-sm" value={filters.status} onChange={e => handleFilterChange('status', e.target.value)}>
            <option value="">All Status</option>
            {['Available','In Use','Repair','Lost','Retired'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="input !py-2 text-sm" value={filters.category_id} onChange={e => handleFilterChange('category_id', e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="input !py-2 text-sm" value={filters.location_id} onChange={e => handleFilterChange('location_id', e.target.value)}>
            <option value="">All Locations</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card !p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
            No assets found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Code</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Category</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Brand / Model</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Location</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Assigned To</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assets.map(asset => (
                  <tr key={asset.id} className="border-b border-slate-50 hover:bg-primary-50/30 transition-colors">
                    <td className="py-3 px-4">
                      <Link to={`/assets/${asset.id}`} className="font-mono text-primary-600 hover:text-primary-800 font-semibold">
                        {asset.asset_code}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">{asset.name}</td>
                    <td className="py-3 px-4 text-slate-500">{asset.category_name || '—'}</td>
                    <td className="py-3 px-4 text-slate-500">{[asset.brand, asset.model].filter(Boolean).join(' ') || '—'}</td>
                    <td className="py-3 px-4">
                      <span className={`badge ${STATUS_COLORS[asset.status] || 'bg-slate-100 text-slate-600'}`}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{asset.location_name || '—'}</td>
                    <td className="py-3 px-4 text-slate-500">{asset.assigned_user_name || '—'}</td>
                    <td className="py-3 px-4">
                      <Link to={`/assets/${asset.id}`} className="text-primary-600 hover:text-primary-800 font-medium">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="btn-secondary text-sm !px-3 !py-1.5 disabled:opacity-40">← Prev</button>
          <span className="flex items-center text-sm text-slate-500">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="btn-secondary text-sm !px-3 !py-1.5 disabled:opacity-40">Next →</button>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800">Register New Asset</h2>
                <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-slate-100 rounded-lg transition">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Asset Name *</label>
                  <input className="input" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select className="input" value={formData.category_id} onChange={e => setFormData(p => ({...p, category_id: e.target.value, subcategory_id: ''}))}>
                    <option value="">Select</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Subcategory</label>
                  <select className="input" value={formData.subcategory_id} onChange={e => setFormData(p => ({...p, subcategory_id: e.target.value}))}>
                    <option value="">Select</option>
                    {subcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Brand</label>
                  <input className="input" value={formData.brand} onChange={e => setFormData(p => ({...p, brand: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
                  <input className="input" value={formData.model} onChange={e => setFormData(p => ({...p, model: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Serial Number</label>
                  <input className="input" value={formData.serial_number} onChange={e => setFormData(p => ({...p, serial_number: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vendor</label>
                  <select className="input" value={formData.vendor_id} onChange={e => setFormData(p => ({...p, vendor_id: e.target.value}))}>
                    <option value="">Select</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Date</label>
                  <input type="date" className="input" value={formData.purchase_date} onChange={e => setFormData(p => ({...p, purchase_date: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Warranty Expiry</label>
                  <input type="date" className="input" value={formData.warranty_expiry} onChange={e => setFormData(p => ({...p, warranty_expiry: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cost</label>
                  <input type="number" step="0.01" className="input" value={formData.cost} onChange={e => setFormData(p => ({...p, cost: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                  <select className="input" value={formData.location_id} onChange={e => setFormData(p => ({...p, location_id: e.target.value}))}>
                    <option value="">Select</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea className="input" rows="3" value={formData.description} onChange={e => setFormData(p => ({...p, description: e.target.value}))} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Creating...' : 'Create Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AssetList
