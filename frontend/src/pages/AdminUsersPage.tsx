import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'

interface User {
  id: number
  username: string
  email: string
  admin?: number
  created_at?: string
  flagged?: boolean
}

function AdminUsersPage() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortAsc, setSortAsc] = useState(true)
  const [sortBy, setSortBy] = useState<'username' | 'created_at'>('username')
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false)

  useEffect(() => {
    checkAdminAndFetchUsers()
  }, [])

  const checkAdminAndFetchUsers = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }

    try {
      const userResponse = await axios.get('/api/me', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!userResponse.data.success || !userResponse.data.user.admin) {
        setMessage({ type: 'error', text: 'Admin access required' })
        setTimeout(() => navigate('/explore'), 2000)
        return
      }

      setIsAdmin(true)
      setCurrentUserId(userResponse.data.user.id)

      const usersResponse = await axios.get('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (usersResponse.data.success) {
        const fetched = usersResponse.data.data
        setUsers(fetched)
        // fetch flagged status for each user (profile endpoint includes flags)
        try {
          const flagPromises = fetched.map((u: any) =>
            axios.get(`/api/users/profile/${u.username}`).then((r) => ({ username: u.username, flags: r.data.user?.flags || [] })).catch(() => ({ username: u.username, flags: [] }))
          )
          const flagResults = await Promise.all(flagPromises)
          const flagMap: Record<string, any[]> = {}
          flagResults.forEach((fr: any) => { flagMap[fr.username] = fr.flags })
          setUsers((prev) => prev.map((pu: any) => ({ ...pu, flagged: (flagMap[pu.username] || []).length > 0 })))
        } catch (e) {
          // ignore flag fetch errors, keep users as-is
        }
      } else {
        setMessage({ type: 'error', text: 'Failed to load users' })
      }
    } catch (error: any) {
      console.error('Error fetching users:', error)
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to load users' })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (u: any) => {
    if (!confirm(`Delete user ${u.username}? This cannot be undone.`)) return
    const token = localStorage.getItem('token')
    try {
      const response = await axios.delete(`/api/users/${u.id}`, { headers: { Authorization: `Bearer ${token}` } })
      if (response.data.success) {
        setMessage({ type: 'success', text: 'User deleted' })
        checkAdminAndFetchUsers()
      } else {
        setMessage({ type: 'error', text: response.data.message || 'Failed to delete user' })
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete user' })
    }
  }

  const handleFlagUser = async (u: any) => {
    const reason = prompt(`Flag user ${u.username}. Enter reason (optional):`)
    if (reason === null) return
    const token = localStorage.getItem('token')
    try {
      const response = await axios.post(`/api/users/${u.id}/flag`, { reason }, { headers: { Authorization: `Bearer ${token}` } })
      if (response.data.success) {
        setMessage({ type: 'success', text: 'User flagged' })
      } else {
        setMessage({ type: 'error', text: response.data.message || 'Failed to flag user' })
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to flag user' })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8 relative">
          <button
            onClick={() => navigate('/explore')}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="inline sm:hidden">Back</span>
            <span className="hidden sm:inline">Back to Explore</span>
          </button>

          <h1 className="text-xl sm:text-3xl font-bold text-white mx-auto absolute left-1/2 sm:static transform -translate-x-1/2 sm:transform-none scale-105 sm:scale-100">User Management</h1>

          <div style={{ width: 92 }} />
        </div>

        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by username"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input type="checkbox" checked={showFlaggedOnly} onChange={(e) => setShowFlaggedOnly(e.target.checked)} className="accent-yellow-400" />
              <span>Show flagged only</span>
            </label>
          </div>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-900/50 text-green-200' : 'bg-red-900/50 text-red-200'}`}>
            {message.text}
          </div>
        )}

        <div className="bg-gray-800 rounded-lg shadow-xl overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  <button
                    className="flex items-center gap-2"
                    onClick={() => {
                      if (sortBy === 'username') setSortAsc((s) => !s)
                      else {
                        setSortBy('username')
                        setSortAsc(true)
                      }
                    }}
                    title="Sort by username"
                  >
                    <span>Username</span>
                    <svg className={`w-3 h-3 ml-1 ${sortBy === 'username' ? 'text-white' : 'text-gray-400'}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <path d="M7 14l5-5 5 5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={sortBy === 'username' && sortAsc ? 'opacity-100' : 'opacity-40'} />
                      <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={sortBy === 'username' && !sortAsc ? 'opacity-100' : 'opacity-40'} />
                    </svg>
                  </button>
                </th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Email</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Role</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  <button
                    className="flex items-center gap-2"
                    onClick={() => {
                      if (sortBy === 'created_at') setSortAsc((s) => !s)
                      else {
                        setSortBy('created_at')
                        setSortAsc(false)
                      }
                    }}
                    title="Sort by creation date"
                  >
                    <span>Created</span>
                    <svg className={`w-3 h-3 ml-1 ${sortBy === 'created_at' ? 'text-white' : 'text-gray-400'}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <path d="M7 14l5-5 5 5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={sortBy === 'created_at' && sortAsc ? 'opacity-100' : 'opacity-40'} />
                      <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={sortBy === 'created_at' && !sortAsc ? 'opacity-100' : 'opacity-40'} />
                    </svg>
                  </button>
                </th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Flagged</th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
                {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 sm:px-6 py-3 text-center text-gray-400">No users found.</td>
                </tr>
              ) : (
                users
                  .filter((u) => u.username.toLowerCase().includes(searchQuery.trim().toLowerCase()))
                  .filter((u) => (showFlaggedOnly ? !!u.flagged : true))
                  .slice()
                  .sort((a, b) => {
                    if (sortBy === 'username') {
                      const an = a.username.toLowerCase()
                      const bn = b.username.toLowerCase()
                      if (an === bn) return 0
                      return sortAsc ? (an > bn ? 1 : -1) : (an < bn ? 1 : -1)
                    } else {
                      // created_at sorting: parse dates; missing dates go last
                      const ad = a.created_at ? new Date(a.created_at).getTime() : (sortAsc ? 0 : Infinity)
                      const bd = b.created_at ? new Date(b.created_at).getTime() : (sortAsc ? 0 : Infinity)
                      if (ad === bd) return 0
                      return sortAsc ? (ad > bd ? 1 : -1) : (ad < bd ? 1 : -1)
                    }
                  })
                  .map((u) => (
                    <tr key={u.id} className="hover:bg-gray-700">
                      <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                          <div className="text-sm font-medium">
                            <Link to={`/profile/${u.username}`} state={{ fromAdminUsers: true }} className="text-purple-500 hover:underline">
                              {u.username}
                            </Link>
                          </div>
                        </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4">
                        <div className="text-sm text-gray-300">{u.email}</div>
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4">
                        <div className="text-sm text-gray-300">{u.admin ? 'Admin' : 'User'}</div>
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-400">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}</div>
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                        <div className={`text-sm ${u.flagged ? 'text-yellow-300 font-semibold' : 'text-gray-400'}`}>{u.flagged ? 'Yes' : 'No'}</div>
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-2">
                          {u.id !== currentUserId && (
                            <>
                              {!u.admin && (
                                <button
                                  onClick={() => handleFlagUser(u)}
                                  className="px-3 py-1 bg-yellow-500 text-white rounded-lg text-sm hover:bg-yellow-400"
                                >
                                  Flag
                                </button>
                              )}
                              {!u.admin && (
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-500"
                              >
                                Delete
                              </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AdminUsersPage
