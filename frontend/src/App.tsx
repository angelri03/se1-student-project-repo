import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import UploadProjectPage from './pages/UploadProjectPage'
import ExploreProjectsPage from './pages/ExploreProjectsPage'
import ViewProjectPage from './pages/ViewProjectPage'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'
import CourseManagementPage from './pages/CourseManagementPage'
import TopicManagementPage from './pages/TopicManagementPage'
import AdminUsersPage from './pages/AdminUsersPage'
import AdminLogsPage from './pages/AdminLogsPage'
import BookmarksPage from './pages/BookmarksPage'
import NotificationsPage from './pages/NotificationsPage'

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
          <Route path="/profile/:username" element={<ProfilePage />} />
          <Route path="/bookmarks" element={<BookmarksPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/admin/courses" element={<CourseManagementPage />} />
          <Route path="/admin/topics" element={<TopicManagementPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/logs" element={<AdminLogsPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
