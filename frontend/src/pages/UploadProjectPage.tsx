import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'

interface User {
  id: number
  username: string
  email: string
}

interface Course {
  id: number
  name: string
  description?: string
}

interface Topic {
  id: number
  name: string
  description?: string
}

interface ProjectFormData {
  title: string
  description: string
  courseId: number | null
  selectedTopics: string[]
  authors: User[]
  file: File | null
  mediaFiles: FileList | null
}

function UploadProjectPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const fromProfile = location.state?.fromProfile || false
  const profileUsername = location.state?.profileUsername || null
  const [formData, setFormData] = useState<ProjectFormData>({
    title: '',
    description: '',
    courseId: null,
    selectedTopics: [],
    authors: [],
    file: null,
    mediaFiles: null
  })

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [isDraggingMedia, setIsDraggingMedia] = useState(false)
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  // Course and topic states
  const [courses, setCourses] = useState<Course[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [isTopicDropdownOpen, setIsTopicDropdownOpen] = useState(false)
  const [newTopicName, setNewTopicName] = useState('')
  const [addingTopic, setAddingTopic] = useState(false)

  const handleBackNavigation = () => {
    if (fromProfile && profileUsername) {
      navigate(`/profile/${profileUsername}`)
    } else {
      navigate('/explore')
    }
  }

  // Fetch current user, all users, courses, and topics on mount
  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token')
      if (!token) return

      try {
        // Fetch current user
        const meResponse = await axios.get('/api/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (meResponse.data.success) {
          const user = meResponse.data.user
          setCurrentUser(user)
          // Pre-add current user as author
          setFormData(prev => ({
            ...prev,
            authors: [{ id: user.id, username: user.username, email: user.email }]
          }))
        }

        // Fetch all users
        const usersResponse = await axios.get('/api/users', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (usersResponse.data.success) {
          setAllUsers(usersResponse.data.data)
        }

        // Fetch courses
        const coursesResponse = await axios.get('/api/courses')
        if (coursesResponse.data.success) {
          setCourses(coursesResponse.data.data)
        }

        // Fetch topics
        const topicsResponse = await axios.get('/api/topics')
        if (topicsResponse.data.success) {
          setTopics(topicsResponse.data.data)
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      }
    }

    fetchData()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData(prev => ({
        ...prev,
        file: file
      }))
      setFileName(file.name)
    }
  }

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      setFormData(prev => ({
        ...prev,
        mediaFiles: files
      }))
    }
  }

  const handleFileDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingFile(true)
  }

  const handleFileDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingFile(false)
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingFile(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const file = files[0]
      // Check if it's a valid archive file (case-insensitive)
      const fileName = file.name.toLowerCase()
      if (fileName.endsWith('.zip') || fileName.endsWith('.rar') ||
          fileName.endsWith('.7z') || fileName.endsWith('.tar') ||
          fileName.endsWith('.gz')) {
        setFormData(prev => ({
          ...prev,
          file: file
        }))
        setFileName(file.name)
      } else {
        setMessage({ type: 'error', text: 'Please upload a valid archive file (ZIP, RAR, 7Z, TAR, or GZ)' })
      }
    }
  }

  const handleMediaDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingMedia(true)
  }

  const handleMediaDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingMedia(false)
  }

  const handleMediaDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingMedia(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      setFormData(prev => ({
        ...prev,
        mediaFiles: files
      }))
    }
  }

  const addAuthor = (user: User) => {
    if (!formData.authors.find(a => a.id === user.id)) {
      setFormData(prev => ({
        ...prev,
        authors: [...prev.authors, user]
      }))
    }
    setIsDropdownOpen(false)
  }

  const removeAuthor = (userId: number) => {
    // Don't allow removing the current user (uploader)
    if (currentUser && userId === currentUser.id) return
    setFormData(prev => ({
      ...prev,
      authors: prev.authors.filter(a => a.id !== userId)
    }))
  }

  const availableUsers = allUsers.filter(
    user => !formData.authors.find(a => a.id === user.id)
  )

  // Topic management functions
  const toggleTopic = (topicName: string) => {
    setFormData(prev => ({
      ...prev,
      selectedTopics: prev.selectedTopics.includes(topicName)
        ? prev.selectedTopics.filter(t => t !== topicName)
        : [...prev.selectedTopics, topicName]
    }))
  }

  const removeTopic = (topicName: string) => {
    setFormData(prev => ({
      ...prev,
      selectedTopics: prev.selectedTopics.filter(t => t !== topicName)
    }))
  }

  const addNewTopic = async () => {
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
          setTopics(topicsResponse.data.data)
        }
        // Add to selected topics
        setFormData(prev => ({
          ...prev,
          selectedTopics: [...prev.selectedTopics, newTopicName.trim()]
        }))
        setNewTopicName('')
      }
    } catch (error: any) {
      console.error('Failed to add topic:', error)
      // If topic already exists, just add it to selection
      if (error.response?.data?.message?.includes('already exists')) {
        setFormData(prev => ({
          ...prev,
          selectedTopics: prev.selectedTopics.includes(newTopicName.trim())
            ? prev.selectedTopics
            : [...prev.selectedTopics, newTopicName.trim()]
        }))
        setNewTopicName('')
      }
    } finally {
      setAddingTopic(false)
    }
  }

  const availableTopics = topics.filter(
    topic => !formData.selectedTopics.includes(topic.name)
  )

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    // Manual validation (to support drag and drop)
    if (!formData.file) {
      setMessage({ type: 'error', text: 'Please upload a project file' })
      setLoading(false)
      return
    }

    try {
      // Debug: log form data
      console.log('Form data being sent:', {
        name: formData.title,
        description: formData.description,
        tags: formData.selectedTopics.join(', '),
        file: formData.file?.name
      })

      const formDataToSend = new FormData()
      formDataToSend.append('name', formData.title)  // Backend expects 'name'
      formDataToSend.append('description', formData.description)
      formDataToSend.append('tags', formData.selectedTopics.join(', '))  // Send topics as comma-separated tags
      if (formData.file) {
        formDataToSend.append('file', formData.file)
      }

      // Debug: log FormData contents
      console.log('FormData entries:')
      for (const pair of formDataToSend.entries()) {
        console.log(pair[0], pair[1])
      }

      const token = localStorage.getItem('token')

      const response = await axios.post('/api/projects', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      })

      console.log('Upload response:', response.data)

      // If project created successfully, assign course and handle authors
      if (response.data.success) {
        const projectId = response.data.project?.id || response.data.id
        console.log('Project ID:', projectId)
        console.log('Has media files:', formData.mediaFiles?.length)

        // Assign course if selected
        if (formData.courseId && projectId) {
          try {
            await axios.post(`/api/projects/${projectId}/course`, {
              course_id: formData.courseId
            }, {
              headers: { Authorization: `Bearer ${token}` }
            })
          } catch (error) {
            console.error('Failed to assign course:', error)
          }
        }

        // Add co-authors (skip current user since they're automatically added as owner)
        if (projectId && currentUser) {
          const coAuthors = formData.authors.filter(a => a.id !== currentUser.id)
          for (const author of coAuthors) {
            try {
              await axios.post(`/api/projects/${projectId}/owners`, {
                username: author.username
              }, {
                headers: { Authorization: `Bearer ${token}` }
              })
            } catch (error) {
              console.error(`Failed to add co-author ${author.username}:`, error)
            }
          }
        }

        // Upload media attachments if any
        if (formData.mediaFiles && formData.mediaFiles.length > 0 && projectId) {
          console.log('Uploading media for project:', projectId)
          const mediaFormData = new FormData()
          Array.from(formData.mediaFiles).forEach(file => {
            mediaFormData.append('media', file)
          })

          try {
            const mediaResponse = await axios.post(`/api/projects/${projectId}/media`, mediaFormData, {
              headers: {
                'Content-Type': 'multipart/form-data',
                'Authorization': `Bearer ${token}`
              }
            })
            console.log('Media upload response:', mediaResponse.data)
            setMessage({ type: 'success', text: 'Project and media uploaded successfully!' })
          } catch (mediaError: any) {
            console.error('Media upload error:', mediaError.response?.data || mediaError)
            setMessage({ type: 'success', text: 'Project uploaded successfully, but some media failed to upload.' })
          }
        } else {
          console.log('No media to upload or missing project ID')
          setMessage({ type: 'success', text: 'Project uploaded successfully!' })
        }
      }

      setFormData({
        title: '',
        description: '',
        courseId: null,
        selectedTopics: [],
        authors: currentUser ? [currentUser] : [],
        file: null,
        mediaFiles: null
      })
      setFileName('')
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to upload project. Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <button
          onClick={handleBackNavigation}
          className="mb-6 inline-flex items-center gap-2 text-gray-400 hover:text-white transition duration-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
            <span className="inline sm:hidden">Back</span>
            <span className="hidden sm:inline">{fromProfile ? 'Back to Profile' : 'Back to Explore'}</span>
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2">Upload Your Project</h1>
        </div>

        {/* Form Card */}
        <div className="bg-gray-800 rounded-lg shadow-xl p-8 border border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Project Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
                Project Title <span className="text-fuchsia-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                placeholder="Enter your project title"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                Description <span className="text-fuchsia-500">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                required
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                placeholder="Describe your project..."
              />
            </div>

            {/* Course Dropdown */}
            <div>
              <label htmlFor="course" className="block text-sm font-medium text-gray-300 mb-2">
                Course <span className="text-fuchsia-500">*</span>
              </label>
              <select
                id="course"
                name="course"
                required
                value={formData.courseId || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, courseId: e.target.value ? parseInt(e.target.value) : null }))}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
              >
                <option value="">Select a course...</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>{course.name}</option>
                ))}
              </select>
              {courses.length === 0 && (
                <p className="mt-1 text-xs text-gray-500">No courses available. Contact an admin to add courses.</p>
              )}
            </div>

            {/* Topics Multi-Select */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Topics <span className="text-fuchsia-500">*</span>
              </label>

              {/* Selected Topics */}
              {formData.selectedTopics.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.selectedTopics.map(topic => (
                    <span
                      key={topic}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-fuchsia-900 text-fuchsia-200"
                    >
                      {topic}
                      <button
                        type="button"
                        onClick={() => removeTopic(topic)}
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

              {/* Topic Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsTopicDropdownOpen(!isTopicDropdownOpen)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-400 text-left hover:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200 flex items-center justify-between"
                >
                  <span>Select topics...</span>
                  <svg className={`w-5 h-5 transition-transform ${isTopicDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                              addNewTopic()
                            }
                          }}
                          placeholder="Add new topic..."
                          className="flex-1 px-3 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm placeholder-gray-400 focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                        />
                        <button
                          type="button"
                          onClick={addNewTopic}
                          disabled={addingTopic || !newTopicName.trim()}
                          className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {addingTopic ? '...' : 'Add'}
                        </button>
                      </div>
                    </div>

                    {/* Existing topics */}
                    {availableTopics.length > 0 ? (
                      availableTopics.map(topic => (
                        <button
                          key={topic.id}
                          type="button"
                          onClick={() => toggleTopic(topic.name)}
                          className="w-full px-4 py-2 text-left text-gray-200 hover:bg-gray-600 transition"
                        >
                          {topic.name}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-gray-400 text-sm">
                        {topics.length === 0 ? 'No topics available. Add one above.' : 'All topics selected'}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {formData.selectedTopics.length === 0 && (
                <p className="mt-1 text-xs text-gray-500">Select at least one topic for your project.</p>
              )}
            </div>

            {/* File Upload */}
            <div>
              <label htmlFor="file" className="block text-sm font-medium text-gray-300 mb-2">
                Project File <span className="text-fuchsia-500">*</span>
              </label>
              {/* Desktop / larger screens: drag-and-drop area */}
              <div className={`mt-1 hidden sm:block`}>
                <div
                  className={`flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition duration-200 ${
                    isDraggingFile 
                      ? 'border-purple-500 bg-purple-900/20' 
                      : 'border-gray-600 hover:border-purple-500'
                  }`}
                  onDragOver={handleFileDragOver}
                  onDragLeave={handleFileDragLeave}
                  onDrop={handleFileDrop}
                >
                  <div className="space-y-1 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                      aria-hidden="true"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex text-sm text-gray-400">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer rounded-md font-medium text-purple-400 hover:text-purple-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-purple-500"
                      >
                        <span>Upload a file</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          onChange={handleFileChange}
                          accept=".zip,.rar,.7z,.tar,.gz"
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">ZIP, 7z, RAR, TAR or GZ up to 500MB</p>
                    {fileName && (
                      <p className="text-sm text-purple-400 mt-2">
                        Selected: {fileName}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Mobile: simple upload button (no drag-and-drop) */}
              <div className="mt-1 block sm:hidden">
                <div className="flex flex-col gap-3">
                  <label htmlFor="file-upload" className="w-full">
                    <span className="w-full inline-flex justify-center px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm font-medium text-purple-400 hover:bg-gray-700/80 cursor-pointer">
                      Choose Project File
                    </span>
                  </label>
                  <p className="text-xs text-gray-500">ZIP, 7z, RAR, TAR or GZ up to 500MB</p>
                  {fileName ? (
                    <p className="text-sm text-purple-400">Selected: {fileName}</p>
                  ) : (
                    <p className="text-sm text-gray-400">No file selected</p>
                  )}
                </div>
              </div>
            </div>

            {/* Media Attachments (Optional) */}
            <div>
              <label htmlFor="media-upload" className="block text-sm font-medium text-gray-300 mb-2">
                Media Attachments <span className="text-gray-500">(optional)</span>
              </label>
              {/* Desktop / larger screens: drag-and-drop area */}
              <div className="mt-1 hidden sm:block">
                <div
                  className={`px-6 py-4 border-2 border-dashed rounded-lg transition duration-200 ${
                    isDraggingMedia 
                      ? 'border-purple-500 bg-purple-900/20' 
                      : 'border-gray-600 hover:border-purple-500'
                  }`}
                  onDragOver={handleMediaDragOver}
                  onDragLeave={handleMediaDragLeave}
                  onDrop={handleMediaDrop}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <div className="flex-1">
                        <label
                          htmlFor="media-upload"
                          className="cursor-pointer rounded-md font-medium text-purple-400 hover:text-purple-300"
                        >
                          <span>Choose media files</span>
                          <input
                            id="media-upload"
                            name="media-upload"
                            type="file"
                            multiple
                            className="sr-only"
                            onChange={handleMediaChange}
                            accept="image/*,video/*,.pdf"
                          />
                        </label>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">Images (JPG, PNG, GIF), Videos (MP4, MOV, AVI), PDF</p>
                    {formData.mediaFiles && formData.mediaFiles.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-sm text-purple-400 font-medium">
                          {formData.mediaFiles.length} file(s) selected:
                        </p>
                        {Array.from(formData.mediaFiles).map((file, index) => (
                          <p key={index} className="text-xs text-gray-400 truncate">
                            • {file.name}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Mobile: simple upload button (no drag-and-drop) */}
              <div className="mt-1 block sm:hidden">
                <div className="flex flex-col gap-3">
                  <label htmlFor="media-upload" className="w-full">
                    <span className="w-full inline-flex justify-center px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm font-medium text-purple-400 hover:bg-gray-700/80 cursor-pointer">
                      Choose Media Files
                    </span>
                  </label>
                  <p className="text-xs text-gray-500">Images (JPG, PNG, GIF), Videos (MP4, MOV, AVI), PDF</p>
                  {formData.mediaFiles && formData.mediaFiles.length > 0 ? (
                    <div className="space-y-1">
                      <p className="text-sm text-purple-400 font-medium">{formData.mediaFiles.length} file(s) selected:</p>
                      {Array.from(formData.mediaFiles).map((file, index) => (
                        <p key={index} className="text-xs text-gray-400 truncate">• {file.name}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No media selected</p>
                  )}
                </div>
              </div>
            </div>

            {/* Authors */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Authors <span className="text-fuchsia-500">*</span>
              </label>

              {/* Selected Authors */}
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.authors.map(author => (
                  <span
                    key={author.id}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                      currentUser && author.id === currentUser.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-200'
                    }`}
                  >
                    {author.username}
                    {currentUser && author.id === currentUser.id && (
                      <span className="text-xs text-purple-200">(you)</span>
                    )}
                    {(!currentUser || author.id !== currentUser.id) && (
                      <button
                        type="button"
                        onClick={() => removeAuthor(author.id)}
                        className="ml-1 text-gray-400 hover:text-white transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </span>
                ))}
              </div>

              {/* Dropdown to add more authors */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-400 text-left hover:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200 flex items-center justify-between"
                >
                  <span>Add co-author...</span>
                  <svg className={`w-5 h-5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isDropdownOpen && availableUsers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {availableUsers.map(user => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => addAuthor(user)}
                        className="w-full px-4 py-2 text-left text-gray-200 hover:bg-gray-600 transition first:rounded-t-lg last:rounded-b-lg"
                      >
                        {user.username}
                      </button>
                    ))}
                  </div>
                )}

                {isDropdownOpen && availableUsers.length === 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg p-4 text-gray-400 text-sm">
                    No more users available
                  </div>
                )}
              </div>

              <p className="mt-2 text-sm text-gray-500">You are automatically added as an author. Add co-authors using the dropdown above.</p>
            </div>

            {/* Message Display */}
            {message && (
              <div className={`p-4 rounded-lg ${
                message.type === 'success' 
                  ? 'bg-green-900 text-green-200 border border-green-700' 
                  : 'bg-red-900 text-red-200 border border-red-700'
              }`}>
                {message.text}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    title: '',
                    description: '',
                    courseId: null,
                    selectedTopics: [],
                    authors: currentUser ? [currentUser] : [],
                    file: null,
                    mediaFiles: null
                  })
                  setFileName('')
                }}
                className="px-6 py-3 border border-gray-600 rounded-lg text-gray-300 font-medium hover:bg-gray-700 transition duration-200"
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Uploading...' : 'Upload Project'}
              </button>
            </div>
          </form>
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-2">📋 Before you submit:</h3>
          <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
            <li>Compress your project files into a ZIP archive</li>
            <li>Maximum file size: 500MB</li>
            <li>Accepted media formats: JPG, PNG, GIF, MP4, MOV, AVI, PDF</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default UploadProjectPage
