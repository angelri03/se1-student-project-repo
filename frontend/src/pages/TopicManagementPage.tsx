import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import ConfirmDialog from '../components/ConfirmDialog'

interface Topic {
  id: number
  name: string
  description?: string
  created_at?: string
}

function TopicManagementPage() {
  const navigate = useNavigate()
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null)

  useEffect(() => {
    checkAdminAndFetchTopics()
  }, [])

  const checkAdminAndFetchTopics = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }

    try {
      // Check if user is admin
      const userResponse = await axios.get('/api/me', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!userResponse.data.success || !userResponse.data.user.admin) {
        setMessage({ type: 'error', text: 'Admin access required' })
        setTimeout(() => navigate('/explore'), 2000)
        return
      }

      setIsAdmin(true)

      // Fetch all topics
      const topicsResponse = await axios.get('/api/topics')
      if (topicsResponse.data.success) {
        setTopics(topicsResponse.data.data)
      }
    } catch (error: any) {
      console.error('Error:', error)
      setMessage({ type: 'error', text: 'Failed to load topics' })
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: 'Topic name is required' })
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await axios.post('/api/topics', formData, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setMessage({ type: 'success', text: 'Topic created successfully' })
        setShowCreateModal(false)
        setFormData({ name: '', description: '' })
        checkAdminAndFetchTopics()
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to create topic' })
    }
  }

  const handleUpdate = async () => {
    if (!editingTopic || !formData.name.trim()) {
      setMessage({ type: 'error', text: 'Topic name is required' })
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await axios.put(`/api/topics/${editingTopic.id}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setMessage({ type: 'success', text: 'Topic updated successfully' })
        setEditingTopic(null)
        setFormData({ name: '', description: '' })
        checkAdminAndFetchTopics()
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update topic' })
    }
  }

  const handleDelete = async (topicId: number) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Topic',
      message: 'Are you sure you want to delete this topic? This action cannot be undone.',
      onConfirm: () => confirmDelete(topicId)
    })
  }

  const confirmDelete = async (topicId: number) => {
    setConfirmDialog(null)
    
    try {
      const token = localStorage.getItem('token')
      const response = await axios.delete(`/api/topics/${topicId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setMessage({ type: 'success', text: 'Topic deleted successfully' })
        checkAdminAndFetchTopics()
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to delete topic' })
    }
  }

  const openEditModal = (topic: Topic) => {
    setEditingTopic(topic)
    setFormData({
      name: topic.name,
      description: topic.description || ''
    })
  }

  const closeModals = () => {
    setShowCreateModal(false)
    setEditingTopic(null)
    setFormData({ name: '', description: '' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-900 dark:text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
          <div className="flex justify-between items-center mb-8 relative">
          <button
            onClick={() => navigate('/explore')}
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
              <span className="inline sm:hidden">Back</span>
              <span className="hidden sm:inline">Back to Explore</span>
          </button>
            <h1 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white mx-auto absolute left-1/2 sm:static transform -translate-x-1/2 sm:transform-none scale-105 sm:scale-100">Topic Management</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="p-2 sm:px-6 sm:py-3 bg-amber-500 dark:bg-purple-600 text-white rounded-lg font-medium hover:bg-amber-600 dark:hover:bg-purple-700 transition duration-200 inline-flex items-center gap-2"
            title="Create topic"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Create Topic</span>
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-900/50 text-green-200' : 'bg-red-900/50 text-red-200'}`}>
            {message.text}
          </div>
        )}

        {/* Topics Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {topics.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 sm:px-6 py-3 text-center text-gray-600 dark:text-gray-400">
                    No topics found. Create one to get started.
                  </td>
                </tr>
              ) : (
                topics.map((topic) => (
                  <tr key={topic.id} className="hover:bg-gray-100 dark:hover:bg-gray-700">
                    <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{topic.name}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-2 sm:py-4">
                      <div className="text-sm text-gray-700 dark:text-gray-300">{topic.description || '-'}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {topic.created_at ? new Date(topic.created_at).toLocaleDateString() : '-'}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openEditModal(topic)}
                        className="text-blue-400 hover:text-blue-300 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(topic.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Create New Topic</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Topic Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-purple-600"
                    placeholder="e.g., Machine Learning"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-purple-600"
                    rows={3}
                    placeholder="Optional description"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={closeModals}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  className="px-4 py-2 bg-amber-500 dark:bg-purple-600 text-white rounded-lg font-medium hover:bg-amber-600 dark:hover:bg-purple-700 transition duration-200"
                >
                  Create Topic
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editingTopic && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Edit Topic</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Topic Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-purple-600"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={closeModals}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  className="px-4 py-2 bg-amber-500 dark:bg-purple-600 text-white rounded-lg font-medium hover:bg-amber-600 dark:hover:bg-purple-700 transition duration-200"
                >
                  Update Topic
                </button>
              </div>
            </div>
          </div>
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
    </div>
  )
}

export default TopicManagementPage
