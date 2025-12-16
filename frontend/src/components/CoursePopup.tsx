import React from 'react';

interface CourseInfo {
  name: string;
  code?: string;
  description?: string;
  instructor?: string;
  semester?: string;
  term?: string;
}

interface CoursePopupProps {
  course: CourseInfo;
  onClose: () => void;
}

const CoursePopup: React.FC<CoursePopupProps> = ({ course, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-white"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 className="text-2xl font-bold mb-4 text-purple-300">{course.name}</h2>
        {course.code && <p className="mb-2 text-gray-200"><span className="font-semibold text-purple-200">Code:</span> {course.code}</p>}
        {course.instructor && <p className="mb-2 text-gray-200"><span className="font-semibold text-purple-200">Instructor:</span> {course.instructor}</p>}
        {course.semester && <p className="mb-2 text-gray-200"><span className="font-semibold text-purple-200">Semester:</span> {course.semester}</p>}
        {course.term && <p className="mb-2 text-gray-200"><span className="font-semibold text-purple-200">Term:</span> {course.term}</p>}
        {course.description && <p className="mb-2 text-gray-200"><span className="font-semibold text-purple-200">Description:</span> {course.description}</p>}
      </div>
    </div>
  );
};

export default CoursePopup;
