import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Navbar from './components/Navbar'
import CreateTicket from './pages/CreateTicket'
import ViewTicket from './pages/ViewTicket'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import TicketList from './pages/TicketList'
import TicketDetail from './pages/TicketDetail'

function App() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<CreateTicket />} />
        <Route path="/ticket/:id" element={<ViewTicket />} />
        
        {/* Admin Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={
          <Layout requireAuth>
            <Dashboard />
          </Layout>
        } />
        <Route path="/tickets" element={
          <Layout requireAuth>
            <TicketList />
          </Layout>
        } />
        <Route path="/admin/ticket/:id" element={
          <Layout requireAuth>
            <TicketDetail />
          </Layout>
        } />
      </Routes>
    </div>
  )
}

export default App
