import { useNavigate } from 'react-router-dom'

interface Project {
  id: number
  name: string
  description: string
  course?: string
  tags: string[]
  owners: { id: number; username: string; email: string }[]
  created_at: string
  approved?: number
}

interface ProjectCardProps {
  project: Project
  showApproveButton?: boolean
  onApprove?: (projectId: number) => void
  variant?: 'default' | 'profile'
  fromProfile?: boolean
}

function ProjectCard({ project, showApproveButton = false, onApprove, variant = 'default', fromProfile = false }: ProjectCardProps) {
  const navigate = useNavigate()

  const bgColor = variant === 'profile' ? 'bg-gray-700' : 'bg-gray-800'
  const borderColor = variant === 'profile' ? 'border-gray-600' : 'border-gray-700'

  return (
    <div
      className={`${bgColor} rounded-lg shadow-lg border ${borderColor} hover:border-purple-500 transition duration-200 overflow-hidden flex flex-col`}
    >
      <div className="p-6 flex flex-col flex-grow">
        {/* Project Title */}
        <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 flex items-center gap-2">
          <span className="line-clamp-2">{project.name}</span>
          {project.approved === 0 && variant === 'default' && (
            <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <title>Pending approval</title>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
        </h3>

        {/* Course and Topic Tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-purple-900 text-purple-200">
            {project.course}
          </span>
          {(project.tags || []).map((tag, index) => (
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
          <p className="text-sm text-gray-300">{project.owners.map(o => o.username).join(', ')}</p>
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
        <div className="flex flex-col gap-2">
          <button
            onClick={() => navigate(`/project/${project.id}`, fromProfile ? { state: { fromProfile: true } } : undefined)}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition duration-200"
          >
            View Details
          </button>
          {showApproveButton && project.approved === 0 && onApprove && (
            <button
              onClick={() => onApprove(project.id)}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Approve
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProjectCard
