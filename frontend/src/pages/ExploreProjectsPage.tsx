import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { dummyProjects } from '../data/dummyData'

interface Project {
  id: number
  title: string
  description: string
  course: string
  topic: string[]
  authors: string[]
  uploadDate: string
  fileName: string
}

function ExploreProjectsPage() {
  const navigate = useNavigate()
  const [projects] = useState<Project[]>(dummyProjects)
  const [filteredProjects, setFilteredProjects] = useState<Project[]>(dummyProjects)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCourse, setSelectedCourse] = useState<string>('all')
  const [selectedTopic, setSelectedTopic] = useState<string>('all')

  // Extract courses and topics from existing projects
  const courses = ['all', ...Array.from(new Set(projects.map(p => p.course)))]
  const topics = ['all', ...Array.from(new Set(projects.flatMap(p => p.topic)))]

  // Filter projects based on search and filters
  const handleFilter = (search: string, course: string, topic: string) => {
    let filtered = projects

    // Filter by search query
    if (search) {
      filtered = filtered.filter(project =>
        project.title.toLowerCase().includes(search.toLowerCase()) ||
        project.description.toLowerCase().includes(search.toLowerCase()) ||
        project.authors.some(author => author.toLowerCase().includes(search.toLowerCase()))
      )
    }

    // Filter by course
    if (course !== 'all') {
      filtered = filtered.filter(project => project.course === course)
    }

    // Filter by topic
    if (topic !== 'all') {
      filtered = filtered.filter(project => project.topic.includes(topic))
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

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Top Navigation Bar */}
        <div className="flex justify-end gap-3 mb-8">
          <button
            onClick={() => navigate('/profile')}
            className="px-6 py-3 border border-gray-600 rounded-lg text-gray-300 font-medium hover:bg-gray-700 transition duration-200 inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            View Profile
          </button>
          <button
            onClick={() => navigate('/upload')}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition duration-200 inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload Project
          </button>
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
        {filteredProjects.length === 0 ? (
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
                  <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">
                    {project.title}
                  </h3>

                  {/* Course and Topic Tags */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-purple-900 text-purple-200">
                      {project.course}
                    </span>
                    {Array.isArray(project.topic) ? (
                      project.topic.map((t, index) => (
                        <span key={index} className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-fuchsia-900 text-fuchsia-200">
                          {t}
                        </span>
                      ))
                    ) : (
                      <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-fuchsia-900 text-fuchsia-200">
                        {project.topic}
                      </span>
                    )}
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
                    <p className="text-sm text-gray-300">{project.authors.join(', ')}</p>
                  </div>

                  {/* Upload Date */}
                  <p className="text-xs text-gray-500 mb-4">
                    Uploaded: {new Date(project.uploadDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button 
                      onClick={() => navigate(`/project/${project.id}`)}
                      className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition duration-200"
                    >
                      View Details
                    </button>
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
