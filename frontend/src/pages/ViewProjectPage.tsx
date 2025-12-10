import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { dummyProjects } from '../data/dummyData'

interface Project {
  id: number
  title: string
  description: string
  course: string
  topic: string[] | string
  authors: string[]
  uploadDate: string
  fileName: string
  rating?: number
  totalRatings?: number
}

function ViewProjectPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [userRating, setUserRating] = useState<number>(0)
  const [hoveredStar, setHoveredStar] = useState<number>(0)
  const fromProfile = location.state?.fromProfile || false

  useEffect(() => {
    // Find project by ID
    const foundProject = dummyProjects.find(p => p.id === parseInt(id || '0'))
    if (foundProject) {
      setProject({
        ...foundProject,
        rating: foundProject.rating || 4.5,
        totalRatings: foundProject.totalRatings || 23
      })
    }
  }, [id])

  const handleRating = (rating: number) => {
    setUserRating(rating)
    // TODO: Send rating to backend
    console.log(`User rated ${rating} stars`)
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

  const topics = Array.isArray(project.topic) ? project.topic : [project.topic]

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
          <h1 className="text-3xl font-bold text-white mb-3">{project.title}</h1>
          
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
              {project.authors.map((author, index) => (
                <span key={index} className="inline-flex items-center gap-2 px-3 py-1 bg-gray-700 rounded-lg text-gray-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {author}
                </span>
              ))}
            </div>
          </div>

          {/* Upload Date */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-400 mb-1">Upload Date</h3>
            <p className="text-gray-300">
              {new Date(project.uploadDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>

          {/* File Name */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-1">File</h3>
            <p className="text-gray-300 font-mono text-sm">{project.fileName}</p>
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
            <div className="text-5xl font-bold text-white">{project.rating?.toFixed(1)}</div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className={`w-6 h-6 ${
                      star <= Math.round(project.rating || 0)
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
              <p className="text-sm text-gray-400">{project.totalRatings} ratings</p>
            </div>
          </div>

          {/* User Rating Input */}
          <div className="border-t border-gray-700 pt-6">
            <h3 className="text-lg font-semibold text-white mb-3">Rate this project</h3>
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
            {userRating > 0 && (
              <p className="mt-3 text-sm text-green-400">Thank you for rating this project!</p>
            )}
          </div>
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
