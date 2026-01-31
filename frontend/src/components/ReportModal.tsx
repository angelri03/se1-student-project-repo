import { useState } from 'react'
import axios from 'axios'

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  reportType: 'user' | 'project'
  reportedId: number
  reportedName: string
}

function ReportModal({ isOpen, onClose, reportType, reportedId, reportedName }: ReportModalProps) {
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!reason.trim()) {
      setError('Please provide a reason for the report')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const token = localStorage.getItem('token')
      const payload = {
        reason: reason.trim(),
        ...(reportType === 'user' 
          ? { reported_user_id: reportedId } 
          : { reported_project_id: reportedId })
      }

      const response = await axios.post('http://localhost:5000/api/reports', payload, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        alert('Report submitted successfully. Our team will review it.')
        setReason('')
        onClose()
      } else {
        setError(response.data.message || 'Failed to submit report')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit report')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setReason('')
    setError('')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full border border-gray-700">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">
              Report {reportType === 'user' ? 'User' : 'Project'}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-gray-300 mb-4">
            You are reporting: <span className="font-semibold text-white">{reportedName}</span>
          </p>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="reason" className="block text-sm font-medium text-gray-300 mb-2">
                Reason for report <span className="text-red-400">*</span>
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-transparent transition duration-200"
                rows={5}
                placeholder="Please describe why you are reporting this..."
                disabled={isSubmitting}
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-900 bg-opacity-30 border border-red-700 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition duration-200"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ReportModal
