import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import ConfirmDialog from '../components/ConfirmDialog'

interface Notification {
  id: number
  user_id: number
  project_id: number | null
  project_name: string | null
  type: string
  message: string
  is_read: number
  created_at: string
}

interface User {
  id: number
  username: string
  email: string
  admin?: number
  is_student?: number
}

function NotificationsPage() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('unread')
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null)

  useEffect(() => {
    const checkAuthAndFetchNotifications = async () => {
      const token = localStorage.getItem('token')

      if (!token) {
        navigate('/login')
        return
      }

      try {
        const response = await axios.get('/api/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await response.data
        if (data.success) {
          setUser(data.user)
        } else {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          navigate('/login')
          return
        }
      } catch {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        navigate('/login')
        return
      }

      fetchNotifications()
    }

    checkAuthAndFetchNotifications()
  }, [navigate])

  const fetchNotifications = async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    setLoading(true)
    try {
      const unreadParam = filter === 'unread' ? '?unread_only=true' : ''
      const response = await axios.get(`/api/notifications${unreadParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.data
      if (data.success) {
        setNotifications(data.notifications)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchNotifications()
    }
  }, [filter, user])

  const markAsRead = async (notificationId: number) => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      await axios.put(`/api/notifications/${notificationId}/read`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchNotifications()
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      await axios.put('/api/notifications/read-all', {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchNotifications()
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const clearAllNotifications = async () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete All Notifications',
      message: 'Are you sure you want to delete all notifications? This action cannot be undone.',
      onConfirm: confirmClearAllNotifications
    })
  }

  const confirmClearAllNotifications = async () => {
    setConfirmDialog(null)
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      // Delete all notifications one by one
      const deletePromises = notifications.map(notification =>
        axios.delete(`/api/notifications/${notification.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      )
      await Promise.all(deletePromises)
      fetchNotifications()
    } catch (error) {
      console.error('Error clearing all notifications:', error)
    }
  }

  const deleteNotification = async (notificationId: number) => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      await axios.delete(`/api/notifications/${notificationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchNotifications()
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (notification.project_id) {
      navigate(`/project/${notification.project_id}`)
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const created = new Date(timestamp)
    const diffMs = now.getTime() - created.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
    return created.toLocaleDateString()
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'project_approved':
        return (
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )
      case 'project_deleted':
        return (
          <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
        )
      case 'project_edited':
        return (
          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
        )
      case 'project_rated':
        return (
          <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
        )
      default:
        return (
          <div className="w-12 h-12 bg-gray-500 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-900 dark:text-white text-xl">Loading...</div>
      </div>
    )
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
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white mx-auto absolute left-1/2 sm:static transform -translate-x-1/2 sm:transform-none scale-105 sm:scale-100">
            Notifications
          </h1>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'unread'
                  ? 'bg-amber-500 dark:bg-purple-600 text-gray-900 dark:text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Unread
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'all'
                  ? 'bg-amber-500 dark:bg-purple-600 text-gray-900 dark:text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              All
            </button>
          </div>
          <div className="flex gap-2">
            {notifications.some(n => n.is_read === 0) && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                Mark All as Read
              </button>
            )}
            {filter === 'all' && notifications.length > 0 && (
              <button
                onClick={clearAllNotifications}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
            <svg className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p className="text-gray-600 dark:text-gray-400 text-lg">No notifications</p>
            <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
              {filter === 'unread' 
                ? "You're all caught up!"
                : "You'll be notified about project activities here"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-lg p-5 border transition ${
                  notification.is_read === 0
                    ? 'bg-amber-50 dark:bg-purple-950 border-amber-500 dark:border-purple-500'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start gap-4">
                  {getNotificationIcon(notification.type)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <p className={`text-sm md:text-base ${
                          notification.is_read === 0 ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {formatTimeAgo(notification.created_at)}
                        </p>
                      </div>
                      
                      {notification.is_read === 0 && (
                        <div className="w-3 h-3 bg-amber-500 dark:bg-purple-500 rounded-full flex-shrink-0 mt-1"></div>
                      )}
                    </div>
                    
                    <div className="flex gap-3 mt-4">
                      {notification.is_read === 0 && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-sm text-amber-500 dark:text-purple-400 hover:text-amber-600 dark:hover:text-purple-300 transition"
                        >
                          Mark as Read
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="text-sm text-gray-500 hover:text-red-400 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
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

export default NotificationsPage
