import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'

interface User {
  id: number
  username: string
  email: string
}

interface ProjectFormData {
  title: string
  description: string
  course: string
  topic: string
  authors: User[]
  file: File | null
  mediaFiles: FileList | null
}

function UploadProjectPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const fromProfile = location.state?.fromProfile || false
  const [formData, setFormData] = useState<ProjectFormData>({
    title: '',
    description: '',
    course: '',
    topic: '',
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

  // Fetch current user and all users on mount
  useEffect(() => {
    const fetchUsers = async () => {
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
      } catch (error) {
        console.error('Failed to fetch users:', error)
      }
    }

    fetchUsers()
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
      // Check if it's a zip file
      if (file.name.endsWith('.zip') || file.name.endsWith('.rar') || 
          file.name.endsWith('.7z') || file.name.endsWith('.tar') || 
          file.name.endsWith('.gz')) {
        setFormData(prev => ({
          ...prev,
          file: file
        }))
        setFileName(file.name)
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      // Debug: log form data
      console.log('Form data being sent:', {
        name: formData.title,
        description: formData.description,
        tags: formData.topic,
        file: formData.file?.name
      })
      
      const formDataToSend = new FormData()
      formDataToSend.append('name', formData.title)  // Backend expects 'name'
      formDataToSend.append('description', formData.description)
      formDataToSend.append('tags', formData.topic)  // Send topic as tags
      if (formData.file) {
        formDataToSend.append('file', formData.file)
      }
      
      // Debug: log FormData contents
      console.log('FormData entries:')
      for (let pair of formDataToSend.entries()) {
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
        
        // Assign course if provided
        if (formData.course && projectId) {
          try {
            // First, get or create the course
            const coursesResponse = await axios.get('/api/courses')
            let courseId = null
            
            if (coursesResponse.data.success) {
              const existingCourse = coursesResponse.data.data.find(
                (c: any) => c.name.toLowerCase() === formData.course.toLowerCase()
              )
              
              if (existingCourse) {
                courseId = existingCourse.id
              } else {
                // Create new course
                const createCourseResponse = await axios.post('/api/courses', {
                  name: formData.course,
                  description: ''
                }, {
                  headers: { Authorization: `Bearer ${token}` }
                })
                
                if (createCourseResponse.data.success) {
                  courseId = createCourseResponse.data.id
                }
              }
              
              // Assign project to course
              if (courseId) {
                await axios.post(`/api/projects/${projectId}/course`, {
                  course_id: courseId
                }, {
                  headers: { Authorization: `Bearer ${token}` }
                })
              }
            }
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
        course: '',
        topic: '',
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
          onClick={() => navigate(fromProfile ? '/profile' : '/explore')}
          className="mb-6 inline-flex items-center gap-2 text-gray-400 hover:text-white transition duration-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {fromProfile ? 'Back to Profile' : 'Back to Explore'}
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Upload Your Project</h1>
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

            {/* Course and Topic Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Course */}
              <div>
                <label htmlFor="course" className="block text-sm font-medium text-gray-300 mb-2">
                  Course <span className="text-fuchsia-500">*</span>
                </label>
                <input
                  type="text"
                  id="course"
                  name="course"
                  required
                  value={formData.course}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                  placeholder="e.g., Software Engineering 1"
                />
              </div>

              {/* Topic */}
              <div>
                <label htmlFor="topic" className="block text-sm font-medium text-gray-300 mb-2">
                  Topic <span className="text-fuchsia-500">*</span>
                </label>
                <input
                  type="text"
                  id="topic"
                  name="topic"
                  required
                  value={formData.topic}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                  placeholder="e.g., Web Development"
                />
              </div>
            </div>

            {/* File Upload */}
            <div>
              <label htmlFor="file" className="block text-sm font-medium text-gray-300 mb-2">
                Project File <span className="text-fuchsia-500">*</span>
              </label>
              <div 
                className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition duration-200 ${
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
                        required
                        onChange={handleFileChange}
                        accept=".zip,.rar,.7z,.tar,.gz"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">ZIP, RAR, 7Z up to 500MB</p>
                  {fileName && (
                    <p className="text-sm text-purple-400 mt-2">
                      Selected: {fileName}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Media Attachments (Optional) */}
            <div>
              <label htmlFor="media-upload" className="block text-sm font-medium text-gray-300 mb-2">
                Media Attachments <span className="text-gray-500">(optional)</span>
              </label>
              <div 
                className={`mt-1 px-6 py-4 border-2 border-dashed rounded-lg transition duration-200 ${
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
                    course: '',
                    topic: '',
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
