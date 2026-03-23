import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

const TicketList = () => {
  const [tickets, setTickets] = useState([])
  const [filters, setFilters] = useState({ status: '', priority: '', search: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTickets()
  }, [filters])

  const fetchTickets = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.priority) params.append('priority', filters.priority)
      if (filters.search) params.append('search', filters.search)

      const response = await axios.get(`/api/tickets?${params}`)
      setTickets(response.data)
    } catch (error) {
      console.error('Error fetching tickets:', error)
    } finally {
      setLoading(false)
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
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">All Tickets</h1>

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search by ID or title..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="input"
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="input"
          >
            <option value="">All Status</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            className="input"
          >
            <option value="">All Priority</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <button onClick={() => setFilters({ status: '', priority: '', search: '' })} className="btn-secondary">
            Clear Filters
          </button>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Ticket ID</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Title</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">From</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Priority</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Assigned To</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Created</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium">{ticket.ticket_id}</td>
                <td className="px-4 py-3 text-sm">{ticket.issue_title}</td>
                <td className="px-4 py-3 text-sm">{ticket.name}</td>
                <td className="px-4 py-3">{getPriorityBadge(ticket.priority)}</td>
                <td className="px-4 py-3">{getStatusBadge(ticket.status)}</td>
                <td className="px-4 py-3 text-sm">{ticket.assigned_name || '-'}</td>
                <td className="px-4 py-3 text-sm">
                  {new Date(ticket.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <Link
                    to={`/admin/ticket/${ticket.ticket_id}`}
                    className="text-primary-600 hover:text-primary-800 font-medium"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {tickets.length === 0 && (
          <p className="text-center text-gray-500 py-8">No tickets found.</p>
        )}
      </div>
    </div>
  )
}

export default TicketList
