import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Toast from '../components/Toast'
import ConfirmDialog from '../components/ConfirmDialog'

interface Report {
  id: number
  reporter_id: number
  reporter_username: string
  reported_user_id: number | null
  reported_username: string | null
  reported_project_id: number | null
  reported_project_name: string | null
  reason: string
  status: string
  admin_notes: string | null
  resolved_by: number | null
  resolved_by_username: string | null
  created_at: string
  resolved_at: string | null
}

function AdminReportsPage() {
  const navigate = useNavigate()
  const [reports, setReports] = useState<Report[]>([])
  const [filteredReports, setFilteredReports] = useState<Report[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('pending')
  const [reportTypeFilter, setReportTypeFilter] = useState<string>('all')
  const [reportedUserFilter, setReportedUserFilter] = useState<string>('all')
  const [reportedProjectFilter, setReportedProjectFilter] = useState<string>('all')
  const [dateSortOrder, setDateSortOrder] = useState<'desc' | 'asc'>('desc')
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')
  const [resolveAction, setResolveAction] = useState<'resolved' | 'dismissed'>('resolved')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null)

  useEffect(() => {
    checkAuthAndFetchReports()
  }, [])

  useEffect(() => {
    filterReports()
  }, [reports, statusFilter, reportTypeFilter, reportedUserFilter, reportedProjectFilter, dateSortOrder])

  const checkAuthAndFetchReports = async () => {
    const token = localStorage.getItem('token')
    
    if (!token) {
      navigate('/login')
      return
    }

    try {
      // Check if user is admin
      const authResponse = await axios.get('http://localhost:5000/api/me', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!authResponse.data.success || authResponse.data.user.admin !== 1) {
        navigate('/')
        return
      }

      // Fetch all reports
      const reportsResponse = await axios.get('http://localhost:5000/api/reports', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (reportsResponse.data.success) {
        setReports(reportsResponse.data.reports)
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error)
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  const filterReports = () => {
    let filtered = reports

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter)
    }

    // Filter by report type (user or project)
    if (reportTypeFilter === 'users') {
      filtered = filtered.filter(r => r.reported_user_id !== null)
    } else if (reportTypeFilter === 'projects') {
      filtered = filtered.filter(r => r.reported_project_id !== null)
    }

    // Filter by reported user
    if (reportedUserFilter !== 'all') {
      filtered = filtered.filter(r => r.reported_username === reportedUserFilter)
    }

    // Filter by reported project
    if (reportedProjectFilter !== 'all') {
      filtered = filtered.filter(r => r.reported_project_name === reportedProjectFilter)
    }

    // Sort by date
    filtered = [...filtered].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return dateSortOrder === 'desc' ? dateB - dateA : dateA - dateB
    })

    setFilteredReports(filtered)
  }

  const handleResolveClick = (report: Report, action: 'resolved' | 'dismissed') => {
    setSelectedReport(report)
    setResolveAction(action)
    setAdminNotes('')
    setShowResolveModal(true)
  }

  const handleResolveSubmit = async () => {
    if (!selectedReport) return

    setIsSubmitting(true)

    try {
      const token = localStorage.getItem('token')
      const response = await axios.put(
        `http://localhost:5000/api/reports/${selectedReport.id}`,
        {
          status: resolveAction,
          admin_notes: adminNotes.trim() || null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (response.data.success) {
        // Refresh reports
        await checkAuthAndFetchReports()
        setShowResolveModal(false)
        setSelectedReport(null)
      }
    } catch (error) {
      console.error('Failed to update report:', error)
      setToast({ message: 'Failed to update report', type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteReport = async (reportId: number) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Report',
      message: 'Are you sure you want to delete this report?',
      onConfirm: () => confirmDeleteReport(reportId)
    })
  }

  const confirmDeleteReport = async (reportId: number) => {
    setConfirmDialog(null)

    try {
      const token = localStorage.getItem('token')
      const response = await axios.delete(`http://localhost:5000/api/reports/${reportId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        await checkAuthAndFetchReports()
      }
    } catch (error) {
      console.error('Failed to delete report:', error)
      setToast({ message: 'Failed to delete report', type: 'error' })
    }
  }

  const navigateToReported = (report: Report) => {
    if (report.reported_user_id) {
      navigate(`/profile/${report.reported_username}`)
    } else if (report.reported_project_id) {
      navigate(`/project/${report.reported_project_id}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400 text-lg">Loading reports...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Top Navigation Bar */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate('/')}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition duration-200 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Explore</span>
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">Reports Management</h1>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 mb-8 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filter by Status
              </label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 dark:focus:ring-purple-500 focus:border-transparent transition duration-200"
              >
                <option value="all">All Reports</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>
            <div>
              <label htmlFor="reportType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Report Type
              </label>
              <select
                id="reportType"
                value={reportTypeFilter}
                onChange={(e) => setReportTypeFilter(e.target.value)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 dark:focus:ring-purple-500 focus:border-transparent transition duration-200"
              >
                <option value="all">All Types</option>
                <option value="users">Users</option>
                <option value="projects">Projects</option>
              </select>
            </div>
            {(reportTypeFilter === 'all' || reportTypeFilter === 'users') && (
              <div>
                <label htmlFor="reportedUser" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Filter by User
                </label>
                <select
                  id="reportedUser"
                  value={reportedUserFilter}
                  onChange={(e) => setReportedUserFilter(e.target.value)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 dark:focus:ring-purple-500 focus:border-transparent transition duration-200"
                >
                  <option value="all">All Users</option>
                  {Array.from(new Set(reports.filter(r => r.reported_user_id).map(r => r.reported_username))).sort().map(username => (
                    <option key={username} value={username || ''}>{username}</option>
                  ))}
                </select>
              </div>
            )}
            {(reportTypeFilter === 'all' || reportTypeFilter === 'projects') && (
              <div>
                <label htmlFor="reportedProject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Filter by Project
                </label>
                <select
                  id="reportedProject"
                  value={reportedProjectFilter}
                  onChange={(e) => setReportedProjectFilter(e.target.value)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 dark:focus:ring-purple-500 focus:border-transparent transition duration-200"
                >
                  <option value="all">All Projects</option>
                  {Array.from(new Set(reports.filter(r => r.reported_project_id).map(r => r.reported_project_name))).sort().map(projectName => (
                    <option key={projectName} value={projectName || ''}>{projectName}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label htmlFor="dateSort" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort by Date
              </label>
              <select
                id="dateSort"
                value={dateSortOrder}
                onChange={(e) => setDateSortOrder(e.target.value as 'desc' | 'asc')}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 dark:focus:ring-purple-500 focus:border-transparent transition duration-200"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
            <div className="ml-auto">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing {filteredReports.length} of {reports.length} reports
              </p>
            </div>
          </div>
        </div>

        {/* Reports List */}
        {filteredReports.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center border border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400 text-lg">No reports found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <div key={report.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        report.status === 'pending' ? 'bg-amber-100 dark:bg-yellow-900 text-amber-700 dark:text-yellow-200' :
                        report.status === 'resolved' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200' :
                        'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}>
                        {report.status.toUpperCase()}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400 text-sm">
                        {new Date(report.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    <div className="mb-3">
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                        <button onClick={() => navigate(`/profile/${report.reporter_username}`)} className="text-gray-900 dark:text-white font-semibold hover:text-amber-500 dark:hover:text-purple-400 transition">{report.reporter_username}</button> reported{' '}
                        {report.reported_user_id ? (
                          <>user <button onClick={() => navigateToReported(report)} className="text-amber-500 dark:text-purple-400 hover:text-amber-600 dark:hover:text-purple-300 font-semibold">{report.reported_username}</button></>
                        ) : (
                          <>project <button onClick={() => navigateToReported(report)} className="text-amber-500 dark:text-purple-400 hover:text-amber-600 dark:hover:text-purple-300 font-semibold">{report.reported_project_name}</button></>
                        )}
                      </p>
                      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 mt-2">
                        <p className="text-gray-900 dark:text-white">{report.reason}</p>
                      </div>
                    </div>

                    {report.admin_notes && (
                      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 mb-3 border-l-4 border-blue-500">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Admin Notes:</p>
                        <p className="text-gray-900 dark:text-white text-sm">{report.admin_notes}</p>
                        {report.resolved_by_username && (
                          <p className="text-xs text-gray-500 mt-2">
                            By {report.resolved_by_username} on {new Date(report.resolved_at!).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {report.status === 'pending' && (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleResolveClick(report, 'resolved')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-200 text-sm font-medium"
                      >
                        Resolve
                      </button>
                      <button
                        onClick={() => handleResolveClick(report, 'dismissed')}
                        className="px-4 py-2 bg-gray-500 dark:bg-gray-600 text-white rounded-lg hover:bg-gray-600 dark:hover:bg-gray-700 transition duration-200 text-sm font-medium"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => handleDeleteReport(report.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-200 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolve/Dismiss Modal */}
      {showResolveModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {resolveAction === 'resolved' ? 'Resolve' : 'Dismiss'} Report
              </h2>
              
              <div className="mb-4">
                <label htmlFor="adminNotes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Admin Notes (optional)
                </label>
                <textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-amber-500 dark:focus:ring-purple-500 focus:border-transparent transition duration-200"
                  rows={4}
                  placeholder="Add any notes about this report resolution..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowResolveModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition duration-200"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolveSubmit}
                  className={`flex-1 px-4 py-2 rounded-lg text-white font-medium transition duration-200 ${
                    resolveAction === 'resolved' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-gray-500 dark:bg-gray-600 hover:bg-gray-600 dark:hover:bg-gray-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
          type="danger"
        />
      )}
    </div>
  )
}

export default AdminReportsPage
