import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import UploadProjectPage from './pages/UploadProjectPage'
import ExploreProjectsPage from './pages/ExploreProjectsPage'
import ViewProjectPage from './pages/ViewProjectPage'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'
import CourseManagementPage from './pages/CourseManagementPage'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-900">
        <Routes>
          <Route path="/" element={<ExploreProjectsPage />} />
          <Route path="/explore" element={<ExploreProjectsPage />} />
          <Route path="/upload" element={<UploadProjectPage />} />
          <Route path="/project/:id" element={<ViewProjectPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin/courses" element={<CourseManagementPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
