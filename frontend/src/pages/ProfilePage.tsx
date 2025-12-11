import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

interface User {
  id: number
  username: string
  email: string
  bio?: string
  created_at?: string
  total_ratings?: number
  average_rating?: number
}

function ProfilePage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [userProjects, setUserProjects] = useState<any[]>([])  
  const [isEditing, setIsEditing] = useState(false)
  const [editedUser, setEditedUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        navigate('/login')
        return
      }

      try {
        // Fetch current user info
        const userResponse = await axios.get('/api/me', {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (userResponse.data.success) {
          const userData = userResponse.data.user
          setUser(userData)
          setEditedUser(userData)

          // Fetch all projects
          const projectsResponse = await axios.get('/api/projects')
          if (projectsResponse.data.success) {
            // Filter projects where user is an owner
            const allProjects = projectsResponse.data.data
            const ownedProjects = allProjects.filter((project: any) => 
              project.owners.some((owner: any) => owner.id === userData.id)
            )
            
            // Fetch course info for each project
            const projectsWithCourses = await Promise.all(
              ownedProjects.map(async (project: any) => {
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
            
            setUserProjects(projectsWithCourses)
          }
        }
      } catch (error: any) {
        console.error('Failed to fetch user data:', error)
        console.error('Error response:', error.response?.data)
        console.error('Error status:', error.response?.status)
        alert(`Error loading profile: ${error.response?.data?.message || error.message}`)
        navigate('/login')
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-gray-400 text-lg">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Loading...</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => navigate('/explore')}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Explore
          </button>
          <h1 className="text-3xl font-bold text-white absolute left-1/2 transform -translate-x-1/2">Profile</h1>
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (isEditing) {
                  // Cancel editing - restore original user data
                  setEditedUser(user)
                }
                setIsEditing(!isEditing)
              }}
              className="px-6 py-3 border border-gray-600 rounded-lg text-gray-300 font-medium hover:bg-gray-700 transition duration-200 inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </button>
            <button
              onClick={() => navigate('/upload', { state: { fromProfile: true } })}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition duration-200 inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Upload Project
            </button>
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-gray-800 rounded-lg shadow-xl p-8 border border-gray-700 mb-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="w-32 h-32 rounded-full bg-indigo-600 flex items-center justify-center">
                <span className="text-5xl font-bold text-white">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1">
              {isEditing ? (
                // Edit Mode
                <div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-400 mb-2">Username</label>
                    <input
                      type="text"
                      value={editedUser?.username || ''}
                      onChange={(e) => setEditedUser(prev => prev ? {...prev, username: e.target.value} : null)}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                    <input
                      type="email"
                      value={editedUser?.email || ''}
                      onChange={(e) => setEditedUser(prev => prev ? {...prev, email: e.target.value} : null)}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-400 mb-2">Bio</label>
                    <textarea
                      value={editedUser?.bio || ''}
                      onChange={(e) => setEditedUser(prev => prev ? {...prev, bio: e.target.value} : null)}
                      rows={4}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                  <button
                    onClick={async () => {
                      if (editedUser) {
                        try {
                          const token = localStorage.getItem('token')
                          await axios.put('/api/me', {
                            username: editedUser.username,
                            email: editedUser.email,
                            bio: editedUser.bio
                          }, {
                            headers: { Authorization: `Bearer ${token}` }
                          })
                          setUser(editedUser)
                          setIsEditing(false)
                        } catch (error) {
                          console.error('Failed to update profile:', error)
                        }
                      }
                    }}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition duration-200"
                  >
                    Save Changes
                  </button>
                </div>
              ) : (
                // View Mode
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">{user.username}</h2>
                  <p className="text-gray-400 mb-4">{user.email}</p>
                  
                  {/* Bio */}
                  {user.bio && (
                    <p className="text-gray-300 leading-relaxed mb-6 whitespace-pre-line">{user.bio}</p>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-700 rounded-lg p-4">
                      <p className="text-gray-400 text-sm mb-1">Projects</p>
                      <p className="text-2xl font-bold text-white">{userProjects.length}</p>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-4">
                      <p className="text-gray-400 text-sm mb-1">Total Ratings</p>
                      <p className="text-2xl font-bold text-white">{user.total_ratings || 0}</p>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-4">
                      <p className="text-gray-400 text-sm mb-1">Avg Rating</p>
                      <p className="text-2xl font-bold text-purple-400">{user.average_rating ? user.average_rating.toFixed(1) : '0.0'}</p>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-4">
                      <p className="text-gray-400 text-sm mb-1">Member Since</p>
                      <p className="text-lg font-semibold text-white">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Projects Section */}
        <div className="bg-gray-800 rounded-lg shadow-xl p-8 border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-6">My Projects</h2>
          
          {userProjects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg mb-4">No projects yet</p>
              <button
                onClick={() => navigate('/upload')}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition duration-200"
              >
                Upload Your First Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userProjects.map((project) => (
                <div
                  key={project.id}
                  className="bg-gray-700 rounded-lg shadow-lg border border-gray-600 hover:border-purple-500 transition duration-200 overflow-hidden flex flex-col"
                >
                  <div className="p-6 flex flex-col flex-grow">
                    {/* Project Title */}
                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">
                      {project.name}
                    </h3>

                    {/* Course and Topic Tags */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-purple-900 text-purple-200">
                        {project.course}
                      </span>
                      {(project.tags || []).map((tag: string, index: number) => (
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
                      <p className="text-sm text-gray-300">{project.owners.map((o: any) => o.username).join(', ')}</p>
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
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/project/${project.id}`, { state: { fromProfile: true } })}
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
    </div>
  )
}

export default ProfilePage
