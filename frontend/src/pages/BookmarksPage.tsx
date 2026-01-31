import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import ProjectCard from '../components/ProjectCard'

interface Project {
  id: number
  name: string
  description: string
  course?: string
  tags: string[]
  owners: { id: number; username: string; email: string }[]
  created_at: string
  file_path: string
  approved?: number
}

interface User {
  id: number
  username: string
  email: string
  admin?: number
  is_student?: number
}

function BookmarksPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuthAndFetchBookmarks = async () => {
      const token = localStorage.getItem('token')

      // Check authentication
      if (!token) {
        navigate('/login')
        return
      }

      try {
        const response = await axios.get('/api/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (response.data.success) {
          setUser(response.data.user)
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

      // Fetch bookmarked projects
      try {
        const response = await axios.get('/api/bookmarks', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (response.data.success) {
          // Fetch course info for each project
          const projectsWithCourses = await Promise.all(
            response.data.data.map(async (project: Project) => {
              try {
                const courseResponse = await axios.get(`/api/projects/${project.id}/course`)
                if (courseResponse.data.success) {
                  return { ...project, course: courseResponse.data.course.name }
                }
              } catch {
                // Project might not have a course assigned
              }
              return { ...project, course: 'Uncategorized' }
            })
          )
          setProjects(projectsWithCourses)
        }
      } catch (error) {
        console.error('Error fetching bookmarks:', error)
      }

      setLoading(false)
    }

    checkAuthAndFetchBookmarks()
  }, [navigate])


  const handleBookmarkChange = async () => {
    // Refresh the bookmarks list
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const response = await axios.get('/api/bookmarks', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.data.success) {
        // Fetch course info for each project
        const projectsWithCourses = await Promise.all(
          response.data.data.map(async (project: Project) => {
            try {
              const courseResponse = await axios.get(`/api/projects/${project.id}/course`)
              if (courseResponse.data.success) {
                return { ...project, course: courseResponse.data.course.name }
              }
            } catch {
              // Project might not have a course assigned
            }
            return { ...project, course: 'Uncategorized' }
          })
        )
        setProjects(projectsWithCourses)
      }
    } catch (error) {
      console.error('Error fetching bookmarks:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
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
          <h1 className="text-xl sm:text-3xl font-bold text-white mx-auto absolute left-1/2 sm:static transform -translate-x-1/2 sm:transform-none scale-105 sm:scale-100">
            My Bookmarks
          </h1>
        </div>



        {/* Bookmarked Projects */}
        {projects.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-24 w-24 text-gray-500 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
            <h2 className="text-2xl font-semibold text-gray-400 mb-2">No bookmarks yet</h2>
            <p className="text-gray-500 mb-6">Start exploring projects and bookmark your favorites!</p>
            <button
              onClick={() => navigate('/explore')}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition duration-200"
            >
              Explore Projects
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {projects.map((project) => (
              <ProjectCard 
                key={project.id} 
                project={project}
                fromBookmarks={true}
                showBookmarkButton={true}
                onBookmarkChange={handleBookmarkChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default BookmarksPage
