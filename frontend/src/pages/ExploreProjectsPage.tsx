import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import ProjectCard from '../components/ProjectCard'
import AdminMenu from '../components/AdminMenu'
import UserMenu from '../components/UserMenu'
import ThemeToggle from '../components/ThemeToggle'

interface Project {
  id: number
  name: string
  description: string
  course?: string
  tags: string[]
  owners: { id: number; username: string; email: string }[]
  created_at: string
  updated_at?: string
  file_path: string
  approved?: number
  average_rating?: number
  total_ratings?: number
}

interface User {
  id: number
  username: string
  email: string
  admin?: number
  is_student?: number
}

function ExploreProjectsPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCourse, setSelectedCourse] = useState<string>('all')
  const [selectedTopic, setSelectedTopic] = useState<string>('all')
  const [selectedApprovalStatus, setSelectedApprovalStatus] = useState<string>('all')
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAdminMenu, setShowAdminMenu] = useState(false)
  const [sortOption, setSortOption] = useState<string>('newest')

  // Close admin menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showAdminMenu && !target.closest('.admin-menu-container')) {
        setShowAdminMenu(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showAdminMenu])

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
  const handleFilter = (search: string, course: string, topic: string, approvalStatus: string, sort?: string) => {
    let filtered = projects
    const activeSort = sort ?? sortOption

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

    // Filter by approval status (admin only)
    if (approvalStatus === 'approved') {
      filtered = filtered.filter(project => project.approved === 1)
    } else if (approvalStatus === 'pending') {
      filtered = filtered.filter(project => project.approved === 0)
    }

    // 'all' shows everything
    // Apply sorting
    switch (activeSort) {
      case 'name_asc':
        filtered = filtered.slice().sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'name_desc':
        filtered = filtered.slice().sort((a, b) => b.name.localeCompare(a.name))
        break
      case 'date_new':
        filtered = filtered.slice().sort((a, b) => (new Date(b.created_at).getTime() || 0) - (new Date(a.created_at).getTime() || 0))
        break
      case 'date_old':
        filtered = filtered.slice().sort((a, b) => (new Date(a.created_at).getTime() || 0) - (new Date(b.created_at).getTime() || 0))
        break
      case 'rating_high':
        filtered = filtered.slice().sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
        break
      case 'updated_new':
        filtered = filtered.slice().sort((a, b) => (new Date(b.updated_at || b.created_at).getTime() || 0) - (new Date(a.updated_at || a.created_at).getTime() || 0))
        break
      default:
        break
    }

    setFilteredProjects(filtered)
  }

  const handleSortChange = (value: string) => {
    setSortOption(value)
    handleFilter(searchQuery, selectedCourse, selectedTopic, selectedApprovalStatus, value)
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    handleFilter(value, selectedCourse, selectedTopic, selectedApprovalStatus)
  }

  const handleCourseChange = (value: string) => {
    setSelectedCourse(value)
    handleFilter(searchQuery, value, selectedTopic, selectedApprovalStatus)
  }

  const handleTopicChange = (value: string) => {
    setSelectedTopic(value)
    handleFilter(searchQuery, selectedCourse, value, selectedApprovalStatus)
  }

  const handleApprovalStatusChange = (value: string) => {
    setSelectedApprovalStatus(value)
    handleFilter(searchQuery, selectedCourse, selectedTopic, value)
  }

  const handleReset = () => {
    setSearchQuery('')
    setSelectedCourse('all')
    setSelectedTopic('all')
    setSelectedApprovalStatus('all')
    setSortOption('none')
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        {/* Top Navigation Bar */}
        <div className="flex justify-between items-center gap-3 mb-8">
          <div className="flex items-center gap-3">
            {user?.admin === 1 && (
              <AdminMenu showAdminMenu={showAdminMenu} setShowAdminMenu={setShowAdminMenu} />
            )}
            {user && (
              <button
                onClick={() => navigate('/bookmarks')}
                className="p-2 sm:px-4 sm:py-2 bg-amber-500 dark:bg-fuchsia-600 text-white rounded-lg hover:bg-amber-600 dark:hover:bg-fuchsia-700 transition duration-200 flex items-center gap-2"
                title="View bookmarks"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <span className="hidden sm:inline">My Bookmarks</span>
              </button>
            )}
          <ThemeToggle />
          </div>
          <UserMenu 
            user={user} 
            onLogout={() => {
              localStorage.removeItem('token')
              localStorage.removeItem('user')
              setUser(null)
            }} 
          />
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">Explore Projects</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">Discover student projects from various courses</p>
        </div>

        {/* Filters Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 mb-8 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
          <div className={`grid grid-cols-1 gap-4 ${user?.admin === 1 ? 'md:grid-cols-6' : 'md:grid-cols-5'}`}>
            {/* Search Bar */}
            <div className="md:col-span-2">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Projects
              </label>
              <input
                type="text"
                id="search"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-amber-500 dark:focus:ring-purple-500 focus:border-transparent transition duration-200"
                placeholder="Search by title, description, or author..."
              />
            </div>

            {/* Course Filter */}
            <div>
              <label htmlFor="course" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Course
              </label>
              <select
                id="course"
                value={selectedCourse}
                onChange={(e) => handleCourseChange(e.target.value)}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 dark:focus:ring-purple-500 focus:border-transparent transition duration-200"
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
              <label htmlFor="topic" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Topic
              </label>
              <select
                id="topic"
                value={selectedTopic}
                onChange={(e) => handleTopicChange(e.target.value)}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 dark:focus:ring-purple-500 focus:border-transparent transition duration-200"
              >
                {topics.map(topic => (
                  <option key={topic} value={topic}>
                    {topic === 'all' ? 'All Topics' : topic}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div>
              <label htmlFor="sort" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort
              </label>
              <select
                id="sort"
                value={sortOption}
                onChange={(e) => handleSortChange(e.target.value)}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 dark:focus:ring-purple-500 focus:border-transparent transition duration-200"
              >
                <option value="none">Default</option>
                <option value="name_asc">Name (A → Z)</option>
                <option value="name_desc">Name (Z → A)</option>
                <option value="date_new">Date (Newest First)</option>
                <option value="date_old">Date (Oldest First)</option>
                <option value="rating_high">Highest Rated</option>
                {user?.admin === 1 && <option value="updated_new">Last Edited</option>}
              </select>
            </div>

            {/* Approval Status Filter (Admin Only) */}
            {user?.admin === 1 && (
              <div>
                <label htmlFor="approval" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  id="approval"
                  value={selectedApprovalStatus}
                  onChange={(e) => handleApprovalStatusChange(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 dark:focus:ring-purple-500 focus:border-transparent transition duration-200"
                >
                  <option value="all">All Projects</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending Approval</option>
                </select>
              </div>
            )}
          </div>

          {/* Filter Actions */}
          <div className="mt-4 flex justify-between items-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredProjects.length} of {projects.length} projects
            </p>
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition duration-200"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 text-lg">Loading projects...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 text-lg">No projects found matching your criteria.</p>
            <button
              onClick={handleReset}
              className="mt-4 px-6 py-2 bg-amber-500 dark:bg-purple-600 text-white rounded-lg font-medium hover:bg-amber-600 dark:hover:bg-purple-700 transition duration-200"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                showApproveButton={user?.admin === 1}
                onApprove={handleApprove}
                variant="default"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ExploreProjectsPage
