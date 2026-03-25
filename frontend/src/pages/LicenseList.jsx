import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

const LicenseList = () => {
  const { user } = useAuth()
  const [licenses, setLicenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedLicense, setSelectedLicense] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [formData, setFormData] = useState({ name: '', license_key: '', total_seats: 1, expiry_date: '', vendor_id: '', cost: '' })
  const [assignData, setAssignData] = useState({ user_name: '', asset_id: '' })
  const [vendors, setVendors] = useState([])
  const [saving, setSaving] = useState(false)

  const fetchLicenses = async () => {
    try {
      const res = await axios.get('/api/licenses')
      setLicenses(res.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchLicenses() }, [])
  useEffect(() => {
    axios.get('/api/assets/vendors').then(res => setVendors(res.data)).catch(() => {})
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await axios.post('/api/licenses', formData)
      setShowCreateModal(false)
      setFormData({ name: '', license_key: '', total_seats: 1, expiry_date: '', vendor_id: '', cost: '' })
      fetchLicenses()
    } catch (err) { alert(err.response?.data?.message || 'Error') }
    finally { setSaving(false) }
  }

  const openDetail = async (license) => {
    try {
      const res = await axios.get(`/api/licenses/${license.id}`)
      setSelectedLicense(res.data)
      setAssignments(res.data.assignments || [])
      setShowDetailModal(true)
    } catch (err) { console.error(err) }
  }

  const handleAssign = async (e) => {
    e.preventDefault()
    try {
      await axios.post('/api/licenses/assign', { license_id: selectedLicense.id, ...assignData })
      setAssignData({ user_name: '', asset_id: '' })
      openDetail(selectedLicense)
      fetchLicenses()
    } catch (err) { alert(err.response?.data?.message || 'Error') }
  }

  const handleRevoke = async (assignmentId) => {
    if (!confirm('Revoke this license assignment?')) return
    try {
      await axios.post(`/api/licenses/revoke/${assignmentId}`)
      openDetail(selectedLicense)
      fetchLicenses()
    } catch (err) { alert(err.response?.data?.message || 'Error') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this license?')) return
    try {
      await axios.delete(`/api/licenses/${id}`)
      fetchLicenses()
    } catch (err) { alert(err.response?.data?.message || 'Error') }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Software Licenses</h1>
          <p className="text-slate-500 mt-1">{licenses.length} licenses managed</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary text-sm">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          New License
        </button>
      </div>

      <div className="card !p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
          </div>
        ) : licenses.length === 0 ? (
          <div className="text-center py-16 text-slate-400">No licenses yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Name</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">License Key</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Seats</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Vendor</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Expiry</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Cost</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {licenses.map(l => {
                const isExpiringSoon = l.expiry_date && new Date(l.expiry_date) <= new Date(Date.now() + 30*24*60*60*1000)
                const seatsFull = l.used_seats >= l.total_seats
                return (
                  <tr key={l.id} className="border-b border-slate-50 hover:bg-primary-50/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-800">{l.name}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-500">{l.license_key ? `${l.license_key.substring(0,20)}...` : '—'}</td>
                    <td className="py-3 px-4">
                      <span className={`font-bold ${seatsFull ? 'text-red-600' : 'text-emerald-600'}`}>{l.used_seats}</span>
                      <span className="text-slate-400"> / {l.total_seats}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{l.vendor_name || '—'}</td>
                    <td className="py-3 px-4">
                      {l.expiry_date ? (
                        <span className={isExpiringSoon ? 'text-red-600 font-medium' : 'text-slate-500'}>
                          {new Date(l.expiry_date).toLocaleDateString()}
                          {isExpiringSoon && ' ⚠'}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{l.cost ? `฿${Number(l.cost).toLocaleString()}` : '—'}</td>
                    <td className="py-3 px-4 flex gap-2">
                      <button onClick={() => openDetail(l)} className="text-primary-600 hover:text-primary-800 font-medium text-xs">Manage</button>
                      {user?.role === 'MANAGER' && (
                        <button onClick={() => handleDelete(l.id)} className="text-red-500 hover:text-red-700 font-medium text-xs">Delete</button>
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Add Software License</h2>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Software Name *</label>
                <input className="input" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">License Key</label>
                <input className="input font-mono" value={formData.license_key} onChange={e => setFormData(p => ({...p, license_key: e.target.value}))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Total Seats</label>
                  <input type="number" min="1" className="input" value={formData.total_seats} onChange={e => setFormData(p => ({...p, total_seats: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date</label>
                  <input type="date" className="input" value={formData.expiry_date} onChange={e => setFormData(p => ({...p, expiry_date: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vendor</label>
                  <select className="input" value={formData.vendor_id} onChange={e => setFormData(p => ({...p, vendor_id: e.target.value}))}>
                    <option value="">Select</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cost</label>
                  <input type="number" step="0.01" className="input" value={formData.cost} onChange={e => setFormData(p => ({...p, cost: e.target.value}))} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Creating...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail/Assign Modal */}
      {showDetailModal && selectedLicense && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDetailModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{selectedLicense.name}</h2>
                  <p className="text-sm text-slate-500 font-mono">{selectedLicense.license_key || 'No key'}</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-primary-600">{selectedLicense.used_seats}</span>
                  <span className="text-slate-400 text-lg"> / {selectedLicense.total_seats}</span>
                  <p className="text-xs text-slate-500">seats used</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {/* Assign Form */}
              {selectedLicense.used_seats < selectedLicense.total_seats && (
                <form onSubmit={handleAssign} className="flex gap-3 mb-6 p-4 bg-slate-50 rounded-xl">
                  <input className="input flex-1 !py-2" placeholder="User name" value={assignData.user_name}
                    onChange={e => setAssignData(p => ({...p, user_name: e.target.value}))} required />
                  <input type="number" className="input w-28 !py-2" placeholder="Asset ID" value={assignData.asset_id}
                    onChange={e => setAssignData(p => ({...p, asset_id: e.target.value}))} />
                  <button type="submit" className="btn-primary text-sm whitespace-nowrap">Assign</button>
                </form>
              )}
              {selectedLicense.used_seats >= selectedLicense.total_seats && (
                <div className="mb-6 p-3 bg-red-50 text-red-700 rounded-xl text-sm font-medium text-center">All seats are in use</div>
              )}

              {/* Assignment List */}
              <h3 className="font-semibold text-slate-700 mb-3">Assignments</h3>
              {assignments.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">No assignments</p>
              ) : (
                <div className="space-y-2">
                  {assignments.map(a => (
                    <div key={a.id} className={`flex items-center justify-between p-3 rounded-xl border ${a.revoked_at ? 'border-slate-100 bg-slate-50 opacity-60' : 'border-slate-200 bg-white'}`}>
                      <div>
                        <span className="font-medium text-sm text-slate-800">{a.user_name || '—'}</span>
                        {a.asset_id && <span className="text-xs text-slate-400 ml-2">Asset #{a.asset_id}</span>}
                        <p className="text-xs text-slate-400">{new Date(a.assigned_at).toLocaleString()}</p>
                      </div>
                      {a.revoked_at ? (
                        <span className="badge bg-slate-100 text-slate-500 border-slate-200">Revoked</span>
                      ) : (
                        <button onClick={() => handleRevoke(a.id)} className="btn-danger text-xs !px-3 !py-1">Revoke</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LicenseList
