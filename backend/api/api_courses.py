"""
Course API endpoints (Admin only - to be implemented)
Handles course CRUD operations and project-course assignments
"""

from flask import Blueprint, request, jsonify
import database
from .auth import token_required, admin_required

courses_bp = Blueprint('courses', __name__)

# NOTE: All these endpoints should be @admin_required instead of @token_required
# For now using @token_required as placeholder until admin system is implemented

@courses_bp.route('/api/courses', methods=['POST'])
@admin_required
def create_course(current_user_id, current_username):
    """
    Create a new course (ADMIN ONLY)
    Expected JSON: {"code": "...", "name": "...", "semester": "..." (optional), "term": "..." (optional), "description": "..." (optional)}
    """
    data = request.get_json()
    
    if not data or 'code' not in data or 'name' not in data:
        return jsonify({'success': False, 'message': 'Course code and name are required'}), 400
    
    result = database.create_course(
        code=data['code'],
        name=data['name'],
        semester=data.get('semester'),
        term=data.get('term'),
        description=data.get('description')
    )
    
    status_code = 201 if result['success'] else 400
    return jsonify(result), status_code

@courses_bp.route('/api/courses', methods=['GET'])
def get_courses():
    """
    Get all courses with their topics
    Public endpoint
    """
    result = database.get_all_courses()
    return jsonify(result), 200 if result['success'] else 500

@courses_bp.route('/api/courses/<int:course_id>', methods=['GET'])
def get_course(course_id):
    """
    Get a specific course by ID with its topics
    Public endpoint
    """
    course = database.get_course_by_id(course_id)
    
    if not course:
        return jsonify({'success': False, 'message': 'Course not found'}), 404
    
    return jsonify({'success': True, 'course': course}), 200

@courses_bp.route('/api/courses/<int:course_id>', methods=['PUT'])
@admin_required
def update_course(course_id, current_user_id, current_username):
    """
    Update a course (ADMIN ONLY)
    Expected JSON: {"code": "..." (optional), "name": "..." (optional), "semester": "..." (optional), "term": "..." (optional), "description": "..." (optional)}
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'success': False, 'message': 'No data provided'}), 400
    
    result = database.update_course(
        course_id=course_id,
        code=data.get('code'),
        name=data.get('name'),
        semester=data.get('semester'),
        term=data.get('term'),
        description=data.get('description')
    )
    
    status_code = 200 if result['success'] else 400
    return jsonify(result), status_code

@courses_bp.route('/api/courses/<int:course_id>', methods=['DELETE'])
@admin_required
def delete_course(course_id, current_user_id, current_username):
    """
    Delete a course (ADMIN ONLY)
    """
    result = database.delete_course(course_id)
    status_code = 200 if result['success'] else 404
    return jsonify(result), status_code

@courses_bp.route('/api/courses/<int:course_id>/projects', methods=['GET'])
def get_course_projects(course_id):
    """
    Get all projects assigned to a course
    Public endpoint
    """
    result = database.get_projects_by_course(course_id)
    return jsonify(result), 200 if result['success'] else 500

@courses_bp.route('/api/projects/<int:project_id>/course', methods=['POST'])
@token_required
def assign_course(project_id, current_user_id, current_username):
    """
    Assign a project to a course (ADMIN ONLY - currently accepts any authenticated user)
    Expected JSON: {"course_id": ...}
    """
    data = request.get_json()
    
    if not data or 'course_id' not in data:
        return jsonify({'success': False, 'message': 'Course ID is required'}), 400
    
    result = database.assign_project_to_course(project_id, data['course_id'])
    status_code = 200 if result['success'] else 400
    return jsonify(result), status_code

@courses_bp.route('/api/projects/<int:project_id>/course', methods=['DELETE'])
@token_required
def unassign_course(project_id, current_user_id, current_username):
    """
    Remove course assignment from a project (ADMIN ONLY - currently accepts any authenticated user)
    """
    result = database.unassign_project_from_course(project_id)
    status_code = 200 if result['success'] else 404
    return jsonify(result), status_code

@courses_bp.route('/api/projects/<int:project_id>/course', methods=['GET'])
def get_project_course(project_id):
    """
    Get the course assigned to a project
    Public endpoint
    """
    course = database.get_project_course(project_id)
    
    if not course:
        return jsonify({'success': False, 'message': 'No course assigned to this project'}), 404
    
    return jsonify({'success': True, 'course': course}), 200

