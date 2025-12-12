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
  file_path: string
  approved?: number
}

interface User {
  id: number
  username: string
  email: string
  admin?: number
}

function ExploreProjectsPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCourse, setSelectedCourse] = useState<string>('all')
  const [selectedTopic, setSelectedTopic] = useState<string>('all')
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuthAndFetchProjects = async () => {
      const token = localStorage.getItem('token')
      let currentUser: User | null = null

      // Check authentication
      if (token) {
        try {
          const response = await axios.get('/api/me', {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (response.data.success) {
            currentUser = response.data.user
            setUser(currentUser)
          } else {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            setUser(null)
          }
        } catch {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          setUser(null)
        }
      } else {
        setUser(null)
      }

      // Fetch projects - use admin endpoint if user is admin
      try {
        const isAdmin = currentUser?.admin === 1
        const endpoint = isAdmin ? '/api/projects/all' : '/api/projects'
        const headers = isAdmin ? { Authorization: `Bearer ${token}` } : {}

        const response = await axios.get(endpoint, { headers })
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
          setFilteredProjects(projectsWithCourses)
        }
      } catch (error) {
        console.error('Failed to fetch projects:', error)
      } finally {
        setLoading(false)
      }
    }

    checkAuthAndFetchProjects()
  }, [])

  // Extract courses and topics from existing projects
  const courses = ['all', ...Array.from(new Set(projects.map(p => p.course).filter(Boolean)))]
  const topics = ['all', ...Array.from(new Set(projects.flatMap(p => p.tags || [])))]

  // Filter projects based on search and filters
  const handleFilter = (search: string, course: string, topic: string) => {
    let filtered = projects

    // Filter by search query
    if (search) {
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(search.toLowerCase()) ||
        project.description.toLowerCase().includes(search.toLowerCase()) ||
        project.owners.some(owner => owner.username.toLowerCase().includes(search.toLowerCase()))
      )
    }

    // Filter by course
    if (course !== 'all') {
      filtered = filtered.filter(project => project.course === course)
    }

    // Filter by topic
    if (topic !== 'all') {
      filtered = filtered.filter(project => (project.tags || []).includes(topic))
    }

    setFilteredProjects(filtered)
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    handleFilter(value, selectedCourse, selectedTopic)
  }

  const handleCourseChange = (value: string) => {
    setSelectedCourse(value)
    handleFilter(searchQuery, value, selectedTopic)
  }

  const handleTopicChange = (value: string) => {
    setSelectedTopic(value)
    handleFilter(searchQuery, selectedCourse, value)
  }

  const handleReset = () => {
    setSearchQuery('')
    setSelectedCourse('all')
    setSelectedTopic('all')
    setFilteredProjects(projects)
  }

  const handleApprove = async (projectId: number) => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const response = await axios.post(`/api/projects/${projectId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.data.success) {
        // Update the project in both lists
        const updateProjects = (prevProjects: Project[]) =>
          prevProjects.map(p => p.id === projectId ? { ...p, approved: 1 } : p)
        setProjects(updateProjects)
        setFilteredProjects(updateProjects)
      }
    } catch (error) {
      console.error('Failed to approve project:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Top Navigation Bar */}
        <div className="flex justify-between items-center gap-3 mb-8">
          {/* Left side - Admin Course Management */}
          <div>
            {user?.admin === 1 && (
              <button
                onClick={() => navigate('/admin/courses')}
                className="px-6 py-3 border border-purple-600 text-purple-400 rounded-lg font-medium hover:bg-purple-600 hover:text-white transition duration-200 inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Manage Courses
              </button>
            )}
          </div>
          
          {/* Right side - User menu */}
          <div className="flex gap-3">
          {user ? (
            <>
              <button
                onClick={() => navigate('/profile')}
                className="px-6 py-3 border border-gray-600 rounded-lg text-gray-300 font-medium hover:bg-gray-700 transition duration-200 inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {user.username}
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('token')
                  localStorage.removeItem('user')
                  setUser(null)
                }}
                className="p-3 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-red-400 transition duration-200"
                title="Logout"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-3 border border-gray-600 rounded-lg text-gray-300 font-medium hover:bg-gray-700 transition duration-200 inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Login
            </button>
          )}
          {user && (<button
            onClick={() => navigate('/upload')}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition duration-200 inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload Project
          </button>)
          }
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Explore Projects</h1>
          <p className="text-lg text-gray-400">Discover student projects from various courses</p>
        </div>

        {/* Filters Section */}
        <div className="bg-gray-800 rounded-lg shadow-xl p-6 mb-8 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search Bar */}
            <div className="md:col-span-2">
              <label htmlFor="search" className="block text-sm font-medium text-gray-300 mb-2">
                Search Projects
              </label>
              <input
                type="text"
                id="search"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                placeholder="Search by title, description, or author..."
              />
            </div>

            {/* Course Filter */}
            <div>
              <label htmlFor="course" className="block text-sm font-medium text-gray-300 mb-2">
                Course
              </label>
              <select
                id="course"
                value={selectedCourse}
                onChange={(e) => handleCourseChange(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
              >
                {courses.map(course => (
                  <option key={course} value={course}>
                    {course === 'all' ? 'All Courses' : course}
                  </option>
                ))}
              </select>
            </div>

            {/* Topic Filter */}
            <div>
              <label htmlFor="topic" className="block text-sm font-medium text-gray-300 mb-2">
                Topic
              </label>
              <select
                id="topic"
                value={selectedTopic}
                onChange={(e) => handleTopicChange(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
              >
                {topics.map(topic => (
                  <option key={topic} value={topic}>
                    {topic === 'all' ? 'All Topics' : topic}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="mt-4 flex justify-between items-center">
            <p className="text-sm text-gray-400">
              Showing {filteredProjects.length} of {projects.length} projects
            </p>
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm border border-gray-600 rounded-lg text-gray-300 font-medium hover:bg-gray-700 transition duration-200"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">Loading projects...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No projects found matching your criteria.</p>
            <button
              onClick={handleReset}
              className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition duration-200"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 hover:border-purple-500 transition duration-200 overflow-hidden flex flex-col"
              >
                <div className="p-6 flex flex-col flex-grow">
                  {/* Project Title */}
                  <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 flex items-center gap-2">
                    <span className="line-clamp-2">{project.name}</span>
                    {project.approved === 0 && (
                      <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <title>Pending approval</title>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    )}
                  </h3>

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
                    {project.description}
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
                      onClick={() => navigate(`/project/${project.id}`)}
                      className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition duration-200"
                    >
                      View Details
                    </button>
                    {user?.admin === 1 && project.approved === 0 && (
                      <button
                        onClick={() => handleApprove(project.id)}
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
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ExploreProjectsPage
