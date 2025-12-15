import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import ProjectCard from '../components/ProjectCard'

interface User {
  id: number
  username: string
  email: string
  bio?: string
  created_at?: string
  total_ratings?: number
  average_rating?: number
  is_student?: number
  semester?: string
  study_programme?: string
  organization?: string
  admin?: number
  profile_picture?: string
}

function ProfilePage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [userProjects, setUserProjects] = useState<any[]>([])  
  const [isEditing, setIsEditing] = useState(false)
  const [editedUser, setEditedUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadingPicture, setUploadingPicture] = useState(false)
  const [hoveredAvatar, setHoveredAvatar] = useState(false)
  const [profilePicVersion, setProfilePicVersion] = useState(Date.now())
  const fileInputRef = useRef<HTMLInputElement>(null)

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
        setLoading(false
        )
      }
    }

    fetchUserData()
  }, [])

  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid image file (PNG, JPG, JPEG, GIF, or WebP)')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB')
      return
    }

    setUploadingPicture(true)

    try {
      const token = localStorage.getItem('token')
      const formData = new FormData()
      formData.append('profile_picture', file)

      const response = await axios.post('/api/me/profile-picture', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })

      if (response.data.success) {
        // Refresh user data
        const userResponse = await axios.get('/api/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (userResponse.data.success) {
          setUser(userResponse.data.user)
          setEditedUser(userResponse.data.user)
          setProfilePicVersion(Date.now()) // update version to bust cache
        }
      }
    } catch (error: any) {
      console.error('Failed to upload profile picture:', error)
      alert(error.response?.data?.message || 'Failed to upload profile picture')
    } finally {
      setUploadingPicture(false)
    }
  }

  const handleProfilePictureDelete = async () => {
    if (!confirm('Are you sure you want to remove your profile picture?')) return

    setUploadingPicture(true)

    try {
      const token = localStorage.getItem('token')
      const response = await axios.delete('/api/me/profile-picture', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        // Refresh user data
        const userResponse = await axios.get('/api/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (userResponse.data.success) {
          setUser(userResponse.data.user)
          setEditedUser(userResponse.data.user)
          setProfilePicVersion(Date.now()) // update version to bust cache
        }
      }
    } catch (error: any) {
      console.error('Failed to delete profile picture:', error)
      alert(error.response?.data?.message || 'Failed to delete profile picture')
    } finally {
      setUploadingPicture(false)
    }
  }

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
            {user.is_student === 1 && (
              <button
                onClick={() => navigate('/upload', { state: { fromProfile: true } })}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition duration-200 inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Upload Project
              </button>
            )}
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-gray-800 rounded-lg shadow-xl p-8 border border-gray-700 mb-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0 flex flex-col items-center gap-2">
              <div 
                className="relative w-32 h-32 rounded-full overflow-hidden group cursor-pointer"
                onMouseEnter={() => setHoveredAvatar(true)}
                onMouseLeave={() => setHoveredAvatar(false)}
                onClick={() => fileInputRef.current?.click()}
              >
                {user.profile_picture ? (
                  <>
                    <img 
                      src={`/${user.profile_picture}?v=${profilePicVersion}`} 
                      alt={user.username}
                      className="w-full h-full object-cover"
                    />
                    {hoveredAvatar && (
                      <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center gap-2">
                        <span
                          className="cursor-pointer flex flex-col items-center"
                          onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                        >
                          <svg className="w-6 h-6 text-white hover:text-purple-400 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); handleProfilePictureDelete(); }}
                          disabled={uploadingPicture}
                          className="text-red-400 hover:text-red-300 transition"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="w-full h-full bg-indigo-600 flex items-center justify-center">
                      <span className="text-5xl font-bold text-white">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    {hoveredAvatar && (
                      <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                        <span
                          className="cursor-pointer flex flex-col items-center"
                          onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                        >
                          <svg className="w-8 h-8 text-white hover:text-purple-400 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </span>
                      </div>
                    )}
                  </>
                )}
                {uploadingPicture && (
                  <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  </div>
                )}
                {/* Hidden file input for avatar click */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                  onChange={handleProfilePictureUpload}
                  className="hidden"
                  disabled={uploadingPicture}
                />
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
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-400 mb-2">Bio</label>
                    <textarea
                      value={editedUser?.bio || ''}
                      onChange={(e) => setEditedUser(prev => prev ? {...prev, bio: e.target.value} : null)}
                      rows={4}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                  {editedUser?.is_student === 1 && (
                    <>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-400 mb-2">Semester</label>
                        <input
                          type="text"
                          value={editedUser?.semester || ''}
                          onChange={(e) => setEditedUser(prev => prev ? {...prev, semester: e.target.value} : null)}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="e.g., 1, 2, 3..."
                        />
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-400 mb-2">Study Programme</label>
                        <input
                          type="text"
                          value={editedUser?.study_programme || ''}
                          onChange={(e) => setEditedUser(prev => prev ? {...prev, study_programme: e.target.value} : null)}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="e.g., Computer Science"
                        />
                      </div>
                    </>
                  )}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-400 mb-2">Organization</label>
                    <input
                      type="text"
                      value={editedUser?.organization || ''}
                      onChange={(e) => setEditedUser(prev => prev ? {...prev, organization: e.target.value} : null)}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., University Name"
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
                            bio: editedUser.bio,
                            is_student: editedUser.is_student,
                            semester: editedUser.semester,
                            study_programme: editedUser.study_programme,
                            organization: editedUser.organization
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
                  
                  {/* User Type Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {user.admin === 1 && (
                      <span className="px-3 py-1 bg-red-600 text-white text-sm rounded-full">Admin</span>
                    )}
                    {user.is_student === 1 ? (
                      <>
                        <span className="px-3 py-1 bg-blue-600 text-white text-sm rounded-full">Student</span>
                        {user.semester && (
                          <span className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-full">Semester {user.semester}</span>
                        )}
                        {user.study_programme && (
                          <span className="px-3 py-1 bg-violet-600 text-white text-sm rounded-full">{user.study_programme}</span>
                        )}
                      </>
                    ) : (
                      <span className="px-3 py-1 bg-blue-600 text-white text-sm rounded-full">Non-Student</span>
                    )}
                    {user.organization && (
                      <span className={`px-3 py-1 ${user.is_student === 1 ? 'bg-purple-600' : 'bg-indigo-600'} text-white text-sm rounded-full`}>{user.organization}</span>
                    )}
                  </div>
                  
                  {/* Bio */}
                  {user.bio && (
                    <p className="text-gray-300 leading-relaxed mb-6 whitespace-pre-line">{user.bio}</p>
                  )}

                  {/* Stats */}
                  {user.is_student === 1 ? (
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
                        <p className="text-gray-400 text-sm mb-1">Avg. Rating</p>
                        <p className="text-2xl font-bold text-purple-400">{user.average_rating ? user.average_rating.toFixed(1) : '0.0'}</p>
                      </div>
                      <div className="bg-gray-700 rounded-lg p-4">
                        <p className="text-gray-400 text-sm mb-1">Member Since</p>
                        <p className="text-lg font-semibold text-white">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : 'N/A'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-700 rounded-lg p-4 inline-block">
                      <p className="text-gray-400 text-sm mb-1">Member Since</p>
                      <p className="text-lg font-semibold text-white">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : 'N/A'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Projects Section - Only for Students */}
        {user && user.is_student === 1 && (
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
                  <ProjectCard
                    key={project.id}
                    project={project}
                    variant="profile"
                    fromProfile={true}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ProfilePage
