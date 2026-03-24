import React, { useState } from 'react'
import axios from 'axios'

const CreateTicket = () => {
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    issue_title: '',
    description: '',
    priority: 'Medium',
    category_id: '',
    subcategory_id: '',
  })
  const [categories, setCategories] = useState([])
  const [subcategories, setSubcategories] = useState([])
  const [files, setFiles] = useState([])
  const [previewUrls, setPreviewUrls] = useState([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    if (name === 'category_id') {
      setFormData(prev => ({ ...prev, subcategory_id: '' }))
      if (value) {
        axios.get(`/api/categories/${value}/subcategories`)
          .then(res => setSubcategories(res.data))
          .catch(err => console.error(err))
      } else {
        setSubcategories([])
      }
    }
  }

  React.useEffect(() => {
    axios.get('/api/categories')
      .then(res => setCategories(res.data))
      .catch(err => console.error(err))
  }, [])

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files)
    if (selectedFiles.length > 5) {
      setError('Maximum 5 images allowed')
      return
    }
    setFiles(selectedFiles)
    
    const urls = selectedFiles.map(file => URL.createObjectURL(file))
    setPreviewUrls(urls)
  }

  const removeImage = (index) => {
    const newFiles = files.filter((_, i) => i !== index)
    const newPreviews = previewUrls.filter((_, i) => i !== index)
    setFiles(newFiles)
    setPreviewUrls(newPreviews)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const data = new FormData()
      Object.keys(formData).forEach(key => {
        data.append(key, formData[key])
      })
      files.forEach(file => {
        data.append('images', file)
      })

      const response = await axios.post('/api/tickets', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setSuccess(response.data.ticket)
      setFormData({
        name: '',
        department: '',
        issue_title: '',
        description: '',
        priority: 'Medium',
        category_id: '',
        subcategory_id: '',
      })
      setSubcategories([])
      setFiles([])
      setPreviewUrls([])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create ticket')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-6">
        <div className="card text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-600 mb-4">Ticket Created Successfully!</h2>
          <p className="text-gray-600 mb-4">Your ticket ID is:</p>
          <p className="text-3xl font-bold text-primary-600 mb-4">{success.ticket_id}</p>
          <p className="text-sm text-gray-500 mb-6">Save this ID to check your ticket status later.</p>
          <a href={`/ticket/${success.ticket_id}`} className="btn-primary inline-block">
            View Ticket
          </a>
          <button 
            onClick={() => setSuccess(null)}
            className="btn-secondary ml-2"
          >
            Create Another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto mt-8 p-6">
      <div className="card">
        <h1 className="text-2xl font-bold mb-6">Create IT Support Ticket</h1>
        
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleChange}
              className="input"
              placeholder="e.g., IT, HR, Sales"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                className="input"
              >
                <option value="">-- Select Category --</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory</label>
              <select
                name="subcategory_id"
                value={formData.subcategory_id}
                onChange={handleChange}
                className="input"
                disabled={!formData.category_id || subcategories.length === 0}
              >
                <option value="">-- Select Subcategory --</option>
                {subcategories.map(sc => (
                  <option key={sc.id} value={sc.id}>{sc.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Issue Title *</label>
            <input
              type="text"
              name="issue_title"
              value={formData.issue_title}
              onChange={handleChange}
              className="input"
              required
              placeholder="Brief description of the issue"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="input min-h-[100px]"
              rows="4"
              placeholder="Detailed description of the problem..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority *</label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="input"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Screenshots (max 5, max 5MB each)
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="input py-2"
            />
          </div>

          {previewUrls.length > 0 && (
            <div className="grid grid-cols-5 gap-2">
              {previewUrls.map((url, index) => (
                <div key={index} className="relative">
                  <img src={url} alt="Preview" className="w-full h-20 object-cover rounded" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Creating...' : 'Create Ticket'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default CreateTicket
