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
MEDIA_FOLDER = 'uploads/media'
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB in bytes (NOTE: MAX_FILE_SIZE is unused for now, remove?)
ALLOWED_EXTENSIONS = {'zip', '7z', 'rar', 'tar', 'gz'}
ALLOWED_MEDIA_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'avi', 'pdf'}

# Ensure upload directories exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(MEDIA_FOLDER, exist_ok=True)

def allowed_file(filename):
    """Check if file has allowed extension"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def allowed_media_file(filename):
    """Check if media file has allowed extension"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_MEDIA_EXTENSIONS

@projects_bp.route('/api/projects', methods=['POST'])
@token_required
def upload_project(current_user_id, current_username):
    """
    Upload a new project
    Requires valid JWT token
    The creator is automatically added as the first owner
    Expects multipart/form-data with:
    - file: file of type ALLOWED_EXTENSIONS
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
        return jsonify({'success': False, 'message': 'Only files of type (ZIP, 7z, RAR, TAR or GZ) are allowed'}), 400
    
    # Get form data
    name = request.form.get('name')
    description = request.form.get('description', '')
    tags_str = request.form.get('tags', '')
    project_link = request.form.get('project_link', '')
    
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
        creator_user_id=current_user_id,
        project_link=project_link if project_link else None
    )
    
    if not result['success']:
        return jsonify(result), 400
    
    project_id = result['id']
    
    # Save file with project ID in filename
    file_ext = file.filename.rsplit('.', 1)[1].lower()
    final_filename = f"{project_id}_{random_hash}.{file_ext}"
    file_path = os.path.join(UPLOAD_FOLDER, final_filename)
    
    try:
        file.save(file_path)
        file_size = os.path.getsize(file_path)
        
        # Update project with file info
        database.update_project(
            project_id=project_id,
            file_path=file_path,
            file_size=file_size,
            last_edited_by_id=current_user_id
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

@projects_bp.route('/api/projects/all', methods=['GET'])
@token_required
def get_all_projects(current_user_id, current_username):
    """
    Get all projects (including unapproved)
    Admin only endpoint
    """
    # Check if user is admin
    if not database.is_admin(current_user_id):
        return jsonify({'success': False, 'message': 'Admin access required'}), 403

    result = database.get_all_projects()
    return jsonify(result), 200 if result['success'] else 500

@projects_bp.route('/api/projects/<int:project_id>/approve', methods=['POST'])
@token_required
def approve_project_endpoint(project_id, current_user_id, current_username):
    """
    Approve a project
    Admin only endpoint
    """
    # Check if user is admin
    if not database.is_admin(current_user_id):
        return jsonify({'success': False, 'message': 'Admin access required'}), 403

    project = database.get_project_by_id(project_id)
    if not project:
        return jsonify({'success': False, 'message': 'Project not found'}), 404

    result = database.approve_project(project_id)
    
    if result['success']:
        # Create notification for project owners
        message = f'Your project "{project["name"]}" has been approved and is now publicly visible!'
        database.create_notification_for_project_owners(
            project_id=project_id,
            type='project_approved',
            message=message,
            exclude_user_id=current_user_id
        )
    
    return jsonify(result), 200 if result['success'] else 400

@projects_bp.route('/api/projects/<int:project_id>', methods=['GET'])
def get_project(project_id):
    """
    Get a specific project by ID
    Public endpoint for approved projects, admins can view unapproved
    """
    project = database.get_project_by_id(project_id)

    if not project:
        return jsonify({'success': False, 'message': 'Project not found'}), 404

    # Check if user is admin or owner (optional token)
    is_admin = False
    is_owner = False
    if 'Authorization' in request.headers:
        auth_header = request.headers['Authorization']
        try:
            from .auth import decode_token
            token = auth_header.split(' ')[1]
            result = decode_token(token)
            if result['success']:
                user_id = result['payload']['user_id']
                is_admin = database.is_admin(user_id)
                try:
                    is_owner = database.is_project_owner(project_id, user_id)
                except Exception:
                    is_owner = False
        except (IndexError, KeyError):
            pass

    # Allow owners and admins to see unapproved projects; public sees only approved
    if not project['approved'] and not (is_admin or is_owner):
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
    
    # Allow owners/admin to download unapproved projects
    if not project['approved']:
        is_admin = False
        is_owner = False
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                from .auth import decode_token
                token = auth_header.split(' ')[1]
                result = decode_token(token)
                if result['success']:
                    user_id = result['payload']['user_id']
                    is_admin = database.is_admin(user_id)
                    try:
                        is_owner = database.is_project_owner(project_id, user_id)
                    except Exception:
                        is_owner = False
            except (IndexError, KeyError):
                pass

        if not (is_admin or is_owner):
            return jsonify({'success': False, 'message': 'Project not available'}), 403
    
    file_path = project['file_path']
    
    if not os.path.exists(file_path):
        return jsonify({'success': False, 'message': 'File not found'}), 404

    # grab file extension from actual file path
    file_ext = os.path.splitext(file_path)[1]

    return send_file(
        file_path,
        as_attachment=True,
        download_name=f"{project['name']}{file_ext}"
    )

@projects_bp.route('/api/projects/<int:project_id>', methods=['PUT'])
@token_required
def update_project(project_id, current_user_id, current_username):
    """
    Update a project (replace file, update name/description/tags)
    Any owner can update the project
    Expects multipart/form-data with:
    - file: file of type ALLOWED_EXTENSIONS (optional - only if replacing)
    - name: project name (optional)
    - description: project description (optional)
    - tags: comma-separated tags (optional)
    """
    project = database.get_project_by_id(project_id)
    
    if not project:
        return jsonify({'success': False, 'message': 'Project not found'}), 404
    
    # Check if user is an owner or admin
    is_admin = database.is_admin(current_user_id)
    is_owner = database.is_project_owner(project_id, current_user_id)
    
    if not is_owner and not is_admin:
        return jsonify({'success': False, 'message': 'You do not have permission to update this project'}), 403

    # Track if admin is editing someone else's project
    admin_editing_others = is_admin and not is_owner
    
    # Get form data
    name = request.form.get('name')
    description = request.form.get('description')
    tags_str = request.form.get('tags')
    project_link = request.form.get('project_link')
    
    # Update basic info if provided
    if name or description or project_link is not None:
        database.update_project(
            project_id=project_id,
            name=name if name else None,
            description=description if description is not None else None,
            project_link=project_link if project_link is not None else None,
            last_edited_by_id=current_user_id
        )
    
    # Update tags if provided
    if tags_str is not None:
        tags = [tag.strip() for tag in tags_str.split(',') if tag.strip()]
        database.set_project_tags(project_id, tags)
        # Also update last_edited_by_id when tags are changed
        database.update_project(
            project_id=project_id,
            last_edited_by_id=current_user_id
        )
    
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
            file_ext = file.filename.rsplit('.', 1)[1].lower()
            final_filename = f"{project_id}_{random_hash}.{file_ext}"
            file_path = os.path.join(UPLOAD_FOLDER, final_filename)
            
            try:
                file.save(file_path)
                file_size = os.path.getsize(file_path)
                
                # Update project with new file info
                database.update_project(
                    project_id=project_id,
                    file_path=file_path,
                    file_size=file_size,
                    last_edited_by_id=current_user_id
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
    
    # If admin edited someone else's project, notify the owners
    if admin_editing_others:
        message = f'Your project "{project["name"]}" has been edited by an administrator.'
        database.create_notification_for_project_owners(
            project_id=project_id,
            type='project_edited',
            message=message,
            exclude_user_id=current_user_id
        )
    # If owner edited project, notify all admins
    elif is_owner and not is_admin:
        admin_ids = database.get_admin_user_ids()
        message = f'Project "{project["name"]}" has been edited by {current_username}.'
        for admin_id in admin_ids:
            database.create_notification(
                user_id=admin_id,
                project_id=project_id,
                type='project_edited',
                message=message
            )
    
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
    Only the project creator or admin can delete the project
    """
    project = database.get_project_by_id(project_id)
    
    if not project:
        return jsonify({'success': False, 'message': 'Project not found'}), 404

    # Check if user is admin or the project creator
    is_admin = database.is_admin(current_user_id)
    is_creator = database.get_project_creator(project_id) == current_user_id
    
    if not is_creator and not is_admin:
        return jsonify({'success': False, 'message': 'You do not have permission to delete this project'}), 403

    # Notify other project owners about deletion
    if is_admin and not is_creator:
        # Admin is deleting - notify all owners
        message = f'Your project "{project["name"]}" has been deleted by an administrator.'
        database.create_notification_for_project_owners(
            project_id=project_id,
            type='project_deleted',
            message=message,
            exclude_user_id=current_user_id
        )
    elif is_creator:
        # Creator is deleting - notify other owners
        message = f'The project "{project["name"]}" has been deleted by the creator.'
        database.create_notification_for_project_owners(
            project_id=project_id,
            type='project_deleted',
            message=message,
            exclude_user_id=current_user_id
        )

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


@projects_bp.route('/api/my-projects/pending', methods=['GET'])
@token_required
def get_my_pending_projects(current_user_id, current_username):
    """
    Get pending (unapproved) projects owned by the authenticated user
    """
    result = database.get_user_pending_projects(current_user_id)
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
    # Check if user is an owner or admin
    if not database.is_project_owner(project_id, current_user_id) and not database.is_admin(current_user_id):
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
    # Check if current user is an owner or admin
    if not database.is_project_owner(project_id, current_user_id) and not database.is_admin(current_user_id):
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
    # Check if current user is an owner or admin
    if not database.is_project_owner(project_id, current_user_id) and not database.is_admin(current_user_id):
        return jsonify({'success': False, 'message': 'You do not have permission to remove owners'}), 403

    # Prevent non-admin owners from removing the project creator
    creator_id = database.get_project_creator(project_id)
    if creator_id is not None and creator_id == user_id and current_user_id != user_id and not database.is_admin(current_user_id):
        return jsonify({'success': False, 'message': 'Cannot remove the project creator'}), 403

    # Remove the owner
    result = database.remove_owner_from_project(project_id, user_id)

    return jsonify(result), 200 if result['success'] else 400

# ===== RATING ENDPOINTS =====

@projects_bp.route('/api/projects/<int:project_id>/rating', methods=['GET'])
def get_project_rating(project_id):
    """
    Get the average rating and total ratings for a project
    Public endpoint
    """
    result = database.get_project_rating(project_id)
    return jsonify(result), 200 if result['success'] else 500

@projects_bp.route('/api/projects/<int:project_id>/rating', methods=['POST'])
@token_required
def rate_project(project_id, current_user_id, current_username):
    """
    Rate a project (1-5 stars)
    Requires authentication
    Expected JSON: {"rating": 1-5}
    """
    data = request.get_json()

    if not data or 'rating' not in data:
        return jsonify({'success': False, 'message': 'Rating is required'}), 400

    try:
        rating = int(data['rating'])
    except (ValueError, TypeError):
        return jsonify({'success': False, 'message': 'Rating must be a number'}), 400

    if rating < 1 or rating > 5:
        return jsonify({'success': False, 'message': 'Rating must be between 1 and 5'}), 400

    # Check if project exists and is approved
    project = database.get_project_by_id(project_id)
    if not project:
        return jsonify({'success': False, 'message': 'Project not found'}), 404

    if not project['approved']:
        return jsonify({'success': False, 'message': 'Cannot rate unapproved projects'}), 403

    result = database.rate_project(project_id, current_user_id, rating)
    
    if result['success']:
        # Create notification for project owners
        star_text = 'star' if rating == 1 else 'stars'
        message = f'Your project "{project["name"]}" has received a new rating!: {rating} {star_text}.'
        database.create_notification_for_project_owners(
            project_id=project_id,
            type='project_rated',
            message=message,
            exclude_user_id=current_user_id
        )
    
    return jsonify(result), 200 if result['success'] else 400

@projects_bp.route('/api/projects/<int:project_id>/rating/me', methods=['GET'])
@token_required
def get_my_rating(project_id, current_user_id, current_username):
    """
    Get the current user's rating for a project
    Returns the rating or null if not rated
    """
    rating = database.get_user_rating(project_id, current_user_id)
    return jsonify({'success': True, 'rating': rating}), 200

@projects_bp.route('/api/projects/<int:project_id>/rating', methods=['DELETE'])
@token_required
def delete_my_rating(project_id, current_user_id, current_username):
    """
    Delete the current user's rating for a project
    """
    result = database.delete_rating(project_id, current_user_id)
    return jsonify(result), 200 if result['success'] else 400

@projects_bp.route('/api/projects/<int:project_id>/media', methods=['POST'])
@token_required
def upload_project_media(project_id, current_user_id, current_username):
    """
    Upload media attachments to a project
    Only owners can upload media
    Accepts: images (jpg, jpeg, png, gif), videos (mp4, mov, avi), pdf
    """
    # Check if project exists
    project = database.get_project_by_id(project_id)
    if not project:
        return jsonify({'success': False, 'message': 'Project not found'}), 404
    
    # Check if user is an owner or admin
    is_owner = any(owner['id'] == current_user_id for owner in project['owners'])
    if not is_owner and not database.is_admin(current_user_id):
        return jsonify({'success': False, 'message': 'Only project owners can upload media'}), 403

    # Check if media files are in request
    if 'media' not in request.files:
        return jsonify({'success': False, 'message': 'No media files provided'}), 400
    
    files = request.files.getlist('media')
    if not files or len(files) == 0:
        return jsonify({'success': False, 'message': 'No media files selected'}), 400
    
    uploaded_media = []
    
    for file in files:
        if file.filename == '':
            continue
            
        if not allowed_media_file(file.filename):
            return jsonify({'success': False, 'message': f'File type not allowed: {file.filename}'}), 400
        
        # Generate unique filename
        filename = secure_filename(file.filename)
        unique_filename = f"{secrets.token_hex(8)}_{filename}"
        file_path = os.path.join(MEDIA_FOLDER, unique_filename)
        
        # Save file
        file.save(file_path)
        file_size = os.path.getsize(file_path)
        file_type = filename.rsplit('.', 1)[1].lower()
        
        # Add to database
        result = database.add_project_media(
            project_id=project_id,
            file_path=file_path,
            file_name=filename,
            file_type=file_type,
            file_size=file_size
        )
        
        if result['success']:
            uploaded_media.append({
                'id': result['id'],
                'file_name': filename,
                'file_type': file_type
            })
    
    return jsonify({
        'success': True,
        'message': f'Uploaded {len(uploaded_media)} media file(s)',
        'media': uploaded_media
    }), 201

@projects_bp.route('/api/projects/<int:project_id>/media', methods=['GET'])
def get_project_media_list(project_id):
    """
    Get all media attachments for a project
    Public endpoint for approved projects
    """
    project = database.get_project_by_id(project_id)
    # Allow owners and admins to view media for unapproved projects
    if not project:
        return jsonify({'success': False, 'message': 'Project not found'}), 404

    if not project['approved']:
        is_admin = False
        is_owner = False
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                from .auth import decode_token
                token = auth_header.split(' ')[1]
                result = decode_token(token)
                if result['success']:
                    user_id = result['payload']['user_id']
                    is_admin = database.is_admin(user_id)
                    try:
                        is_owner = database.is_project_owner(project_id, user_id)
                    except Exception:
                        is_owner = False
            except (IndexError, KeyError):
                pass

        if not (is_admin or is_owner):
            return jsonify({'success': False, 'message': 'Project not found'}), 404
    
    media = database.get_project_media(project_id)
    return jsonify({'success': True, 'media': media}), 200

@projects_bp.route('/api/media/<int:media_id>', methods=['GET'])
def get_media_file(media_id):
    """
    Download/view a specific media file
    Public endpoint
    """
    media = database.get_media_by_id(media_id)
    
    if not media:
        return jsonify({'success': False, 'message': 'Media not found'}), 404
    
    file_path = media['file_path']
    
    if not os.path.exists(file_path):
        return jsonify({'success': False, 'message': 'File not found'}), 404
    
    return send_file(file_path, as_attachment=False)

@projects_bp.route('/api/media/<int:media_id>', methods=['DELETE'])
@token_required
def delete_media_file(media_id, current_user_id, current_username):
    """
    Delete a media attachment
    Only project owners can delete media
    """
    media = database.get_media_by_id(media_id)
    
    if not media:
        return jsonify({'success': False, 'message': 'Media not found'}), 404
    
    # Get project and check ownership
    project = database.get_project_by_id(media['project_id'])
    if not project:
        return jsonify({'success': False, 'message': 'Project not found'}), 404

    is_owner = any(owner['id'] == current_user_id for owner in project['owners'])
    if not is_owner and not database.is_admin(current_user_id):
        return jsonify({'success': False, 'message': 'Only project owners can delete media'}), 403

    # Delete from database
    result = database.delete_project_media(media_id)
    
    if result['success']:
        # Delete file from disk
        file_path = result['file_path']
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass
    
    return jsonify(result), 200 if result['success'] else 400
