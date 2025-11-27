"""
Project API endpoints
Handles project upload, download, search, and management
"""

from flask import Blueprint, request, jsonify, send_file
import database
from .auth import token_required
import os
from werkzeug.utils import secure_filename
import secrets

projects_bp = Blueprint('projects', __name__)

# Configuration
UPLOAD_FOLDER = 'uploads/projects'
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB in bytes
ALLOWED_EXTENSIONS = {'zip'}

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    """Check if file has allowed extension"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@projects_bp.route('/api/projects', methods=['POST'])
@token_required
def upload_project(current_user_id, current_username):
    """
    Upload a new project
    Requires valid JWT token
    The creator is automatically added as the first owner
    Expects multipart/form-data with:
    - file: zip file
    - name: project name
    - description: project description (optional)
    - tags: comma-separated tags (optional)
    """
    # Check if file is in request
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file provided'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'success': False, 'message': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'success': False, 'message': 'Only .zip files are allowed'}), 400
    
    # Get form data
    name = request.form.get('name')
    description = request.form.get('description', '')
    tags_str = request.form.get('tags', '')
    
    if not name:
        return jsonify({'success': False, 'message': 'Project name is required'}), 400
    
    # Generate unique filename
    random_hash = secrets.token_hex(8)
    
    # Create project entry first to get the ID
    # This will automatically add the creator as the first owner
    result = database.create_project(
        name=name,
        description=description,
        file_path='',  # Will update after saving file
        file_size=0,   # Will update after saving file
        creator_user_id=current_user_id
    )
    
    if not result['success']:
        return jsonify(result), 400
    
    project_id = result['id']
    
    # Save file with project ID in filename
    final_filename = f"{project_id}_{random_hash}.zip"
    file_path = os.path.join(UPLOAD_FOLDER, final_filename)
    
    try:
        file.save(file_path)
        file_size = os.path.getsize(file_path)
        
        # Update project with file info
        database.update_project(
            project_id=project_id,
            file_path=file_path,
            file_size=file_size
        )
        
        # Add tags if provided
        if tags_str:
            tags = [tag.strip() for tag in tags_str.split(',') if tag.strip()]
            database.set_project_tags(project_id, tags)
        
        # Get the complete project info
        project = database.get_project_by_id(project_id)
        
        return jsonify({
            'success': True,
            'message': 'Project uploaded successfully (pending approval)',
            'project': project
        }), 201
    
    except Exception as e:
        # Clean up on error
        if os.path.exists(file_path):
            os.remove(file_path)
        database.delete_project(project_id)
        
        return jsonify({
            'success': False,
            'message': f'Error uploading file: {str(e)}'
        }), 500

@projects_bp.route('/api/projects', methods=['GET'])
def get_projects():
    """
    Get all approved projects
    Public endpoint - no authentication required
    """
    result = database.get_all_approved_projects()
    return jsonify(result), 200 if result['success'] else 500

@projects_bp.route('/api/projects/<int:project_id>', methods=['GET'])
def get_project(project_id):
    """
    Get a specific project by ID
    Public endpoint for approved projects
    """
    project = database.get_project_by_id(project_id)
    
    if not project:
        return jsonify({'success': False, 'message': 'Project not found'}), 404
    
    # Only show approved projects to public
    if not project['approved']:
        return jsonify({'success': False, 'message': 'Project not found'}), 404
    
    return jsonify({
        'success': True,
        'project': project
    }), 200

@projects_bp.route('/api/projects/<int:project_id>/download', methods=['GET'])
def download_project(project_id):
    """
    Download a project's zip file
    Public endpoint for approved projects
    """
    project = database.get_project_by_id(project_id)
    
    if not project:
        return jsonify({'success': False, 'message': 'Project not found'}), 404
    
    if not project['approved']:
        return jsonify({'success': False, 'message': 'Project not available'}), 403
    
    file_path = project['file_path']
    
    if not os.path.exists(file_path):
        return jsonify({'success': False, 'message': 'File not found'}), 404
    
    return send_file(
        file_path,
        as_attachment=True,
        download_name=f"{project['name']}.zip"
    )

@projects_bp.route('/api/projects/<int:project_id>', methods=['PUT'])
@token_required
def update_project(project_id, current_user_id, current_username):
    """
    Update a project (replace file, update name/description/tags)
    Any owner can update the project
    Expects multipart/form-data with:
    - file: zip file (optional - only if replacing)
    - name: project name (optional)
    - description: project description (optional)
    - tags: comma-separated tags (optional)
    """
    project = database.get_project_by_id(project_id)
    
    if not project:
        return jsonify({'success': False, 'message': 'Project not found'}), 404
    
    # Check if user is an owner
    if not database.is_project_owner(project_id, current_user_id):
        return jsonify({'success': False, 'message': 'You do not have permission to update this project'}), 403
    
    # Get form data
    name = request.form.get('name')
    description = request.form.get('description')
    tags_str = request.form.get('tags')
    
    # Update basic info if provided
    if name or description:
        database.update_project(
            project_id=project_id,
            name=name if name else None,
            description=description if description is not None else None
        )
    
    # Update tags if provided
    if tags_str is not None:
        tags = [tag.strip() for tag in tags_str.split(',') if tag.strip()]
        database.set_project_tags(project_id, tags)
    
    # Replace file if provided
    if 'file' in request.files:
        file = request.files['file']
        
        if file.filename != '' and allowed_file(file.filename):
            # Delete old file
            old_file_path = project['file_path']
            if os.path.exists(old_file_path):
                os.remove(old_file_path)
            
            # Save new file
            random_hash = secrets.token_hex(8)
            final_filename = f"{project_id}_{random_hash}.zip"
            file_path = os.path.join(UPLOAD_FOLDER, final_filename)
            
            try:
                file.save(file_path)
                file_size = os.path.getsize(file_path)
                
                # Update project with new file info
                database.update_project(
                    project_id=project_id,
                    file_path=file_path,
                    file_size=file_size
                )
                
                # Reset approval status when file is replaced
                database.unapprove_project(project_id)
                
            except Exception as e:
                return jsonify({
                    'success': False,
                    'message': f'Error uploading file: {str(e)}'
                }), 500
    
    # Get updated project
    updated_project = database.get_project_by_id(project_id)
    
    return jsonify({
        'success': True,
        'message': 'Project updated successfully',
        'project': updated_project
    }), 200

@projects_bp.route('/api/projects/<int:project_id>', methods=['DELETE'])
@token_required
def delete_project(project_id, current_user_id, current_username):
    """
    Delete a project
    Any owner can delete the project
    """
    project = database.get_project_by_id(project_id)
    
    if not project:
        return jsonify({'success': False, 'message': 'Project not found'}), 404
    
    # Check if user is an owner
    if not database.is_project_owner(project_id, current_user_id):
        return jsonify({'success': False, 'message': 'You do not have permission to delete this project'}), 403
    
    # Delete file
    file_path = project['file_path']
    if os.path.exists(file_path):
        os.remove(file_path)
    
    # Delete database entry (tags and owners will be deleted automatically via CASCADE)
    result = database.delete_project(project_id)
    
    return jsonify(result), 200 if result['success'] else 500

@projects_bp.route('/api/my-projects', methods=['GET'])
@token_required
def get_my_projects(current_user_id, current_username):
    """
    Get all projects owned by the authenticated user
    Includes both approved and unapproved projects
    """
    result = database.get_user_projects(current_user_id)
    return jsonify(result), 200 if result['success'] else 500

@projects_bp.route('/api/projects/search', methods=['GET'])
def search_projects():
    """
    Search projects by tag
    Query parameter: tag
    Example: /api/projects/search?tag=python
    """
    tag = request.args.get('tag')
    
    if not tag:
        return jsonify({'success': False, 'message': 'Tag parameter is required'}), 400
    
    result = database.search_projects_by_tag(tag)
    return jsonify(result), 200 if result['success'] else 500

@projects_bp.route('/api/tags', methods=['GET'])
def get_all_tags():
    """
    Get all unique tags
    Public endpoint
    """
    result = database.get_all_tags()
    return jsonify(result), 200 if result['success'] else 500

# ===== CO-OWNER MANAGEMENT ENDPOINTS =====

@projects_bp.route('/api/projects/<int:project_id>/owners', methods=['GET'])
@token_required
def get_project_owners_endpoint(project_id, current_user_id, current_username):
    """
    Get all owners of a project
    Any owner can view the owner list
    """
    # Check if user is an owner
    if not database.is_project_owner(project_id, current_user_id):
        return jsonify({'success': False, 'message': 'You do not have permission to view owners'}), 403
    
    result = database.get_project_owners(project_id)
    return jsonify(result), 200 if result['success'] else 500

@projects_bp.route('/api/projects/<int:project_id>/owners', methods=['POST'])
@token_required
def add_project_owner(project_id, current_user_id, current_username):
    """
    Add a new owner to a project
    Any existing owner can add new owners
    Expected JSON: {"username": "..."}
    """
    # Check if current user is an owner
    if not database.is_project_owner(project_id, current_user_id):
        return jsonify({'success': False, 'message': 'You do not have permission to add owners'}), 403
    
    data = request.get_json()
    
    if not data or 'username' not in data:
        return jsonify({'success': False, 'message': 'Username is required'}), 400
    
    # Get the user to add
    new_owner = database.get_user_by_username(data['username'])
    
    if not new_owner:
        return jsonify({'success': False, 'message': 'User not found'}), 404
    
    # Add the owner
    result = database.add_owner_to_project(project_id, new_owner['id'])
    
    return jsonify(result), 201 if result['success'] else 400

@projects_bp.route('/api/projects/<int:project_id>/owners/<int:user_id>', methods=['DELETE'])
@token_required
def remove_project_owner(project_id, user_id, current_user_id, current_username):
    """
    Remove an owner from a project
    Any owner can remove other owners (or themselves)
    Cannot remove the last owner
    """
    # Check if current user is an owner
    if not database.is_project_owner(project_id, current_user_id):
        return jsonify({'success': False, 'message': 'You do not have permission to remove owners'}), 403
    
    # Remove the owner
    result = database.remove_owner_from_project(project_id, user_id)
    
    return jsonify(result), 200 if result['success'] else 400