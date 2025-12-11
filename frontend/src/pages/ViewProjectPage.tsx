import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import axios from 'axios'

interface Project {
  id: number
  name: string
  description: string
  course?: string
  tags: string[]
  owners: { id: number; username: string; email: string }[]
  created_at: string
  file_path: string
}

interface RatingData {
  average: number
  count: number
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
  const [media, setMedia] = useState<any[]>([])
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
  const [uploadingMedia, setUploadingMedia] = useState(false)

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await axios.get(`/api/projects/${id}`)
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

    fetchProject()
    fetchRating()
    fetchUserRating()
    
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
          <h1 className="text-3xl font-bold text-white mb-3">{project.name}</h1>

          {/* Course Tag */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="inline-block px-4 py-2 text-sm font-semibold rounded-full bg-purple-900 text-purple-200">
              {project.course}
            </span>
          </div>

          {/* Topic Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {topics.map((topic, index) => (
              <span key={index} className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-fuchsia-900 text-fuchsia-200">
                {topic}
              </span>
            ))}
          </div>

          {/* Authors */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Authors</h3>
            <div className="flex flex-wrap gap-2">
              {project.owners.map((owner) => (
                <span key={owner.id} className="inline-flex items-center gap-2 px-3 py-1 bg-gray-700 rounded-lg text-gray-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {owner.username}
                </span>
              ))}
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
          <h2 className="text-2xl font-bold text-white mb-4">Description</h2>
          <p className="text-gray-300 leading-relaxed whitespace-pre-line">
            {project.description}
          </p>
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
            {isLoggedIn ? (
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
        <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700">
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
          </div>
        </div>
      </div>
    </div>
  )
}

export default ViewProjectPage
