"""
User API endpoints
Handles registration, login, and account management
"""

from flask import Blueprint, request, jsonify
import database
from .auth import create_token, token_required

users_bp = Blueprint('users', __name__)

@users_bp.route('/api/register', methods=['POST'])
def register():
    """
    Register a new user
    Expected JSON: {"username": "...", "password": "...", "email": "..."}
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
    
    if '@' not in data['email']:
        return jsonify({'success': False, 'message': 'Invalid email address'}), 400
    
    # Create the user (password will be hashed automatically)
    result = database.create_user(
        username=data['username'],
        password=data['password'],
        email=data['email']
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
            'admin': 0
        }
    }), 201

@users_bp.route('/api/login', methods=['POST'])
def login():
    """
    Login with username and password
    Expected JSON: {"username": "...", "password": "..."}
    Returns: {"success": bool, "token": str (if successful)}
    """
    data = request.get_json()
    
    # Validate required fields
    if not data or 'username' not in data or 'password' not in data:
        return jsonify({'success': False, 'message': 'Username and password required'}), 400
    
    # Get user from database
    user = database.get_user_by_username(data['username'])
    
    if not user:
        return jsonify({'success': False, 'message': 'Invalid username or password'}), 401
    
    # Verify password
    if not database.verify_password(data['password'], user['password']):
        return jsonify({'success': False, 'message': 'Invalid username or password'}), 401
    
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
            'admin': user.get('admin', 0)
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
        'bio': user.get('bio'),
        'admin': user.get('admin', 0),
        'created_at': user.get('created_at'),
        'total_ratings': rating_stats.get('total_ratings', 0),
        'average_rating': rating_stats.get('average_rating', 0)
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
    
    # Update user (username, email, and bio can be updated)
    result = database.update_user(
        user_id=current_user_id,
        username=data.get('username', current_username),
        email=data.get('email', user['email']),
        bio=data.get('bio', user.get('bio'))
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
