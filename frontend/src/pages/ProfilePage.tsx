import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import axios from 'axios'
import ProjectCard from '../components/ProjectCard'
import ReportModal from '../components/ReportModal'
import Toast from '../components/Toast'
import ConfirmDialog from '../components/ConfirmDialog'

interface User {
  id: number
  username: string
  email: string
  full_name?: string
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
  profile_link?: string
  profile_visibility?: string
  flags?: Array<{ id: number; reason?: string; flagged_by?: number; flagged_by_username?: string; created_at?: string }>
}

interface CurrentUser {
  id: number
  username: string
  admin?: number
}

function ProfilePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { username } = useParams<{ username: string }>()

  const fromBookmarks = location.state?.fromBookmarks || false
  const fromProfile = location.state?.fromProfile || false
  const previousProfileUsername = location.state?.profileUsername || null
  const fromAdminUsers = location.state?.fromAdminUsers || false
  const fromProject = location.state?.fromProject || false
  const projectId = location.state?.projectId || null

  const [user, setUser] = useState<User | null>(null)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [userProjects, setUserProjects] = useState<any[]>([])
  const [pendingProjects, setPendingProjects] = useState<any[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [editedUser, setEditedUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [uploadingPicture, setUploadingPicture] = useState(false)
  const [hoveredAvatar, setHoveredAvatar] = useState(false)
  const [showFlagDetails, setShowFlagDetails] = useState(false)
  const [profilePicVersion, setProfilePicVersion] = useState(Date.now())
  const [showReportModal, setShowReportModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showAccountInfoModal, setShowAccountInfoModal] = useState(false)
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false)
  const [showChangeEmailModal, setShowChangeEmailModal] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [changePasswordData, setChangePasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [changeEmailData, setChangeEmailData] = useState({
    password: '',
    newEmail: ''
  })
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isOwnProfile = currentUser && user && currentUser.id === user.id

  const handleBackNavigation = () => {
    if (fromAdminUsers) {
      navigate('/admin/users')
      return
    }
    if (fromProject && projectId) {
      navigate(`/project/${projectId}`)
    } else if (fromBookmarks) {
      navigate('/bookmarks')
    } else if (fromProfile && previousProfileUsername) {
      navigate(`/profile/${previousProfileUsername}`)
    } else {
      navigate('/explore')
    }
  }

  const getBackButtonText = () => {
    if (fromAdminUsers) return 'Back to Manage Users'
    if (fromProject) return 'Back to Project'
    if (fromBookmarks) return 'Back to Bookmarks'
    if (fromProfile) return 'Back to Profile'
    return 'Back to Explore'
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setNotFound(false)

      try {
        // get current logged-in user (if any)
        const token = localStorage.getItem('token')
        let meUser: any = null
        if (token) {
          try {
            const meResponse = await axios.get('/api/me', {
              headers: { Authorization: `Bearer ${token}` }
            })
            if (meResponse.data.success) {
              meUser = meResponse.data.user
              setCurrentUser(meUser)
            }
          } catch {
            // user not logged in or token invalid -> okay for viewing profiles
            localStorage.removeItem('token')
          }
        }

        // fetch profile by username
        const userResponse = await axios.get(`/api/users/profile/${username}`)

        if (userResponse.data.success) {
          const userData = userResponse.data.user
          
          // If viewing own profile, merge with meUser data to get email and full_name
          if (meUser && meUser.id === userData.id) {
            userData.email = meUser.email
            userData.full_name = meUser.full_name
          }
          
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

          // pending projects on profile (only visible to profile owner)
          if (meUser && meUser.id === userData.id) {
            const token = localStorage.getItem('token')
            if (token) {
              try {
                const pendingResp = await axios.get('/api/my-projects/pending', {
                  headers: { Authorization: `Bearer ${token}` }
                })
                if (pendingResp.data.success) {
                  const pending = pendingResp.data.data
                  const pendingWithCourses = await Promise.all(
                    pending.map(async (project: any) => {
                      try {
                        const courseResponse = await axios.get(`/api/projects/${project.id}/course`)
                        if (courseResponse.data.success) {
                          return { ...project, course: courseResponse.data.course.name }
                        }
                      } catch {
                        console.error('Failed to fetch course for pending project ID:', project.id)
                      }
                      return { ...project, course: 'Uncategorized' }
                    })
                  )
                  setPendingProjects(pendingWithCourses)
                }
              } catch (e) {
                console.error('Failed to fetch pending projects:', e)
              }
            }
          }
        } else {
          setNotFound(true)
        }
      } catch (error: any) {
        console.error('Failed to fetch user data:', error)
        if (error.response?.status === 404) {
          setNotFound(true)
        } else {
          console.error('Error response:', error.response?.data)
        }
      } finally {
        setLoading(false)
      }
    }

    if (username) {
      fetchData()
    }
  }, [username])

  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setToast({ message: 'Please select a valid image file (PNG, JPG, JPEG, GIF, or WebP)', type: 'warning' })
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setToast({ message: 'File size must be less than 5MB', type: 'warning' })
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
        const userResponse = await axios.get(`/api/users/profile/${username}`)
        if (userResponse.data.success) {
          setUser(userResponse.data.user)
          setEditedUser(userResponse.data.user)
          setProfilePicVersion(Date.now()) // update version to bust cache
        }
      }
    } catch (error: any) {
      console.error('Failed to upload profile picture:', error)
      setToast({ message: error.response?.data?.message || 'Failed to upload profile picture', type: 'error' })
    } finally {
      setUploadingPicture(false)
    }
  }

  const handleProfilePictureDelete = async () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Profile Picture',
      message: 'Are you sure you want to remove your profile picture?',
      onConfirm: confirmDeleteProfilePicture
    })
  }

  const confirmDeleteProfilePicture = async () => {
    setConfirmDialog(null)
    setUploadingPicture(true)

    try {
      const token = localStorage.getItem('token')
      const response = await axios.delete('/api/me/profile-picture', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        // Refresh user data
        const userResponse = await axios.get(`/api/users/profile/${username}`)
        if (userResponse.data.success) {
          setUser(userResponse.data.user)
          setEditedUser(userResponse.data.user)
          setProfilePicVersion(Date.now()) // update version to bust cache
        }
      }
    } catch (error: any) {
      console.error('Failed to delete profile picture:', error)
      setToast({ message: error.response?.data?.message || 'Failed to delete profile picture', type: 'error' })
    } finally {
      setUploadingPicture(false)
    }
  }

  const handleSaveChanges = async () => {
    if (editedUser) {
      try {
        const token = localStorage.getItem('token')
        await axios.put('/api/me', {
          username: editedUser.username,
          full_name: editedUser.full_name || '',
          bio: editedUser.bio || '',
          is_student: editedUser.is_student,
          semester: editedUser.semester || '',
          study_programme: editedUser.study_programme || '',
          organization: editedUser.organization || '',
          profile_link: editedUser.profile_link || '',
          profile_visibility: editedUser.profile_visibility || 'public'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        })

        // Update user state with all fields including profile_visibility
        const updatedUser = { ...editedUser }
        setUser(updatedUser)
        
        // Exit edit mode first
        setIsEditing(false)
        
        // if username changed, navigate to new profile URL
        if (editedUser.username !== username) {
          navigate(`/profile/${editedUser.username}`, { replace: true })
        }
      } catch (error: any) {
        console.error('Failed to update profile:', error)
        console.error('Error response:', error.response?.data)
        setToast({ message: 'Failed to update profile: ' + (error.response?.data?.message || 'Unknown error'), type: 'error' })
      }
    }
  }

  const handleChangePassword = async () => {
    // Validate inputs
    if (!changePasswordData.currentPassword || !changePasswordData.newPassword || !changePasswordData.confirmPassword) {
      setToast({ message: 'Please fill in all fields', type: 'warning' })
      return
    }

    if (changePasswordData.newPassword !== changePasswordData.confirmPassword) {
      setToast({ message: 'New passwords do not match', type: 'warning' })
      return
    }

    if (changePasswordData.newPassword.length < 8) {
      setToast({ message: 'Password must be at least 8 characters', type: 'warning' })
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await axios.post('/api/me/change-password', {
        current_password: changePasswordData.currentPassword,
        new_password: changePasswordData.newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setToast({ message: 'Password changed successfully', type: 'success' })
        setShowChangePasswordModal(false)
        setChangePasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      }
    } catch (error: any) {
      console.error('Failed to change password:', error)
      setToast({ message: error.response?.data?.message || 'Failed to change password', type: 'error' })
    }
  }

  const handleChangeEmail = async () => {
    // Validate inputs
    if (!changeEmailData.password || !changeEmailData.newEmail) {
      setToast({ message: 'Please fill in all fields', type: 'warning' })
      return
    }

    // Basic email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(changeEmailData.newEmail)) {
      setToast({ message: 'Please enter a valid email address', type: 'warning' })
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await axios.post('/api/me/change-email', {
        password: changeEmailData.password,
        new_email: changeEmailData.newEmail
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setToast({ message: 'Email changed successfully', type: 'success' })
        setShowChangeEmailModal(false)
        setChangeEmailData({ password: '', newEmail: '' })
        
        // Refresh user data to show new email
        const meResponse = await axios.get('/api/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (meResponse.data.success && user) {
          const updatedUser = { ...user, email: meResponse.data.user.email }
          setUser(updatedUser)
        }
      }
    } catch (error: any) {
      console.error('Failed to change email:', error)
      setToast({ message: error.response?.data?.message || 'Failed to change email', type: 'error' })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-gray-600 dark:text-gray-400 text-lg">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (notFound || !user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">User Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">The user "{username}" does not exist.</p>
          <button
            onClick={handleBackNavigation}
            className="px-6 py-3 bg-amber-500 dark:bg-purple-600 text-white rounded-lg font-medium hover:bg-amber-600 dark:hover:bg-purple-700 transition duration-200"
          >
            {getBackButtonText()}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 relative">
          <button
            onClick={handleBackNavigation}
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="inline sm:hidden">Back</span>
            <span className="hidden sm:inline">{getBackButtonText()}</span>
          </button>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white mx-auto absolute left-1/2 sm:static transform -translate-x-1/2 sm:transform-none scale-105 sm:scale-100">
            {isOwnProfile ? 'My Profile' : `${user.username}'s Profile`}
          </h1>
          <div className="flex gap-3">
            {isOwnProfile && (
              <>
                <button
                  onClick={() => setShowAccountInfoModal(true)}
                  className="p-2 sm:px-6 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition duration-200 inline-flex items-center gap-2"
                  title="View account info"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                  <span className="hidden lg:inline">Account Info</span>
                </button>
                <button
                  onClick={() => {
                    if (isEditing) {
                      // Cancel editing - restore original user data
                      setEditedUser(user)
                    }
                    setIsEditing(!isEditing)
                  }}
                  className="p-2 sm:px-6 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition duration-200 inline-flex items-center gap-2"
                  title={isEditing ? 'Cancel' : 'Edit profile'}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span className="hidden lg:inline">{isEditing ? 'Cancel' : 'Edit Profile'}</span>
                </button>
                {user.is_student === 1 && (
                  <button
                    onClick={() => navigate('/upload', { state: { fromProfile: true, profileUsername: user?.username } })}
                    className="p-2 sm:px-6 sm:py-3 bg-amber-500 dark:bg-purple-600 text-white rounded-lg font-medium hover:bg-amber-600 dark:hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 dark:focus:ring-purple-500 transition duration-200 inline-flex items-center gap-2"
                    title="Upload project"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="hidden lg:inline">Upload Project</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 sm:p-8 border border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar - Hidden for private profiles when not owner */}
            {(!user.profile_visibility || user.profile_visibility !== 'private' || isOwnProfile) && (
              <div className="w-full sm:w-auto flex flex-col items-start gap-2 mb-4 sm:mb-0">
                <div
                  className={`relative w-36 h-36 sm:w-32 sm:h-32 rounded-full overflow-hidden ${isOwnProfile ? 'group cursor-pointer' : ''}`}
                  onMouseEnter={() => isOwnProfile && setHoveredAvatar(true)}
                  onMouseLeave={() => setHoveredAvatar(false)}
                  onClick={() => isOwnProfile && fileInputRef.current?.click()}
              >
                {user.profile_picture ? (
                  <>
                    <img
                      src={`/${user.profile_picture}?v=${profilePicVersion}`}
                      alt={user.username}
                      className="w-full h-full object-cover"
                    />
                    {isOwnProfile && hoveredAvatar && (
                      <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center gap-2">
                        <span
                          className="cursor-pointer flex flex-col items-center"
                          onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                        >
                          <svg className="w-6 h-6 text-white hover:text-amber-500 dark:hover:text-purple-400 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    {isOwnProfile && hoveredAvatar && (
                      <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                        <span
                          className="cursor-pointer flex flex-col items-center"
                          onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                        >
                          <svg className="w-8 h-8 text-white hover:text-amber-500 dark:hover:text-purple-400 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                {isOwnProfile && (
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                    onChange={handleProfilePictureUpload}
                    className="hidden"
                    disabled={uploadingPicture}
                  />
                )}
              </div>
            </div>
            )}

            {/* User Info */}
            <div className="w-full flex-1">
              {/* Check visibility restrictions */}
              {!isOwnProfile && user.profile_visibility === 'private' ? (
                // Private Profile View - Only username visible
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{user.username}</h2>
                  <p className="text-gray-600 dark:text-gray-400 text-lg">This profile is private</p>
                </div>
              ) : !isOwnProfile && user.profile_visibility === 'logged_in' && !currentUser ? (
                // Logged In Only View - Not authenticated
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-amber-500 dark:text-purple-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{user.username}</h2>
                  <p className="text-gray-600 dark:text-gray-400 text-lg">
                    <span 
                      onClick={() => navigate('/login')}
                      className="text-amber-500 dark:text-purple-400 hover:text-amber-600 dark:hover:text-purple-300 underline cursor-pointer"
                    >
                      Log in
                    </span>
                    {' '}to see this profile
                  </p>
                </div>
              ) : isEditing && isOwnProfile ? (
                // Edit Mode
                <div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Username</label>
                    <input
                      type="text"
                      value={editedUser?.username || ''}
                      onChange={(e) => setEditedUser(prev => prev ? {...prev, username: e.target.value} : null)}
                      className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-purple-500"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Full Name (optional)</label>
                    <input
                      type="text"
                      value={editedUser?.full_name || ''}
                      onChange={(e) => setEditedUser(prev => prev ? {...prev, full_name: e.target.value} : null)}
                      className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-purple-500"
                      placeholder="Your full name"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Bio</label>
                    <textarea
                      value={editedUser?.bio || ''}
                      onChange={(e) => setEditedUser(prev => prev ? {...prev, bio: e.target.value} : null)}
                      rows={4}
                      className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-purple-500"
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                  {editedUser?.is_student === 1 && (
                    <>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Semester</label>
                        <input
                          type="text"
                          value={editedUser?.semester || ''}
                          onChange={(e) => setEditedUser(prev => prev ? {...prev, semester: e.target.value} : null)}
                          className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-purple-500"
                          placeholder="e.g., 1, 2, 3..."
                        />
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Study Programme</label>
                        <input
                          type="text"
                          value={editedUser?.study_programme || ''}
                          onChange={(e) => setEditedUser(prev => prev ? {...prev, study_programme: e.target.value} : null)}
                          className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-purple-500"
                          placeholder="e.g., Computer Science"
                        />
                      </div>
                    </>
                  )}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Organization</label>
                    <input
                      type="text"
                      value={editedUser?.organization || ''}
                      onChange={(e) => setEditedUser(prev => prev ? {...prev, organization: e.target.value} : null)}
                      className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-purple-500"
                      placeholder="e.g., University Name"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Profile Link</label>
                    <input
                      type="url"
                      value={editedUser?.profile_link || ''}
                      onChange={(e) => setEditedUser(prev => prev ? {...prev, profile_link: e.target.value} : null)}
                      className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-purple-500"
                      placeholder="https://example.com"
                    />
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Profile Visibility</label>
                    <select
                      value={editedUser?.profile_visibility || 'public'}
                      onChange={(e) => setEditedUser(prev => prev ? {...prev, profile_visibility: e.target.value} : null)}
                      className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-purple-500"
                    >
                      <option value="public">Public - Everyone can see</option>
                      <option value="logged_in">Logged In Users Only</option>
                      <option value="private">Private - Only username visible</option>
                    </select>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      {editedUser?.profile_visibility === 'private' && 'Private profiles only show your username to other users'}
                      {editedUser?.profile_visibility === 'logged_in' && 'Only logged in users can see your full profile'}
                      {(!editedUser?.profile_visibility || editedUser?.profile_visibility === 'public') && 'Everyone can see your profile'}
                    </p>
                  </div>
                  <button
                    onClick={handleSaveChanges}
                    className="px-6 py-3 bg-amber-500 dark:bg-purple-600 text-white rounded-lg font-medium hover:bg-amber-600 dark:hover:bg-purple-700 transition duration-200"
                  >
                    Save Changes
                  </button>
                </div>
              ) : (
                // View Mode
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{user.username}</h2>
                      {isOwnProfile && (
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          user.profile_visibility === 'private' 
                            ? 'bg-gray-300 text-gray-700 border border-gray-400 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600' 
                            : user.profile_visibility === 'logged_in'
                            ? 'bg-amber-100 text-amber-700 border border-amber-400 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-600'
                            : 'bg-lime-100 text-lime-700 border border-lime-400 dark:bg-green-900/30 dark:text-green-400 dark:border-green-600'
                        }`}>
                          <svg className="w-3 h-3 inline-block mr-1 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {user.profile_visibility === 'private' ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            ) : user.profile_visibility === 'logged_in' ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            )}
                          </svg>
                          {user.profile_visibility === 'private' ? 'Private' : user.profile_visibility === 'logged_in' ? 'Logged In' : 'Public'}
                        </span>
                      )}
                    </div>
                    {!isOwnProfile && currentUser && currentUser.admin !== 1 && (
                      <button
                        onClick={() => setShowReportModal(true)}
                        className="px-4 py-2 border border-red-600 rounded-lg text-red-400 hover:bg-red-900 hover:bg-opacity-20 transition duration-200 flex items-center gap-2"
                        title="Report user"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="text-sm font-medium">Report User</span>
                      </button>
                    )}
                  </div>

                  {/* Full Name */}
                  {user.full_name && (
                    <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">{user.full_name}</p>
                  )}

                  {/* Flag banner */}
                  {user.flags && user.flags.length > 0 && (
                    <div className="mb-4 border border-red-500 rounded-lg overflow-hidden">
                      <div className="px-4 py-3 bg-red-900/40 border-l-4 border-red-500 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <div>
                            <p className="text-red-200 font-semibold">User Flagged</p>
                            <p className="text-sm text-red-300">This user has {user.flags.length} active {user.flags.length === 1 ? 'flag' : 'flags'}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setShowFlagDetails(s => !s)} 
                          className="px-3 py-1 text-sm bg-red-700 hover:bg-red-600 text-white rounded transition-colors duration-200"
                        >
                          {showFlagDetails ? 'Hide Details' : 'View Details'}
                        </button>
                      </div>
                      {showFlagDetails && (
                        <div className="bg-gray-800/50 p-4 space-y-3">
                          {user.flags.map((f) => (
                            <div key={f.id} className="bg-gray-700/50 rounded-lg p-3 border border-gray-600">
                              <div className="flex items-start gap-2 mb-2">
                                <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div className="flex-1">
                                  <p className="text-sm text-gray-200 font-medium mb-1">Reason:</p>
                                  <p className="text-sm text-gray-300">{f.reason || 'No reason provided'}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-400 mt-2 pt-2 border-t border-gray-600">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span>Flagged by: {f.flagged_by_username || 'Admin'}</span>
                                <span className="mx-1">•</span>
                                <span>{f.created_at ? new Date(f.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown date'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* User Type Tags */}
                  <div className="mb-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-amber-500 dark:text-purple-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">User Info</h3>
                        <div className="flex flex-wrap gap-2">
                          {user.admin === 1 && (
                            <span className="px-3 py-1 bg-red-600 text-white text-sm rounded-full">Admin</span>
                          )}
                    {user.is_student === 1 ? (
                      <>
                        <span className="px-3 py-1 bg-amber-500 dark:bg-blue-600 text-white text-sm rounded-full">Student</span>
                        {user.semester && (
                          <span className="px-3 py-1 bg-orange-500 dark:bg-indigo-600 text-white text-sm rounded-full">Semester {user.semester}</span>
                        )}
                        {user.study_programme && (
                          <span className="px-3 py-1 bg-yellow-600 dark:bg-violet-600 text-white text-sm rounded-full">{user.study_programme}</span>
                        )}
                      </>
                    ) : (
                      <span className="px-3 py-1 bg-amber-500 dark:bg-blue-600 text-white text-sm rounded-full">Non-Student</span>
                    )}
                          {user.organization && (
                            <span className={`px-3 py-1 ${user.is_student === 1 ? 'bg-amber-500 dark:bg-purple-600' : 'bg-blue-500 dark:bg-indigo-600'} text-white text-sm rounded-full`}>{user.organization}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  {user.bio && (
                    <div className="mb-6">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-amber-500 dark:text-purple-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">Bio</h3>
                          <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{user.bio}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Profile Link */}
                  {user.profile_link && (
                    <div className="mb-6">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-amber-500 dark:text-purple-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">Profile Link</h3>
                          <a href={user.profile_link} target="_blank" rel="noopener noreferrer" className="text-amber-500 dark:text-purple-400 hover:text-amber-600 dark:hover:text-purple-300 underline break-all">
                            {user.profile_link}
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  {user.is_student === 1 ? (
                    <div className="mb-4">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-amber-500 dark:text-purple-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">Statistics</h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5 text-amber-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-gray-600 dark:text-gray-400 text-sm">Member Since</p>
                        </div>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : 'N/A'}
                        </p>
                      </div>
                      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5 text-amber-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          <p className="text-gray-600 dark:text-gray-400 text-sm">Projects</p>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{userProjects.length}</p>
                      </div>
                      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5 text-amber-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                          <p className="text-gray-600 dark:text-gray-400 text-sm">Total Ratings</p>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{user.total_ratings || 0}</p>
                      </div>
                      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5 text-amber-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                          <p className="text-gray-600 dark:text-gray-400 text-sm">Avg. Rating</p>
                        </div>
                        <p className="text-2xl font-bold text-amber-500 dark:text-purple-400">{user.average_rating ? user.average_rating.toFixed(1) : '0.0'}</p>
                      </div>
                    </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-amber-500 dark:text-purple-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">Statistics</h3>
                          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 inline-block">
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="w-5 h-5 text-amber-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <p className="text-gray-600 dark:text-gray-400 text-sm">Member Since</p>
                            </div>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                              {user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Report prompt for non-logged-in users */}
              {!isOwnProfile && !currentUser && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => navigate('/login')}
                    className="text-gray-600 dark:text-gray-400 hover:text-red-400 text-sm transition duration-200 inline-flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Log in to report user
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Projects Section - Only for Students and accessible profiles */}
        {user && user.is_student === 1 && (isOwnProfile || (user.profile_visibility !== 'private' && (user.profile_visibility !== 'logged_in' || currentUser))) && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <svg className="w-6 h-6 text-amber-500 dark:text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isOwnProfile ? 'My Projects' : `${user.username}'s Projects`}
              </h2>
            </div>

            {userProjects.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">No projects yet</p>
                {isOwnProfile && (
                  <button
                    onClick={() => navigate('/upload', { state: { fromProfile: true, profileUsername: user?.username } })}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition duration-200"
                  >
                    Upload Your First Project
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    variant="profile"
                    fromProfile={true}
                    profileUsername={user?.username}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pending Projects */}
        {isOwnProfile && pendingProjects && pendingProjects.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 border border-yellow-600 mt-6">
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-6 h-6 text-amber-500 dark:text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-2xl font-bold text-yellow-600 dark:text-yellow-300">Pending Projects</h2>
            </div>
            <div className="text-gray-600 dark:text-gray-400 mb-4">Projects awaiting admin approval. Only you can view these.</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingProjects.map((project) => (
                <ProjectCard
                  key={`pending-${project.id}`}
                  project={project}
                  variant="default"
                  fromProfile={true}
                  profileUsername={user?.username}
                  showBookmarkButton={false}
                />
              ))}
            </div>
          </div>
        )}

        {/* Delete account (self) */}
        {isOwnProfile && user && user.admin !== 1 && (
          <div className="mt-6">
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition duration-200"
            >
              Delete Account
            </button>
          </div>
        )}

        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Confirm account deletion</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Enter your password to confirm deletion. This action is irreversible.</p>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Password"
                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white mb-4"
              />
              <div className="flex justify-end gap-3">
                <button onClick={() => { setShowDeleteModal(false); setDeletePassword('') }} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg">Cancel</button>
                <button
                  onClick={async () => {
                    if (!deletePassword) {
                      setToast({ message: 'Please enter your password', type: 'warning' })
                      return
                    }
                    setDeleting(true)
                    try {
                      const token = localStorage.getItem('token')
                      const response = await axios.delete('/api/account', { data: { password: deletePassword }, headers: { Authorization: `Bearer ${token}` } })
                      if (response.data.success) {
                        localStorage.removeItem('token')
                        navigate('/login')
                      } else {
                        setToast({ message: response.data.message || 'Failed to delete account', type: 'error' })
                      }
                    } catch (err: any) {
                      setToast({ message: err.response?.data?.message || 'Failed to delete account', type: 'error' })
                    } finally {
                      setDeleting(false)
                      setShowDeleteModal(false)
                      setDeletePassword('')
                    }
                  }}
                  className="px-4 py-2 bg-red-700 text-white rounded-lg"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admin delete user (doesn't require user password) */}
        {currentUser?.admin === 1 && user && !isOwnProfile && user.admin !== 1 && (
          <div className="mt-4">
            <button
              onClick={() => {
                setConfirmDialog({
                  isOpen: true,
                  title: 'Delete User',
                  message: `Delete user ${user.username}? This cannot be undone.`,
                  onConfirm: async () => {
                    setConfirmDialog(null)
                    try {
                      const token = localStorage.getItem('token')
                      const response = await axios.delete(`/api/users/${user.id}`, { headers: { Authorization: `Bearer ${token}` } })
                      if (response.data.success) {
                        setToast({ message: 'User deleted', type: 'success' })
                        if (fromAdminUsers) navigate('/admin/users')
                        else navigate('/explore')
                      } else {
                        setToast({ message: response.data.message || 'Failed to delete user', type: 'error' })
                      }
                    } catch (err: any) {
                      setToast({ message: err.response?.data?.message || 'Failed to delete user', type: 'error' })
                    }
                  }
                })
              }}
              className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition duration-200"
            >
              Delete User
            </button>
          </div>
        )}
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        reportType="user"
        reportedId={user.id}
        reportedName={user.username}
      />

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
          type="danger"
        />
      )}

      {/* Account Information Modal */}
      {showAccountInfoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <svg className="w-6 h-6 text-amber-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                  Account Information
                </h2>
                <button
                  onClick={() => setShowAccountInfoModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-amber-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">Email</span>
                    </div>
                    <button
                      onClick={() => {
                        setShowAccountInfoModal(false)
                        setShowChangeEmailModal(true)
                      }}
                      className="px-3 py-1 text-xs bg-amber-500 dark:bg-purple-600 text-white rounded hover:bg-amber-600 dark:hover:bg-purple-700 transition"
                    >
                      Change
                    </button>
                  </div>
                  <p className="text-gray-900 dark:text-white font-medium ml-8">{user.email}</p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-amber-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">Password</span>
                    </div>
                    <button
                      onClick={() => {
                        setShowAccountInfoModal(false)
                        setShowChangePasswordModal(true)
                      }}
                      className="px-3 py-1 text-xs bg-amber-500 dark:bg-purple-600 text-white rounded hover:bg-amber-600 dark:hover:bg-purple-700 transition"
                    >
                      Change
                    </button>
                  </div>
                  <p className="text-gray-900 dark:text-white font-medium ml-8">••••••••••••</p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-3 mb-2">
                    <svg className="w-5 h-5 text-amber-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">Username</span>
                  </div>
                  <p className="text-gray-900 dark:text-white font-medium ml-8">{user.username}</p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-3 mb-2">
                    <svg className="w-5 h-5 text-amber-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">Member Since</span>
                  </div>
                  <p className="text-gray-900 dark:text-white font-medium ml-8">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="mt-6 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    This information is private and only visible to you.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowAccountInfoModal(false)}
                  className="px-6 py-2 bg-amber-500 dark:bg-purple-600 text-white rounded-lg font-medium hover:bg-amber-600 dark:hover:bg-purple-700 transition duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <svg className="w-6 h-6 text-amber-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Change Password
                </h2>
                <button
                  onClick={() => {
                    setShowChangePasswordModal(false)
                    setChangePasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={changePasswordData.currentPassword}
                    onChange={(e) => setChangePasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-purple-500"
                    placeholder="Enter current password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={changePasswordData.newPassword}
                    onChange={(e) => setChangePasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-purple-500"
                    placeholder="Enter new password (min 8 characters)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={changePasswordData.confirmPassword}
                    onChange={(e) => setChangePasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-purple-500"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowChangePasswordModal(false)
                    setChangePasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                  }}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangePassword}
                  className="px-6 py-2 bg-amber-500 dark:bg-purple-600 text-white rounded-lg font-medium hover:bg-amber-600 dark:hover:bg-purple-700 transition duration-200"
                >
                  Change Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Email Modal */}
      {showChangeEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <svg className="w-6 h-6 text-amber-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Change Email
                </h2>
                <button
                  onClick={() => {
                    setShowChangeEmailModal(false)
                    setChangeEmailData({ password: '', newEmail: '' })
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      Current email: <strong>{user.email}</strong>
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    New Email
                  </label>
                  <input
                    type="email"
                    value={changeEmailData.newEmail}
                    onChange={(e) => setChangeEmailData(prev => ({ ...prev, newEmail: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-purple-500"
                    placeholder="Enter new email address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={changeEmailData.password}
                    onChange={(e) => setChangeEmailData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-purple-500"
                    placeholder="Enter your password to confirm"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowChangeEmailModal(false)
                    setChangeEmailData({ password: '', newEmail: '' })
                  }}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangeEmail}
                  className="px-6 py-2 bg-amber-500 dark:bg-purple-600 text-white rounded-lg font-medium hover:bg-amber-600 dark:hover:bg-purple-700 transition duration-200"
                >
                  Change Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfilePage
