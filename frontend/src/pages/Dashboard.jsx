import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const Dashboard = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/tickets/stats/dashboard')
      setStats(response.data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const overview = stats?.overview || {}

  const dailyChartData = {
    labels: stats?.daily?.map(d => new Date(d.date).toLocaleDateString()) || [],
    datasets: [
      {
        label: 'Tickets per Day',
        data: stats?.daily?.map(d => d.count) || [],
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
    ],
  }

  const staffChartData = {
    labels: stats?.byStaff?.map(s => s.full_name || 'Unassigned') || [],
    datasets: [
      {
        label: 'Tickets Assigned',
        data: stats?.byStaff?.map(s => s.ticket_count) || [],
        backgroundColor: 'rgba(34, 197, 94, 0.5)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1,
      },
    ],
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <span className="text-gray-500">Welcome, {user?.full_name}</span>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card text-center">
          <p className="text-3xl font-bold text-primary-600">{overview.total || 0}</p>
          <p className="text-gray-500">Total Tickets</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-green-600">{overview.open || 0}</p>
          <p className="text-gray-500">Open</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-yellow-600">{overview.in_progress || 0}</p>
          <p className="text-gray-500">In Progress</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-blue-600">{overview.resolved || 0}</p>
          <p className="text-gray-500">Resolved</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Tickets per Day (Last 30 Days)</h2>
          <Bar data={dailyChartData} options={{ responsive: true }} />
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-4">Tickets per Staff</h2>
          <Bar data={staffChartData} options={{ responsive: true }} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
        <div className="flex gap-4">
          <Link to="/tickets" className="btn-primary">View All Tickets</Link>
          <Link to="/" className="btn-secondary">Create New Ticket</Link>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
