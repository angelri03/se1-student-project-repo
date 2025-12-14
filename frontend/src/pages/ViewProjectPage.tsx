import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import axios from 'axios'

interface User {
  id: number
  username: string
  email: string
}

interface Project {
  id: number
  name: string
  description: string
  course?: string
  tags: string[]
  owners: User[]
  created_at: string
  file_path: string
}

interface RatingData {
  average: number
  count: number
}

interface Topic {
  id: number
  name: string
  description?: string
}

function ViewProjectPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const fromProfile = location.state?.fromProfile || false
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [ratingData, setRatingData] = useState<RatingData>({ average: 0, count: 0 })
  const [userRating, setUserRating] = useState<number>(0)
  const [hoveredStar, setHoveredStar] = useState<number>(0)
  const [ratingMessage, setRatingMessage] = useState<string>('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [media, setMedia] = useState<any[]>([])
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
  const [uploadingMedia, setUploadingMedia] = useState(false)

  // Editing states
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [isEditingTags, setIsEditingTags] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')
  const [editedDescription, setEditedDescription] = useState('')
  const [editedTags, setEditedTags] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Topics state for dropdown
  const [allTopics, setAllTopics] = useState<Topic[]>([])
  const [isTopicDropdownOpen, setIsTopicDropdownOpen] = useState(false)
  const [newTopicName, setNewTopicName] = useState('')
  const [addingTopic, setAddingTopic] = useState(false)

  // Collaborator management states
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [isCollaboratorDropdownOpen, setIsCollaboratorDropdownOpen] = useState(false)

  useEffect(() => {
    const fetchProject = async () => {
      try {
        // Include token if available (allows admins to view unapproved projects)
        const token = localStorage.getItem('token')
        const headers = token ? { Authorization: `Bearer ${token}` } : {}
        const response = await axios.get(`/api/projects/${id}`, { headers })
        if (response.data.success) {
          let projectData = response.data.project

          // Fetch course info
          try {
            const courseResponse = await axios.get(`/api/projects/${id}/course`)
            if (courseResponse.data.success) {
              projectData = { ...projectData, course: courseResponse.data.course.name }
            }
          } catch {
            projectData = { ...projectData, course: 'Uncategorized' }
          }

          setProject(projectData)
        }
      } catch (error) {
        console.error('Failed to fetch project:', error)
      } finally {
        setLoading(false)
      }
    }

    const fetchRating = async () => {
      try {
        const response = await axios.get(`/api/projects/${id}/rating`)
        if (response.data.success) {
          setRatingData({
            average: response.data.average,
            count: response.data.count
          })
        }
      } catch (error) {
        console.error('Failed to fetch rating:', error)
      }
    }

    const fetchUserRating = async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        setIsLoggedIn(false)
        return
      }

      setIsLoggedIn(true)
      try {
        const response = await axios.get(`/api/projects/${id}/rating/me`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (response.data.success && response.data.rating) {
          setUserRating(response.data.rating)
        }
      } catch {
        // User hasn't rated or token invalid
      }
    }

    const checkOwnership = async () => {
      const token = localStorage.getItem('token')
      if (!token) return

      try {
        // Get current user info
        const meResponse = await axios.get('/api/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (meResponse.data.success) {
          const userId = meResponse.data.user.id
          const userIsAdmin = meResponse.data.user.admin === 1
          setCurrentUserId(userId)
          // Get project to check owners (include token for admin access to unapproved projects)
          const projectResponse = await axios.get(`/api/projects/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (projectResponse.data.success) {
            const owners = projectResponse.data.project.owners || []
            const userIsOwner = owners.some((owner: { id: number }) => owner.id === userId)
            // User can act as owner if they are an actual owner OR an admin
            setIsOwner(userIsOwner || userIsAdmin)
          }
        }

        // Fetch all users for collaborator dropdown
        const usersResponse = await axios.get('/api/users', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (usersResponse.data.success) {
          setAllUsers(usersResponse.data.data)
        }

        // Fetch all topics for tag editing dropdown
        const topicsResponse = await axios.get('/api/topics')
        if (topicsResponse.data.success) {
          setAllTopics(topicsResponse.data.data)
        }
      } catch (error) {
        console.error('Failed to check ownership:', error)
      }
    }

    fetchProject()
    fetchRating()
    fetchUserRating()
    checkOwnership()
    
    // Fetch media
    const fetchMedia = async () => {
      try {
        const response = await axios.get(`/api/projects/${id}/media`)
        if (response.data.success) {
          setMedia(response.data.media)
        }
      } catch (error) {
        console.error('Failed to fetch media:', error)
      }
    }
    fetchMedia()
  }, [id])

  const handleMediaUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      alert('Please select files to upload')
      return
    }

    const token = localStorage.getItem('token')
    if (!token) {
      alert('Please log in to upload media')
      return
    }

    setUploadingMedia(true)

    try {
      const formData = new FormData()
      Array.from(selectedFiles).forEach(file => {
        formData.append('media', file)
      })

      const response = await axios.post(`/api/projects/${id}/media`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })

      if (response.data.success) {
        alert(`Successfully uploaded ${response.data.media.length} file(s)`)
        setSelectedFiles(null)
        // Refresh media list
        const mediaResponse = await axios.get(`/api/projects/${id}/media`)
        if (mediaResponse.data.success) {
          setMedia(mediaResponse.data.media)
        }
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to upload media')
    } finally {
      setUploadingMedia(false)
    }
  }

  const handleDeleteMedia = async (mediaId: number) => {
    if (!confirm('Are you sure you want to delete this media?')) {
      return
    }

    const token = localStorage.getItem('token')
    if (!token) {
      alert('Please log in')
      return
    }

    try {
      const response = await axios.delete(`/api/media/${mediaId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setMedia(media.filter(m => m.id !== mediaId))
        alert('Media deleted successfully')
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete media')
    }
  }

  const handleRating = async (rating: number) => {
    const token = localStorage.getItem('token')
    if (!token) {
      setRatingMessage('Please log in to rate this project')
      return
    }

    try {
      const response = await axios.post(
        `/api/projects/${id}/rating`,
        { rating },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (response.data.success) {
        setUserRating(rating)
        setRatingMessage('Thank you for rating this project!')

        // Refresh the rating data
        const ratingResponse = await axios.get(`/api/projects/${id}/rating`)
        if (ratingResponse.data.success) {
          setRatingData({
            average: ratingResponse.data.average,
            count: ratingResponse.data.count
          })
        }
      }
    } catch (error: any) {
      setRatingMessage(error.response?.data?.message || 'Failed to submit rating')
    }
  }

  // Edit handlers
  const startEditingTitle = () => {
    if (project) {
      setEditedTitle(project.name)
      setIsEditingTitle(true)
    }
  }

  const startEditingDescription = () => {
    if (project) {
      setEditedDescription(project.description)
      setIsEditingDescription(true)
    }
  }

  const startEditingTags = () => {
    if (project) {
      setEditedTags([...project.tags])
      setIsEditingTags(true)
    }
  }

  const saveTitle = async () => {
    if (!project || !editedTitle.trim()) return
    setSaving(true)
    const token = localStorage.getItem('token')

    try {
      const formData = new FormData()
      formData.append('name', editedTitle.trim())

      const response = await axios.put(`/api/projects/${project.id}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setProject({ ...project, name: editedTitle.trim() })
        setIsEditingTitle(false)
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update title')
    } finally {
      setSaving(false)
    }
  }

  const saveDescription = async () => {
    if (!project) return
    setSaving(true)
    const token = localStorage.getItem('token')

    try {
      const formData = new FormData()
      formData.append('description', editedDescription)

      const response = await axios.put(`/api/projects/${project.id}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setProject({ ...project, description: editedDescription })
        setIsEditingDescription(false)
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update description')
    } finally {
      setSaving(false)
    }
  }

  const saveTags = async () => {
    if (!project) return
    setSaving(true)
    const token = localStorage.getItem('token')

    try {
      const formData = new FormData()
      formData.append('tags', editedTags.join(', '))

      const response = await axios.put(`/api/projects/${project.id}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setProject({ ...project, tags: [...editedTags] })
        setIsEditingTags(false)
        setIsTopicDropdownOpen(false)
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update tags')
    } finally {
      setSaving(false)
    }
  }

  // Topic editing functions
  const toggleEditedTopic = (topicName: string) => {
    setEditedTags(prev =>
      prev.includes(topicName)
        ? prev.filter(t => t !== topicName)
        : [...prev, topicName]
    )
  }

  const removeEditedTopic = (topicName: string) => {
    setEditedTags(prev => prev.filter(t => t !== topicName))
  }

  const addNewTopicWhileEditing = async () => {
    if (!newTopicName.trim()) return

    const token = localStorage.getItem('token')
    if (!token) return

    setAddingTopic(true)
    try {
      const response = await axios.post('/api/topics', {
        name: newTopicName.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        // Refresh topics list
        const topicsResponse = await axios.get('/api/topics')
        if (topicsResponse.data.success) {
          setAllTopics(topicsResponse.data.data)
        }
        // Add to edited tags
        setEditedTags(prev => [...prev, newTopicName.trim()])
        setNewTopicName('')
      }
    } catch (error: any) {
      console.error('Failed to add topic:', error)
      // If topic already exists, just add it to selection
      if (error.response?.data?.message?.includes('already exists')) {
        if (!editedTags.includes(newTopicName.trim())) {
          setEditedTags(prev => [...prev, newTopicName.trim()])
        }
        setNewTopicName('')
      }
    } finally {
      setAddingTopic(false)
    }
  }

  const availableTopicsForEditing = allTopics.filter(
    topic => !editedTags.includes(topic.name)
  )

  // Collaborator management
  const addCollaborator = async (user: User) => {
    if (!project) return
    const token = localStorage.getItem('token')

    try {
      const response = await axios.post(`/api/projects/${project.id}/owners`, {
        username: user.username
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setProject({
          ...project,
          owners: [...project.owners, user]
        })
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to add collaborator')
    }
    setIsCollaboratorDropdownOpen(false)
  }

  const removeCollaborator = async (userId: number) => {
    if (!project) return
    if (project.owners.length <= 1) {
      alert('Cannot remove the last owner')
      return
    }

    const token = localStorage.getItem('token')

    try {
      const response = await axios.delete(`/api/projects/${project.id}/owners/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setProject({
          ...project,
          owners: project.owners.filter(o => o.id !== userId)
        })
        // If current user removed themselves, they're no longer an owner
        if (userId === currentUserId) {
          setIsOwner(false)
        }
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to remove collaborator')
    }
  }

  const availableCollaborators = allUsers.filter(
    user => !project?.owners.find(o => o.id === user.id)
  )

  const handleDeleteProject = async () => {
    if (!project) return
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return
    }

    const token = localStorage.getItem('token')
    if (!token) {
      alert('Please log in')
      return
    }

    setDeleting(true)
    try {
      const response = await axios.delete(`/api/projects/${project.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        alert('Project deleted successfully')
        navigate(fromProfile ? '/profile' : '/explore')
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete project')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-400 text-lg">Loading project...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Project Not Found</h1>
          <button
            onClick={() => navigate('/explore')}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition duration-200"
          >
            Back to Explore
          </button>
        </div>
      </div>
    )
  }

  const topics = project.tags || []

  // Helper function to get topic description
  const getTopicDescription = (topicName: string): string => {
    const topic = allTopics.find(t => t.name === topicName)
    return topic?.description || topicName
  }

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate(fromProfile ? '/profile' : '/explore')}
          className="mb-6 inline-flex items-center gap-2 text-gray-400 hover:text-white transition duration-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {fromProfile ? 'Back to Profile' : 'Back to Explore'}
        </button>

        {/* Project Header Card */}
        <div className="bg-gray-800 rounded-lg shadow-xl p-8 border border-gray-700 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-3">
            {/* Editable Title */}
            {isEditingTitle ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-2xl font-bold focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  autoFocus
                />
                <button
                  onClick={saveTitle}
                  disabled={saving}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? '...' : 'Save'}
                </button>
                <button
                  onClick={() => setIsEditingTitle(false)}
                  className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold text-white">{project.name}</h1>
                {isOwner && (
                  <button
                    onClick={startEditingTitle}
                    className="p-1 text-gray-400 hover:text-white transition"
                    title="Edit title"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
              </div>
            )}
            <a
              href={`/api/projects/${project.id}/download`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition duration-200 shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download ZIP
            </a>
          </div>

          {/* Course Tag */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="inline-block px-4 py-2 text-sm font-semibold rounded-full bg-purple-900 text-purple-200">
              {project.course}
            </span>
          </div>

          {/* Editable Topic Tags */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-medium text-gray-400">Topics</h3>
              {isOwner && !isEditingTags && (
                <button
                  onClick={startEditingTags}
                  className="p-1 text-gray-400 hover:text-white transition"
                  title="Edit tags"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
            </div>
            {isEditingTags ? (
              <div className="space-y-3">
                {/* Selected tags */}
                {editedTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {editedTags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-fuchsia-900 text-fuchsia-200"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeEditedTopic(tag)}
                          className="ml-1 text-fuchsia-300 hover:text-white transition"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Topic dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsTopicDropdownOpen(!isTopicDropdownOpen)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-400 text-left text-sm hover:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200 flex items-center justify-between"
                  >
                    <span>Select topics...</span>
                    <svg className={`w-4 h-4 transition-transform ${isTopicDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isTopicDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {/* Add new topic input */}
                      <div className="p-2 border-b border-gray-600">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newTopicName}
                            onChange={(e) => setNewTopicName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                addNewTopicWhileEditing()
                              }
                            }}
                            placeholder="Add new topic..."
                            className="flex-1 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm placeholder-gray-400 focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                          />
                          <button
                            type="button"
                            onClick={addNewTopicWhileEditing}
                            disabled={addingTopic || !newTopicName.trim()}
                            className="px-2 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {addingTopic ? '...' : 'Add'}
                          </button>
                        </div>
                      </div>

                      {/* Existing topics */}
                      {availableTopicsForEditing.length > 0 ? (
                        availableTopicsForEditing.map(topic => (
                          <button
                            key={topic.id}
                            type="button"
                            onClick={() => toggleEditedTopic(topic.name)}
                            className="w-full px-4 py-2 text-left text-gray-200 hover:bg-gray-600 transition text-sm"
                          >
                            {topic.name}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-gray-400 text-sm">
                          {allTopics.length === 0 ? 'No topics available. Add one above.' : 'All topics selected'}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Save/Cancel buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={saveTags}
                    disabled={saving}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                  >
                    {saving ? '...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingTags(false)
                      setIsTopicDropdownOpen(false)
                    }}
                    className="px-3 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {topics.length > 0 ? topics.map((topic, index) => (
                  <span key={index} className="relative inline-block px-3 py-1 text-xs font-semibold rounded-full bg-fuchsia-900 text-fuchsia-200 group">
                    {topic}
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap max-w-xs">
                      {getTopicDescription(topic)}
                    </span>
                  </span>
                )) : (
                  <span className="text-gray-500 text-sm">No tags</span>
                )}
              </div>
            )}
          </div>

          {/* Authors/Collaborators */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-medium text-gray-400">Authors</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {project.owners.map((owner) => (
                <span key={owner.id} className="inline-flex items-center gap-2 px-3 py-1 bg-gray-700 rounded-lg text-gray-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {owner.username}
                  {owner.id === currentUserId && (
                    <span className="text-xs text-purple-400">(you)</span>
                  )}
                  {isOwner && project.owners.length > 1 && owner.id !== currentUserId && (
                    <button
                      onClick={() => removeCollaborator(owner.id)}
                      className="ml-1 text-gray-400 hover:text-red-400 transition"
                      title="Remove collaborator"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </span>
              ))}

              {/* Add Collaborator Dropdown */}
              {isOwner && (
                <div className="relative">
                  <button
                    onClick={() => setIsCollaboratorDropdownOpen(!isCollaboratorDropdownOpen)}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add
                  </button>

                  {isCollaboratorDropdownOpen && (
                    <div className="absolute z-10 mt-1 w-48 bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {availableCollaborators.length > 0 ? (
                        availableCollaborators.map(user => (
                          <button
                            key={user.id}
                            onClick={() => addCollaborator(user)}
                            className="w-full px-4 py-2 text-left text-gray-200 hover:bg-gray-600 transition first:rounded-t-lg last:rounded-b-lg"
                          >
                            {user.username}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-gray-400 text-sm">
                          No users available
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Upload Date */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-400 mb-1">Upload Date</h3>
            <p className="text-gray-300">
              {new Date(project.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>

          {/* File Name */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-1">File</h3>
            <p className="text-gray-300 font-mono text-sm">{project.file_path.split('/').pop()}</p>
          </div>
        </div>

        {/* Description Card */}
        <div className="bg-gray-800 rounded-lg shadow-xl p-8 border border-gray-700 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-2xl font-bold text-white">Description</h2>
            {isOwner && !isEditingDescription && (
              <button
                onClick={startEditingDescription}
                className="p-1 text-gray-400 hover:text-white transition"
                title="Edit description"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
          </div>
          {isEditingDescription ? (
            <div className="space-y-3">
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={saveDescription}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setIsEditingDescription(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-300 leading-relaxed whitespace-pre-line">
              {project.description || 'No description provided.'}
            </p>
          )}
        </div>

        {/* Rating Section */}
        <div className="bg-gray-800 rounded-lg shadow-xl p-8 border border-gray-700 mb-6">
          <h2 className="text-2xl font-bold text-white mb-6">Rating</h2>

          {/* Current Rating Display */}
          <div className="flex items-center gap-4 mb-6">
            <div className="text-5xl font-bold text-white">
              {ratingData.count > 0 ? ratingData.average.toFixed(1) : '-'}
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className={`w-6 h-6 ${
                      star <= Math.round(ratingData.average)
                        ? 'text-fuchsia-400 fill-fuchsia-400'
                        : 'text-gray-600'
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    />
                  </svg>
                ))}
              </div>
              <p className="text-sm text-gray-400">
                {ratingData.count} {ratingData.count === 1 ? 'rating' : 'ratings'}
              </p>
            </div>
          </div>

          {/* User Rating Input */}
          <div className="border-t border-gray-700 pt-6">
            <h3 className="text-lg font-semibold text-white mb-3">Rate this project</h3>
            {isOwner ? (
              <p className="text-gray-400">
                You cannot rate your own project.
              </p>
            ) : isLoggedIn ? (
              <>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleRating(star)}
                      onMouseEnter={() => setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(0)}
                      className="transition-transform hover:scale-110"
                    >
                      <svg
                        className={`w-10 h-10 ${
                          star <= (hoveredStar || userRating)
                            ? 'text-fuchsia-400 fill-fuchsia-400'
                            : 'text-gray-600'
                        } transition-colors`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                        />
                      </svg>
                    </button>
                  ))}
                </div>
                {ratingMessage && (
                  <p className={`mt-3 text-sm ${ratingMessage.includes('Thank you') ? 'text-green-400' : 'text-red-400'}`}>
                    {ratingMessage}
                  </p>
                )}
              </>
            ) : (
              <p className="text-gray-400">
                <button
                  onClick={() => navigate('/login')}
                  className="text-purple-400 hover:text-purple-300 underline"
                >
                  Log in
                </button>
                {' '}to rate this project
              </p>
            )}
          </div>
        </div>

        {/* Media Attachments */}
        <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-4">Media Attachments</h2>
          
          {/* Upload Section (only for owners) */}
          {isOwner && (
            <div className="mb-6 p-4 bg-gray-700 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-3">Upload Media</h3>
              <input
                type="file"
                multiple
                accept="image/*,video/*,.pdf"
                onChange={(e) => setSelectedFiles(e.target.files)}
                className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 mb-3"
              />
              <p className="text-xs text-gray-400 mb-3">
                Accepts: Images (JPG, PNG, GIF), Videos (MP4, MOV, AVI), PDF
              </p>
              <button
                onClick={handleMediaUpload}
                disabled={uploadingMedia || !selectedFiles}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
              >
                {uploadingMedia ? 'Uploading...' : 'Upload Media'}
              </button>
            </div>
          )}

          {/* Media Grid */}
          {media.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No media attachments yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {media.map((item) => (
                <div key={item.id} className="bg-gray-700 rounded-lg overflow-hidden border border-gray-600 hover:border-purple-500 transition duration-200">
                  {/* Media Preview */}
                  {item.file_type.match(/jpg|jpeg|png|gif/) ? (
                    <img
                      src={`/api/media/${item.id}`}
                      alt={item.file_name}
                      className="w-full h-48 object-cover"
                    />
                  ) : item.file_type.match(/mp4|mov|avi/) ? (
                    <video controls className="w-full h-48 bg-black">
                      <source src={`/api/media/${item.id}`} type={`video/${item.file_type}`} />
                    </video>
                  ) : (
                    <div className="w-full h-48 bg-gray-600 flex items-center justify-center">
                      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  
                  {/* Media Info */}
                  <div className="p-3">
                    <p className="text-sm text-white font-medium truncate mb-1">{item.file_name}</p>
                    <p className="text-xs text-gray-400 mb-2">
                      {(item.file_size / 1024).toFixed(0)} KB • {item.file_type.toUpperCase()}
                    </p>
                    <div className="flex gap-2">
                      <a
                        href={`/api/media/${item.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition duration-200 text-center"
                      >
                        View
                      </a>
                      {isOwner && (
                        <button
                          onClick={() => handleDeleteMedia(item.id)}
                          className="flex-1 px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition duration-200"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="bg-gray-800 rounded-lg shadow-xl mt-6 p-6 border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-4">Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button className="px-6 py-3 border border-gray-600 rounded-lg text-gray-300 font-medium hover:bg-gray-700 transition duration-200 inline-flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
            <button className="px-6 py-3 border border-gray-600 rounded-lg text-gray-300 font-medium hover:bg-gray-700 transition duration-200 inline-flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Bookmark
            </button>
            {isOwner && (
              <button
                onClick={handleDeleteProject}
                disabled={deleting}
                className="px-6 py-3 bg-red-600 rounded-lg text-white font-medium hover:bg-red-700 transition duration-200 inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {deleting ? 'Deleting...' : 'Delete Project'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ViewProjectPage
