import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { dummyUser, dummyProjects, updateDummyUser } from '../data/dummyData'

interface User {
  id: number
  name: string
  email: string
  bio: string
  joinDate: string
  projectCount: number
  totalRatings: number
  averageRating: number
  projects: number[]
}

function ProfilePage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [userProjects, setUserProjects] = useState<any[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [editedUser, setEditedUser] = useState<User | null>(null)

  useEffect(() => {
    // Load user data
    setUser(dummyUser)
    setEditedUser(dummyUser)
    // Load user's projects
    const projects = dummyProjects.filter(p => dummyUser.projects.includes(p.id))
    setUserProjects(projects)
  }, [])

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
          <h1 className="text-3xl font-bold text-white">Profile</h1>
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
              onClick={() => navigate('/upload')}
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
                    {/* first letter of the name as avatar */}
                    {/* will update it when i actually implement the media attachment and all that*/}
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1">
              {isEditing ? (
                // Edit Mode
                <div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-400 mb-2">Name</label>
                    <input
                      type="text"
                      value={editedUser?.name || ''}
                      onChange={(e) => setEditedUser(prev => prev ? {...prev, name: e.target.value} : null)}
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
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (editedUser) {
                        setUser(editedUser)
                        updateDummyUser(editedUser)
                      }
                      setIsEditing(false)
                      // TODO: Send update to backend
                    }}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition duration-200"
                  >
                    Save Changes
                  </button>
                </div>
              ) : (
                // View Mode
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">{user.name}</h2>
                  <p className="text-gray-400 mb-4">{user.email}</p>
                  
                  {/* Bio */}
                  <p className="text-gray-300 leading-relaxed mb-6 whitespace-pre-line">{user.bio}</p>

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-gray-700 rounded-lg p-4">
                      <p className="text-gray-400 text-sm mb-1">Projects</p>
                      <p className="text-2xl font-bold text-white">{user.projectCount}</p>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-4">
                      <p className="text-gray-400 text-sm mb-1">Total Ratings</p>
                      <p className="text-2xl font-bold text-white">{user.totalRatings}</p>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-4">
                      <p className="text-gray-400 text-sm mb-1">Avg Rating</p>
                      <p className="text-2xl font-bold text-purple-400">{user.averageRating.toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-4">
                      <p className="text-gray-400 text-sm mb-1">Member Since</p>
                      <p className="text-lg font-semibold text-white">
                        {new Date(user.joinDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {userProjects.map((project) => {
                const topics = Array.isArray(project.topic) ? project.topic : [project.topic]
                
                return (
                  <div
                    key={project.id}
                    className="bg-gray-700 rounded-lg p-6 border border-gray-600 hover:border-indigo-500 transition duration-200 cursor-pointer"
                    onClick={() => navigate(`/project/${project.id}`, { state: { fromProfile: true } })}
                  >
                    <h3 className="text-xl font-bold text-white mb-2">{project.title}</h3>
                    
                    {/* Course Tag */}
                    <div className="mb-3">
                      <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-indigo-900 text-indigo-200">
                        {project.course}
                      </span>
                    </div>

                    {/* Topic Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {topics.map((topic: string, index: number) => (
                        <span key={index} className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-purple-900 text-purple-200">
                          {topic}
                        </span>
                      ))}
                    </div>

                    {/* Description Preview */}
                    <p className="text-gray-300 text-sm mb-4 line-clamp-3">
                      {project.description}
                    </p>

                    {/* Rating */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg
                            key={star}
                            className={`w-4 h-4 ${
                              star <= Math.round(project.rating || 0)
                                ? 'text-purple-400 fill-purple-400'
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
                      <span className="text-sm text-gray-400">
                        {project.rating?.toFixed(1)} ({project.totalRatings} ratings)
                      </span>
                    </div>

                    {/* Upload Date */}
                    <p className="text-xs text-gray-500 mt-3">
                      Uploaded {new Date(project.uploadDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
