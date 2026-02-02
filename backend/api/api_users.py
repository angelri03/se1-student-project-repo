"""
User API endpoints
Handles registration, login, and account management
"""

from flask import Blueprint, request, jsonify
import database
from .auth import create_token, token_required
import re

users_bp = Blueprint('users', __name__)

@users_bp.route('/api/register', methods=['POST'])
def register():
    """
    Register a new user
    Expected JSON: {"username": "...", "password": "...", "email": "...", "full_name": "..." (optional), "is_student": 1/0 (optional for non-whitelisted domains)}
    User type is automatically determined based on email domain for whitelisted domains
    Returns: {"success": bool, "message": str, "token": str (if successful)}
    """
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['username', 'password', 'email']
    if not all(field in data for field in required_fields):
        return jsonify({'success': False, 'message': 'Missing required fields'}), 400
    
    # Basic validation
    if len(data['password']) < 8:
        return jsonify({'success': False, 'message': 'Password must be at least 8 characters'}), 400
    
    email = data['email'].lower().strip()
    
    # Validate email format
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_regex, email):
        return jsonify({'success': False, 'message': 'Invalid email format'}), 400
    
    # Define student domains
    student_patterns = [
        r'@student\.uni\.lu$',
        r'@student\.[a-zA-Z0-9.-]+$',
        r'@student-[a-zA-Z0-9.-]+$'
    ]
    
    non_student_domains = [
        '@uni.lu'
    ]
    
    is_student = None
    
    for pattern in student_patterns:
        if re.search(pattern, email):
            is_student = 1
            break
    
    if is_student is None:
        for domain in non_student_domains:
            if email.endswith(domain):
                is_student = 0
                break
    
    if is_student is None:
        is_student = data.get('is_student', 1)  # Default to student if not specified
    
    # Get optional fields based on user type
    full_name = data.get('full_name')
    semester = data.get('semester') if is_student else None
    study_programme = data.get('study_programme') if is_student else None
    organization = data.get('organization')
    
    # Create the user (password will be hashed automatically)
    result = database.create_user(
        username=data['username'],
        password=data['password'],
        email=data['email'],
        full_name=full_name,
        is_student=is_student,
        semester=semester,
        study_programme=study_programme,
        organization=organization,
        profile_link=data.get('profile_link'),
        profile_visibility=data.get('profile_visibility', 'public')
    )
    
    if not result['success']:
        return jsonify(result), 400
    
    # Generate JWT token for the new user
    token = create_token(result['id'], data['username'])
    
    return jsonify({
        'success': True,
        'message': 'User registered successfully',
        'token': token,
        'user': {
            'id': result['id'],
            'username': data['username'],
            'email': data['email'],
            'full_name': full_name,
            'admin': 0,
            'is_student': is_student,
            'semester': semester,
            'study_programme': study_programme,
            'organization': organization,
            'profile_link': data.get('profile_link'),
            'profile_visibility': data.get('profile_visibility', 'public')
        }
    }), 201

@users_bp.route('/api/login', methods=['POST'])
def login():
    """
    Login with email and password
    Expected JSON: {"email": "...", "password": "..."}
    Returns: {"success": bool, "token": str (if successful)}
    """
    data = request.get_json()
    
    # Validate required fields
    if not data or 'email' not in data or 'password' not in data:
        return jsonify({'success': False, 'message': 'Email and password required'}), 400
    
    email = data['email'].lower().strip()
    
    # Validate email format
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_regex, email):
        return jsonify({'success': False, 'message': 'Invalid email format'}), 400
    
    # Get user from database
    user = database.get_user_by_email(email)
    
    if not user:
        return jsonify({'success': False, 'message': 'Invalid email or password'}), 401
    
    # Verify password
    if not database.verify_password(data['password'], user['password']):
        return jsonify({'success': False, 'message': 'Invalid email or password'}), 401
    
    # Generate JWT token
    token = create_token(user['id'], user['username'])
    
    return jsonify({
        'success': True,
        'message': 'Login successful',
        'token': token,
        'user': {
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'admin': user.get('admin', 0),
            'is_student': user.get('is_student', 1),
            'semester': user.get('semester'),
            'study_programme': user.get('study_programme'),
            'organization': user.get('organization'),
            'profile_link': user.get('profile_link'),
            'profile_visibility': user.get('profile_visibility', 'public')
        }
    }), 200

@users_bp.route('/api/account', methods=['DELETE'])
@token_required
def delete_account(current_user_id, current_username):
    """
    Delete the authenticated user's account
    Requires valid JWT token in Authorization header
    Users can only delete their own account
    """
    # Prevent deleting admin accounts
    if database.is_admin(current_user_id):
        return jsonify({'success': False, 'message': 'Admin accounts cannot be deleted'}), 403

    # Require password confirmation in request body
    data = request.get_json() or {}
    password = data.get('password')
    if not password:
        return jsonify({'success': False, 'message': 'Password confirmation required'}), 400

    # Verify password
    user = database.get_user_by_id(current_user_id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    if not database.verify_password(password, user['password']):
        return jsonify({'success': False, 'message': 'Invalid password'}), 401

    # Delete the user's account
    result = database.delete_user(current_user_id)

    if result['success']:
        return jsonify({
            'success': True,
            'message': 'Account deleted successfully'
        }), 200
    else:
        return jsonify(result), 500

@users_bp.route('/api/me', methods=['GET'])
@token_required
def get_current_user(current_user_id, current_username):
    """
    Get information about the currently authenticated user
    Requires valid JWT token in Authorization header
    """
    user = database.get_user_by_id(current_user_id)
    
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404
    
    # Get rating statistics
    rating_stats = database.get_user_rating_stats(current_user_id)
    
    # Don't send the password hash
    user_data = {
        'id': user['id'],
        'username': user['username'],
        'email': user['email'],
        'full_name': user.get('full_name'),
        'bio': user.get('bio'),
        'admin': user.get('admin', 0),
        'is_student': user.get('is_student', 1),
        'semester': user.get('semester'),
        'study_programme': user.get('study_programme'),
        'organization': user.get('organization'),
        'created_at': user.get('created_at'),
        'profile_picture': user.get('profile_picture'),
        'total_ratings': rating_stats.get('total_ratings', 0),
        'average_rating': rating_stats.get('average_rating', 0),
        'profile_link': user.get('profile_link'),
        'profile_visibility': user.get('profile_visibility', 'public')
    }
    
    return jsonify({
        'success': True,
        'user': user_data
    }), 200

@users_bp.route('/api/users', methods=['GET'])
@token_required
def get_all_users(current_user_id, current_username):
    """
    Get all users (for author selection dropdown)
    Requires valid JWT token in Authorization header
    Returns list of users with id, username, email (no passwords)
    """
    result = database.get_all_users()

    if not result['success']:
        return jsonify(result), 500

    return jsonify({
        'success': True,
        'data': result['data']
    }), 200


@users_bp.route('/api/users/<int:user_id>', methods=['DELETE'])
@token_required
def admin_delete_user(current_user_id, current_username, user_id):
    """
    Delete a user by id (admin only)
    """
    # Check admin
    if not database.is_admin(current_user_id):
        return jsonify({'success': False, 'message': 'Admin access required'}), 403

    # Prevent deleting self via admin endpoint (use /api/account to delete own account)
    if current_user_id == user_id:
        return jsonify({'success': False, 'message': 'Use account delete endpoint to remove your own account'}), 400

    # Prevent deleting users with admin role
    if database.is_admin(user_id):
        return jsonify({'success': False, 'message': 'Cannot delete admin users'}), 403

    result = database.delete_user(user_id)
    if result['success']:
        return jsonify({'success': True, 'message': 'User deleted successfully'}), 200
    else:
        return jsonify(result), 400


@users_bp.route('/api/users/<int:user_id>', methods=['PUT'])
@token_required
def admin_update_user(current_user_id, current_username, user_id):
    """
    Update a user's profile (admin only)
    Expected JSON: any of username, email, bio, is_student, semester, study_programme, organization, admin
    """
    if not database.is_admin(current_user_id):
        return jsonify({'success': False, 'message': 'Admin access required'}), 403

    data = request.get_json() or {}

    # Validate email if provided
    if 'email' in data and data['email'] and '@' not in data['email']:
        return jsonify({'success': False, 'message': 'Invalid email address'}), 400

    # If changing username, ensure no conflict
    if 'username' in data and data['username']:
        existing = database.get_user_by_username(data['username'])
        if existing and existing['id'] != user_id:
            return jsonify({'success': False, 'message': 'Username already taken'}), 400

    # Build update args
    update_kwargs = {
        'username': data.get('username'),
        'email': data.get('email'),
        'bio': data.get('bio'),
        'is_student': data.get('is_student'),
        'semester': data.get('semester'),
        'study_programme': data.get('study_programme'),
        'organization': data.get('organization'),
        'admin': data.get('admin'),
        'profile_link': data.get('profile_link'),
        'profile_visibility': data.get('profile_visibility')
    }

    # Remove keys with None to allow partial updates handled by database.update_user
    cleaned = {k: v for k, v in update_kwargs.items() if v is not None}

    if not cleaned:
        return jsonify({'success': False, 'message': 'No fields to update'}), 400

    result = database.update_user(user_id=user_id, **cleaned)

    if not result['success']:
        return jsonify(result), 400

    updated = database.get_user_by_id(user_id)
    if not updated:
        return jsonify({'success': False, 'message': 'User not found after update'}), 404

    user_data = {
        'id': updated['id'],
        'username': updated['username'],
        'email': updated['email'],
        'bio': updated.get('bio'),
        'admin': updated.get('admin', 0),
        'created_at': updated.get('created_at')
    }

    return jsonify({'success': True, 'message': 'User updated', 'user': user_data}), 200


@users_bp.route('/api/users/<int:user_id>/flag', methods=['POST'])
@token_required
def admin_flag_user(current_user_id, current_username, user_id):
    """
    Flag a user (admin only). Expected JSON: {"reason": "..."}
    """
    if not database.is_admin(current_user_id):
        return jsonify({'success': False, 'message': 'Admin access required'}), 403

    # Prevent admins from flagging their own account
    if current_user_id == user_id:
        return jsonify({'success': False, 'message': 'Cannot flag your own account'}), 400

    # Prevent flagging users with admin role
    if database.is_admin(user_id):
        return jsonify({'success': False, 'message': 'Cannot flag admin users'}), 403

    data = request.get_json() or {}
    reason = data.get('reason')

    result = database.flag_user(user_id=user_id, flagged_by=current_user_id, reason=reason)

    if not result['success']:
        return jsonify(result), 500

    return jsonify({'success': True, 'message': 'User flagged'}), 200

@users_bp.route('/api/me', methods=['PUT'])
@token_required
def update_current_user(current_user_id, current_username):
    """
    Update the currently authenticated user's profile
    Requires valid JWT token in Authorization header
    Expected JSON: {"username": "...", "email": "..."}
    """
    data = request.get_json()
    user = database.get_user_by_id(current_user_id)
    
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404
    
    # Validate email if provided
    if 'email' in data and '@' not in data['email']:
        return jsonify({'success': False, 'message': 'Invalid email address'}), 400
    
    # Check if username is already taken (if changing username)
    if 'username' in data and data['username'] != current_username:
        existing_user = database.get_user_by_username(data['username'])
        if existing_user:
            return jsonify({'success': False, 'message': 'Username already taken'}), 400
    
    # Get user type and related fields
    is_student = data.get('is_student', user.get('is_student', 1))
    semester = data.get('semester', user.get('semester'))
    study_programme = data.get('study_programme', user.get('study_programme'))
    organization = data.get('organization', user.get('organization'))
    full_name = data.get('full_name') if 'full_name' in data else user.get('full_name')
    
    # Validate: if not a student, semester and study_programme should not be set
    if not is_student:
        semester = None
        study_programme = None
    
    # Update user (username, email, bio, and user type fields can be updated)
    result = database.update_user(
        user_id=current_user_id,
        username=data.get('username', current_username),
        email=data.get('email', user['email']),
        full_name=full_name,
        bio=data.get('bio', user.get('bio')),
        is_student=is_student,
        semester=semester,
        study_programme=study_programme,
        organization=organization,
        profile_link=data.get('profile_link') if 'profile_link' in data else user.get('profile_link'),
        profile_visibility=data.get('profile_visibility') if 'profile_visibility' in data else user.get('profile_visibility', 'public')
    )
    
    if not result['success']:
        return jsonify(result), 400
    
    # Return updated user data
    updated_user = database.get_user_by_id(current_user_id)
    user_data = {
        'id': updated_user['id'],
        'username': updated_user['username'],
        'email': updated_user['email'],
        'bio': updated_user.get('bio'),
        'admin': updated_user.get('admin', 0),
        'created_at': updated_user.get('created_at')
    }
    
    return jsonify({
        'success': True,
        'message': 'Profile updated successfully',
        'user': user_data
    }), 200

@users_bp.route('/api/me/profile-picture', methods=['POST'])
@token_required
def upload_profile_picture(current_user_id, current_username):
    """
    Upload or update profile picture for the current user
    Requires valid JWT token in Authorization header
    Expected: multipart/form-data with 'profile_picture' file
    """
    import os
    from werkzeug.utils import secure_filename
    
    print(f"Upload profile picture request from user {current_user_id}")
    print(f"Request files: {request.files}")
    
    if 'profile_picture' not in request.files:
        return jsonify({'success': False, 'message': 'No file provided'}), 400
    
    file = request.files['profile_picture']
    
    if file.filename == '':
        return jsonify({'success': False, 'message': 'No file selected'}), 400
    
    # Validate file type
    allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
    
    if file_ext not in allowed_extensions:
        return jsonify({'success': False, 'message': 'Invalid file type. Allowed: png, jpg, jpeg, gif, webp'}), 400
    
    # Create uploads directory if it doesn't exist
    uploads_dir = os.path.join('uploads', 'profile_pictures')
    os.makedirs(uploads_dir, exist_ok=True)
    
    # Generate unique filename
    filename = f"user_{current_user_id}.{file_ext}"
    file_path = os.path.join(uploads_dir, filename)
    
    # Delete old profile picture if it exists
    user = database.get_user_by_id(current_user_id)
    if user and user.get('profile_picture'):
        old_file_path = user.get('profile_picture')
        if os.path.exists(old_file_path):
            try:
                os.remove(old_file_path)
            except Exception:
                pass  # Ignore errors when deleting old file
    
    # Save the file
    try:
        file.save(file_path)
    except Exception as e:
        return jsonify({'success': False, 'message': f'Failed to save file: {str(e)}'}), 500
    
    # Convert path to use forward slashes for URLs (works on both Windows and Unix)
    web_path = file_path.replace('\\', '/')
    
    # Update database
    result = database.update_user(user_id=current_user_id, profile_picture=web_path)
    
    if not result['success']:
        # Clean up uploaded file if database update fails
        if os.path.exists(file_path):
            os.remove(file_path)
        return jsonify(result), 500
    
    return jsonify({
        'success': True,
        'message': 'Profile picture uploaded successfully',
        'profile_picture': web_path
    }), 200

@users_bp.route('/api/me/profile-picture', methods=['DELETE'])
@token_required
def delete_profile_picture(current_user_id, current_username):
    """
    Delete profile picture for the current user
    Requires valid JWT token in Authorization header
    """
    import os
    
    user = database.get_user_by_id(current_user_id)
    
    if not user or not user.get('profile_picture'):
        return jsonify({'success': False, 'message': 'No profile picture to delete'}), 404
    
    # Delete the file
    file_path = user.get('profile_picture')
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            return jsonify({'success': False, 'message': f'Failed to delete file: {str(e)}'}), 500
    
    # Update database
    result = database.update_user(user_id=current_user_id, profile_picture=None)
    
    if not result['success']:
        return jsonify(result), 500
    
    return jsonify({
        'success': True,
        'message': 'Profile picture deleted successfully'
    }), 200


@users_bp.route('/api/users/profile/<username>', methods=['GET'])
def get_user_profile(username):
    """
    Get public user profile by username
    Public endpoint
    """
    user = database.get_user_by_username(username)

    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    rating_stats = database.get_user_rating_stats(user['id'])

    # return public profile info (so exclude email and password)
    public_user = {
        'id': user['id'],
        'username': user['username'],
        'full_name': user.get('full_name'),
        'bio': user.get('bio'),
        'created_at': user.get('created_at'),
        'is_student': user.get('is_student', 1),
        'semester': user.get('semester'),
        'study_programme': user.get('study_programme'),
        'organization': user.get('organization'),
        'admin': user.get('admin', 0),
        'profile_picture': user.get('profile_picture'),
        'total_ratings': rating_stats.get('total_ratings', 0) if rating_stats else 0,
        'average_rating': rating_stats.get('average_rating', 0) if rating_stats else 0,
        'profile_link': user.get('profile_link'),
        'profile_visibility': user.get('profile_visibility', 'public')
    }

    # Include flags (if any)
    flags_result = database.get_user_flags(user['id'])
    if flags_result.get('success'):
        public_user['flags'] = flags_result.get('data', [])
    else:
        public_user['flags'] = []

    return jsonify({'success': True, 'user': public_user}), 200


@users_bp.route('/api/me/change-password', methods=['POST'])
@token_required
def change_password_endpoint(current_user_id, current_username):
    """
    Change the current user's password
    Requires valid JWT token in Authorization header
    Expected JSON: {"current_password": "...", "new_password": "..."}
    """
    data = request.get_json()
    
    if not data or 'current_password' not in data or 'new_password' not in data:
        return jsonify({'success': False, 'message': 'Missing required fields'}), 400
    
    current_password = data['current_password']
    new_password = data['new_password']
    
    # Validate new password
    if len(new_password) < 8:
        return jsonify({'success': False, 'message': 'New password must be at least 8 characters'}), 400
    
    # Change password
    result = database.change_password(current_user_id, current_password, new_password)
    
    if not result['success']:
        return jsonify(result), 400
    
    return jsonify(result), 200


@users_bp.route('/api/me/change-email', methods=['POST'])
@token_required
def change_email_endpoint(current_user_id, current_username):
    """
    Change the current user's email
    Requires valid JWT token in Authorization header
    Expected JSON: {"password": "...", "new_email": "..."}
    """
    import re
    
    data = request.get_json()
    
    if not data or 'password' not in data or 'new_email' not in data:
        return jsonify({'success': False, 'message': 'Missing required fields'}), 400
    
    password = data['password']
    new_email = data['new_email'].lower().strip()
    
    # Validate email format
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_regex, new_email):
        return jsonify({'success': False, 'message': 'Invalid email format'}), 400
    
    # Change email
    result = database.change_email(current_user_id, password, new_email)
    
    if not result['success']:
        return jsonify(result), 400
    
    return jsonify(result), 200