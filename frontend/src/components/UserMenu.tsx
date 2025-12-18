import { useNavigate } from 'react-router-dom'

interface User {
  id: number
  username: string
  email: string
  admin?: number
  is_student?: number
}

interface UserMenuProps {
  user: User | null
  onLogout: () => void
}

function UserMenu({ user, onLogout }: UserMenuProps) {
  const navigate = useNavigate()

  return (
    <div className="flex gap-3">
      {user ? (
        <>
          <button
            onClick={() => navigate(`/profile/${user.username}`)}
            className="p-3 sm:px-6 sm:py-3 border border-gray-600 rounded-lg text-gray-300 font-medium hover:bg-gray-700 transition duration-200 inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="hidden sm:inline">{user.username}</span>
          </button>
          <button
            onClick={onLogout}
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
          className="p-3 sm:px-6 sm:py-3 border border-gray-600 rounded-lg text-gray-300 font-medium hover:bg-gray-700 transition duration-200 inline-flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          <span className="hidden sm:inline">Login</span>
        </button>
      )}
      {user && (user.is_student === 1 || user.admin === 1) && (
        <button
          onClick={() => navigate('/upload')}
          className="p-3 sm:px-6 sm:py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition duration-200 inline-flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">Upload Project</span>
        </button>
      )}
    </div>
  )
}

export default UserMenu
