import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

type AuthMode = 'login' | 'register'

function LoginPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<AuthMode>('login')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  })

  const [registerData, setRegisterData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    is_student: 1,
    semester: '',
    study_programme: '',
    organization: ''
  })

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setLoginData(prev => ({ ...prev, [name]: value }))
  }

  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setRegisterData(prev => ({ ...prev, [name]: value }))
  }

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const response = await axios.post('/api/login', {
        username: loginData.username,
        password: loginData.password
      })

      if (response.data.success) {
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        setMessage({ type: 'success', text: 'Login successful!' })
        navigate('/explore')
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Login failed. Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (registerData.password !== registerData.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' })
      setLoading(false)
      return
    }

    if (registerData.password.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' })
      setLoading(false)
      return
    }

    try {
      const response = await axios.post('/api/register', {
        username: registerData.username,
        email: registerData.email,
        password: registerData.password,
        is_student: registerData.is_student,
        semester: registerData.is_student === 1 ? registerData.semester : undefined,
        study_programme: registerData.is_student === 1 ? registerData.study_programme : undefined,
        organization: registerData.organization
      })

      if (response.data.success) {
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        setMessage({ type: 'success', text: 'Registration successful!' })
        navigate('/explore')
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Registration failed. Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode)
    setMessage(null)
  }

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <button
          onClick={() => navigate('/explore')}
          className="mb-6 inline-flex items-center gap-2 text-gray-400 hover:text-white transition duration-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Explore
        </button>

        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2">{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h1>
        </div>

        <div className="bg-gray-800 rounded-lg shadow-xl p-8 border border-gray-700">
          <div className="flex mb-6">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 py-2 text-center font-medium transition duration-200 ${
                mode === 'login'
                  ? 'text-white border-b-2 border-purple-500'
                  : 'text-gray-400 border-b border-gray-600 hover:text-gray-300'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`flex-1 py-2 text-center font-medium transition duration-200 ${
                mode === 'register'
                  ? 'text-white border-b-2 border-purple-500'
                  : 'text-gray-400 border-b border-gray-600 hover:text-gray-300'
              }`}
            >
              Register
            </button>
          </div>

          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-6">
              <div>
                <label htmlFor="login-username" className="block text-sm font-medium text-gray-300 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  id="login-username"
                  name="username"
                  required
                  value={loginData.username}
                  onChange={handleLoginChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                  placeholder="Enter your username"
                />
              </div>

              <div>
                <label htmlFor="login-password" className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="login-password"
                  name="password"
                  required
                  value={loginData.password}
                  onChange={handleLoginChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                  placeholder="Enter your password"
                />
              </div>

              {message && (
                <div className={`p-4 rounded-lg ${
                  message.type === 'success'
                    ? 'bg-green-900 text-green-200 border border-green-700'
                    : 'bg-red-900 text-red-200 border border-red-700'
                }`}>
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-6">
              <div>
                <label htmlFor="register-username" className="block text-sm font-medium text-gray-300 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  id="register-username"
                  name="username"
                  required
                  value={registerData.username}
                  onChange={handleRegisterChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                  placeholder="Choose a username"
                />
              </div>

              <div>
                <label htmlFor="register-email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="register-email"
                  name="email"
                  required
                  value={registerData.email}
                  onChange={handleRegisterChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  User Type
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="is_student"
                      checked={registerData.is_student === 1}
                      onChange={() => setRegisterData(prev => ({ ...prev, is_student: 1 }))}
                      className="mr-2"
                    />
                    <span className="text-gray-300">Student</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="is_student"
                      checked={registerData.is_student === 0}
                      onChange={() => setRegisterData(prev => ({ ...prev, is_student: 0, semester: '', study_programme: '' }))}
                      className="mr-2"
                    />
                    <span className="text-gray-300">Non-Student</span>
                  </label>
                </div>
              </div>

              {registerData.is_student === 1 && (
                <>
                  <div>
                    <label htmlFor="register-semester" className="block text-sm font-medium text-gray-300 mb-2">
                      Semester (Optional)
                    </label>
                    <input
                      type="text"
                      id="register-semester"
                      name="semester"
                      value={registerData.semester}
                      onChange={handleRegisterChange}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                      placeholder="e.g., Fall 2025"
                    />
                  </div>

                  <div>
                    <label htmlFor="register-study-programme" className="block text-sm font-medium text-gray-300 mb-2">
                      Study Programme (Optional)
                    </label>
                    <input
                      type="text"
                      id="register-study-programme"
                      name="study_programme"
                      value={registerData.study_programme}
                      onChange={handleRegisterChange}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                      placeholder="e.g., Computer Science"
                    />
                  </div>
                </>
              )}

              <div>
                <label htmlFor="register-organization" className="block text-sm font-medium text-gray-300 mb-2">
                  Organization (Optional)
                </label>
                <input
                  type="text"
                  id="register-organization"
                  name="organization"
                  value={registerData.organization}
                  onChange={handleRegisterChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                  placeholder="e.g., University Name"
                />
              </div>

              <div>
                <label htmlFor="register-password" className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="register-password"
                  name="password"
                  required
                  value={registerData.password}
                  onChange={handleRegisterChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                  placeholder="Create a password (min. 8 characters)"
                />
              </div>

              <div>
                <label htmlFor="register-confirm-password" className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="register-confirm-password"
                  name="confirmPassword"
                  required
                  value={registerData.confirmPassword}
                  onChange={handleRegisterChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                  placeholder="Confirm your password"
                />
              </div>

              {message && (
                <div className={`p-4 rounded-lg ${
                  message.type === 'success'
                    ? 'bg-green-900 text-green-200 border border-green-700'
                    : 'bg-red-900 text-red-200 border border-red-700'
                }`}>
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default LoginPage
