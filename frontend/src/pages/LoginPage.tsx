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
    identifier: '',
    password: ''
  })

  const [registerData, setRegisterData] = useState({
    username: '',
    email: '',
    full_name: '',
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
        email: loginData.identifier,
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

    // Validate email format
    const email = registerData.email.toLowerCase().trim()
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(email)) {
      setMessage({ type: 'error', text: 'Invalid email format' })
      setLoading(false)
      return
    }

    // Determine if we need to send is_student (for non-whitelisted domains)
    const studentPatterns = [
      /@student\.uni\.lu$/,
      /@student\.[a-zA-Z0-9.-]+$/,
      /@student-[a-zA-Z0-9.-]+$/
    ]
    const nonStudentDomains = ['@uni.lu', '@staff.uni.lu', '@faculty.uni.lu']
    const isStudentEmail = studentPatterns.some(pattern => pattern.test(email))
    const isNonStudentEmail = nonStudentDomains.some(domain => email.endsWith(domain))
    const isWhitelisted = isStudentEmail || isNonStudentEmail

    try {
      const response = await axios.post('/api/register', {
        username: registerData.username,
        email: email,
        full_name: registerData.full_name || undefined,
        password: registerData.password,
        is_student: isWhitelisted ? undefined : registerData.is_student,
        semester: registerData.semester || undefined,
        study_programme: registerData.study_programme || undefined,
        organization: registerData.organization || undefined
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <button
          onClick={() => navigate('/explore')}
          className="mb-6 inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition duration-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Explore
        </button>

        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h1>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 border border-gray-200 dark:border-gray-700">
          <div className="flex mb-6">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 py-2 text-center font-medium transition duration-200 ${
                mode === 'login'
                  ? 'text-gray-900 dark:text-white border-b-2 border-amber-500 dark:border-purple-500'
                  : 'text-gray-500 dark:text-gray-400 border-b border-gray-300 dark:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`flex-1 py-2 text-center font-medium transition duration-200 ${
                mode === 'register'
                  ? 'text-gray-900 dark:text-white border-b-2 border-amber-500 dark:border-purple-500'
                  : 'text-gray-500 dark:text-gray-400 border-b border-gray-300 dark:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Register
            </button>
          </div>

          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-6">
              <div>
                <label htmlFor="login-identifier" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Username or Email
                </label>
                <input
                  type="text"
                  id="login-identifier"
                  name="identifier"
                  required
                  value={loginData.identifier}
                  onChange={handleLoginChange}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-amber-500 dark:focus:ring-purple-500 focus:border-transparent transition duration-200"
                  placeholder="Username or email"
                />
              </div>

              <div>
                <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="login-password"
                  name="password"
                  required
                  value={loginData.password}
                  onChange={handleLoginChange}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-amber-500 dark:focus:ring-purple-500 focus:border-transparent transition duration-200"
                  placeholder="Enter your password"
                />
              </div>

              {message && (
                <div className={`p-4 rounded-lg ${
                  message.type === 'success'
                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-700'
                    : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-700'
                }`}>
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-amber-500 dark:bg-purple-600 text-white rounded-lg font-medium hover:bg-amber-600 dark:hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 dark:focus:ring-purple-500 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-6">
              <div>
                <label htmlFor="register-username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  id="register-username"
                  name="username"
                  required
                  value={registerData.username}
                  onChange={handleRegisterChange}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-amber-500 dark:focus:ring-purple-500 focus:border-transparent transition duration-200"
                  placeholder="Choose a username"
                />
              </div>

              <div>
                <label htmlFor="register-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="register-email"
                  name="email"
                  required
                  value={registerData.email}
                  onChange={handleRegisterChange}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-amber-500 dark:focus:ring-purple-500 focus:border-transparent transition duration-200"
                  placeholder="e.g., name@student.uni.lu"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                </p>
              </div>

              <div>
                <label htmlFor="register-full-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  id="register-full-name"
                  name="full_name"
                  value={registerData.full_name}
                  onChange={handleRegisterChange}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-amber-500 dark:focus:ring-purple-500 focus:border-transparent transition duration-200"
                  placeholder="e.g., John Doe"
                />
              </div>

              {(() => {
                const email = registerData.email.toLowerCase().trim()
                const studentPatterns = [
                  /@student\.uni\.lu$/,
                  /@student\.[a-zA-Z0-9.-]+$/,
                  /@student-[a-zA-Z0-9.-]+$/
                ]
                const nonStudentDomains = ['@uni.lu', '@staff.uni.lu', '@faculty.uni.lu']
                const isStudentEmail = studentPatterns.some(pattern => pattern.test(email))
                const isNonStudentEmail = nonStudentDomains.some(domain => email.endsWith(domain))
                const isWhitelisted = isStudentEmail || isNonStudentEmail
                
                // Show user type selector for non-whitelisted domains
                if (email && !isWhitelisted) {
                  return (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        User Type
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="is_student"
                            checked={registerData.is_student === 1}
                            onChange={() => setRegisterData(prev => ({ ...prev, is_student: 1 }))}
                            className="mr-2 accent-amber-500 dark:accent-purple-500"
                          />
                          <span className="text-gray-700 dark:text-gray-300">Student</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="is_student"
                            checked={registerData.is_student === 0}
                            onChange={() => setRegisterData(prev => ({ ...prev, is_student: 0, semester: '', study_programme: '' }))}
                            className="mr-2 accent-amber-500 dark:accent-purple-500"
                          />
                          <span className="text-gray-700 dark:text-gray-300">Non-Student</span>
                        </label>
                      </div>
                    </div>
                  )
                }
                return null
              })()}

              {(() => {
                const email = registerData.email.toLowerCase().trim()
                const studentPatterns = [
                  /@student\.uni\.lu$/,
                  /@student\.[a-zA-Z0-9.-]+$/,
                  /@student-[a-zA-Z0-9.-]+$/
                ]
                const nonStudentDomains = ['@uni.lu', '@staff.uni.lu', '@faculty.uni.lu']
                const isStudentEmail = studentPatterns.some(pattern => pattern.test(email))
                const isNonStudentEmail = nonStudentDomains.some(domain => email.endsWith(domain))
                const isWhitelisted = isStudentEmail || isNonStudentEmail
                
                // For whitelisted domains, use auto-detection
                const shouldShowStudentFields = isWhitelisted ? isStudentEmail : registerData.is_student === 1
                
                return shouldShowStudentFields
              })() && (
                <>
                  <div>
                    <label htmlFor="register-semester" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Semester (Optional)
                    </label>
                    <input
                      type="text"
                      id="register-semester"
                      name="semester"
                      value={registerData.semester}
                      onChange={handleRegisterChange}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-amber-500 dark:focus:ring-purple-500 focus:border-transparent transition duration-200"
                      placeholder="e.g., Fall 2025"
                    />
                  </div>

                  <div>
                    <label htmlFor="register-study-programme" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Study Programme (Optional)
                    </label>
                    <input
                      type="text"
                      id="register-study-programme"
                      name="study_programme"
                      value={registerData.study_programme}
                      onChange={handleRegisterChange}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-amber-500 dark:focus:ring-purple-500 focus:border-transparent transition duration-200"
                      placeholder="e.g., Computer Science"
                    />
                  </div>
                </>
              )}

              <div>
                <label htmlFor="register-organization" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Organization (Optional)
                </label>
                <input
                  type="text"
                  id="register-organization"
                  name="organization"
                  value={registerData.organization}
                  onChange={handleRegisterChange}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-amber-500 dark:focus:ring-purple-500 focus:border-transparent transition duration-200"
                  placeholder="e.g., University Name"
                />
              </div>

              <div>
                <label htmlFor="register-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="register-password"
                  name="password"
                  required
                  value={registerData.password}
                  onChange={handleRegisterChange}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-amber-500 dark:focus:ring-purple-500 focus:border-transparent transition duration-200"
                  placeholder="Create a password (min. 8 characters)"
                />
              </div>

              <div>
                <label htmlFor="register-confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="register-confirm-password"
                  name="confirmPassword"
                  required
                  value={registerData.confirmPassword}
                  onChange={handleRegisterChange}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-amber-500 dark:focus:ring-purple-500 focus:border-transparent transition duration-200"
                  placeholder="Confirm your password"
                />
              </div>

              {message && (
                <div className={`p-4 rounded-lg ${
                  message.type === 'success'
                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-700'
                    : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-700'
                }`}>
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-amber-500 dark:bg-purple-600 text-white rounded-lg font-medium hover:bg-amber-600 dark:hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 dark:focus:ring-purple-500 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
