"""
Topic API endpoints (Admin only - to be implemented)
Handles topic CRUD operations
"""

from flask import Blueprint, request, jsonify
import database
from .auth import token_required, admin_required

topics_bp = Blueprint('topics', __name__)

# NOTE: All these endpoints should be @admin_required instead of @token_required
# For now using @token_required as placeholder until admin system is implemented

@topics_bp.route('/api/topics', methods=['POST'])
@token_required
def create_topic(current_user_id, current_username):
    """
    Create a new topic (ADMIN ONLY - currently accepts any authenticated user)
    Expected JSON: {"name": "...", "description": "..." (optional)}
    """
    data = request.get_json()
    
    if not data or 'name' not in data:
        return jsonify({'success': False, 'message': 'Topic name is required'}), 400
    
    result = database.create_topic(
        name=data['name'],
        description=data.get('description')
    )
    
    status_code = 201 if result['success'] else 400
    return jsonify(result), status_code

@topics_bp.route('/api/topics', methods=['GET'])
def get_topics():
    """
    Get all topics
    Public endpoint
    """
    result = database.get_all_topics()
    return jsonify(result), 200 if result['success'] else 500

@topics_bp.route('/api/topics/<int:topic_id>', methods=['GET'])
def get_topic(topic_id):
    """
    Get a specific topic by ID
    Public endpoint
    """
    topic = database.get_topic_by_id(topic_id)
    
    if not topic:
        return jsonify({'success': False, 'message': 'Topic not found'}), 404
    
    return jsonify({'success': True, 'topic': topic}), 200

@topics_bp.route('/api/topics/<int:topic_id>', methods=['PUT'])
@token_required
def update_topic(topic_id, current_user_id, current_username):
    """
    Update a topic (ADMIN ONLY - currently accepts any authenticated user)
    Expected JSON: {"name": "..." (optional), "description": "..." (optional)}
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'success': False, 'message': 'No data provided'}), 400
    
    result = database.update_topic(
        topic_id=topic_id,
        name=data.get('name'),
        description=data.get('description')
    )
    
    status_code = 200 if result['success'] else 400
    return jsonify(result), status_code

@topics_bp.route('/api/topics/<int:topic_id>', methods=['DELETE'])
@admin_required
def delete_topic(topic_id, current_user_id, current_username):
    """
    Delete a topic (ADMIN ONLY)
    """
    result = database.delete_topic(topic_id)
    status_code = 200 if result['success'] else 404
    return jsonify(result), status_code

