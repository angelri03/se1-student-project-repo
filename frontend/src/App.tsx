import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import UploadProjectPage from './pages/UploadProjectPage'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-900">
        <Routes>
          <Route path="/" element={<UploadProjectPage />} />
          <Route path="/upload" element={<UploadProjectPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
