import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

interface Project {
  id: number
  name: string
  description: string
  course?: string
  tags: string[]
  owners: { id: number; username: string; email: string }[]
  created_at: string
  approved?: number
}

interface ProjectCardProps {
  project: Project
  showApproveButton?: boolean
  onApprove?: (projectId: number) => void
  variant?: 'default' | 'profile'
  fromProfile?: boolean
  fromBookmarks?: boolean
  showBookmarkButton?: boolean
  onBookmarkChange?: () => void
}

function ProjectCard({ project, showApproveButton = false, onApprove, variant = 'default', fromProfile = false, fromBookmarks = false, showBookmarkButton = true, onBookmarkChange }: ProjectCardProps) {
  const navigate = useNavigate()
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isLoadingBookmark, setIsLoadingBookmark] = useState(false)

  const bgColor = variant === 'profile' ? 'bg-gray-700' : 'bg-gray-800'
  const borderColor = variant === 'profile' ? 'border-gray-600' : 'border-gray-700'

  // Check if project is bookmarked on mount
  useEffect(() => {
    const checkBookmark = async () => {
      const token = localStorage.getItem('token')
      if (!token || !showBookmarkButton) return

      try {
        const response = await axios.get(`/api/bookmarks/check/${project.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (response.data.success) {
          setIsBookmarked(response.data.is_bookmarked)
        }
      } catch (error) {
        console.error('Error checking bookmark status:', error)
      }
    }

    checkBookmark()
  }, [project.id, showBookmarkButton])

  const handleBookmarkToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }

    setIsLoadingBookmark(true)
    try {
      if (isBookmarked) {
        // Remove bookmark
        await axios.delete(`/api/bookmarks/${project.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setIsBookmarked(false)
      } else {
        // Add bookmark
        await axios.post('/api/bookmarks', 
          { project_id: project.id },
          { headers: { Authorization: `Bearer ${token}` } }
        )
        setIsBookmarked(true)
      }
      
      // Notify parent component if callback provided
      if (onBookmarkChange) {
        onBookmarkChange()
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error)
    } finally {
      setIsLoadingBookmark(false)
    }
  }

  return (
    <div
      className={`${bgColor} rounded-lg shadow-lg border ${borderColor} hover:border-purple-500 transition duration-200 overflow-hidden flex flex-col`}
    >
      <div className="p-6 flex flex-col flex-grow">
        {/* Project Title with Bookmark Button */}
        <div className="flex items-start justify-between mb-2 gap-2">
          <h3 className="text-xl font-bold text-white line-clamp-2 flex items-center gap-2 flex-1">
            <span className="line-clamp-2">{project.name}</span>
            {project.approved === 0 && variant === 'default' && (
              <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <title>Pending approval</title>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </h3>
          {showBookmarkButton && (
            <button
              onClick={handleBookmarkToggle}
              disabled={isLoadingBookmark}
              className="flex-shrink-0 p-2 hover:bg-gray-700 rounded-lg transition duration-200 disabled:opacity-50"
              title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
            >
              {isBookmarked ? (
                <svg className="w-6 h-6 text-fuchsia-400 fill-current" viewBox="0 0 24 24">
                  <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-gray-400 hover:text-fuchsia-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              )}
            </button>
          )}
        </div>

        {/* Course and Topic Tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-purple-900 text-purple-200">
            {project.course}
          </span>
          {(project.tags || []).map((tag, index) => (
            <span key={index} className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-fuchsia-900 text-fuchsia-200">
              {tag}
            </span>
          ))}
        </div>

        {/* Description */}
        <p className="text-gray-400 text-sm mb-4 line-clamp-3">
          {project.description || 'No description provided'}
        </p>

        {/* Spacer to push content to bottom */}
        <div className="flex-grow"></div>

        {/* Authors */}
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-1">Authors:</p>
          <p className="text-sm text-gray-300">{project.owners.map(o => o.username).join(', ')}</p>
        </div>

        {/* Upload Date */}
        <p className="text-xs text-gray-500 mb-4">
          Uploaded: {new Date(project.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => navigate(`/project/${project.id}`, (fromProfile || fromBookmarks) ? { state: { fromProfile, fromBookmarks } } : undefined)}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition duration-200"
          >
            View Details
          </button>
          {showApproveButton && project.approved === 0 && onApprove && (
            <button
              onClick={() => onApprove(project.id)}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Approve
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProjectCard
