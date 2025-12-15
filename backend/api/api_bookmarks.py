"""
Bookmark API endpoints
Handles bookmark operations (add, remove, get)
"""

from flask import Blueprint, jsonify
import database
from .auth import token_required

bookmarks_bp = Blueprint('bookmarks', __name__)

@bookmarks_bp.route('/api/bookmarks', methods=['POST'])
@token_required
def add_bookmark(current_user_id, current_username):
    """
    Add a bookmark for the current user
    Requires valid JWT token
    Expects JSON: {'project_id': int}
    """
    from flask import request
    
    data = request.get_json()
    
    if not data or 'project_id' not in data:
        return jsonify({'success': False, 'message': 'project_id is required'}), 400
    
    project_id = data.get('project_id')
    
    result = database.add_bookmark(current_user_id, project_id)
    
    if result['success']:
        return jsonify(result), 201
    else:
        return jsonify(result), 400

@bookmarks_bp.route('/api/bookmarks/<int:project_id>', methods=['DELETE'])
@token_required
def remove_bookmark(current_user_id, current_username, project_id):
    """
    Remove a bookmark for the current user
    Requires valid JWT token
    """
    result = database.remove_bookmark(current_user_id, project_id)
    
    if result['success']:
        return jsonify(result), 200
    else:
        return jsonify(result), 400

@bookmarks_bp.route('/api/bookmarks', methods=['GET'])
@token_required
def get_bookmarks(current_user_id, current_username):
    """
    Get all bookmarked projects for the current user
    Requires valid JWT token
    """
    result = database.get_user_bookmarks(current_user_id)
    
    if result['success']:
        return jsonify(result), 200
    else:
        return jsonify(result), 500

@bookmarks_bp.route('/api/bookmarks/check/<int:project_id>', methods=['GET'])
@token_required
def check_bookmark(current_user_id, current_username, project_id):
    """
    Check if a project is bookmarked by the current user
    Requires valid JWT token
    """
    is_bookmarked = database.is_bookmarked(current_user_id, project_id)
    
    return jsonify({'success': True, 'is_bookmarked': is_bookmarked}), 200
