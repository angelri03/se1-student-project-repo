"""
Notification API endpoints
Handles retrieving and managing user notifications
"""

from flask import Blueprint, request, jsonify
import database
from .auth import token_required

notifications_bp = Blueprint('notifications', __name__)

@notifications_bp.route('/api/notifications', methods=['GET'])
@token_required
def get_notifications(current_user_id, current_username):
    """
    Get all notifications for the authenticated user
    Query parameter: unread_only=true to get only unread notifications
    """
    unread_only = request.args.get('unread_only', 'false').lower() == 'true'
    
    result = database.get_user_notifications(current_user_id, unread_only)
    return jsonify(result), 200 if result['success'] else 500

@notifications_bp.route('/api/notifications/unread-count', methods=['GET'])
@token_required
def get_unread_notifications_count(current_user_id, current_username):
    """
    Get the count of unread notifications for the authenticated user
    """
    result = database.get_unread_count(current_user_id)
    return jsonify(result), 200 if result['success'] else 500

@notifications_bp.route('/api/notifications/<int:notification_id>/read', methods=['PUT'])
@token_required
def mark_notification_read(notification_id, current_user_id, current_username):
    """
    Mark a specific notification as read
    """
    result = database.mark_notification_as_read(notification_id, current_user_id)
    return jsonify(result), 200 if result['success'] else 400

@notifications_bp.route('/api/notifications/read-all', methods=['PUT'])
@token_required
def mark_all_notifications_read(current_user_id, current_username):
    """
    Mark all notifications for the authenticated user as read
    """
    result = database.mark_all_notifications_as_read(current_user_id)
    return jsonify(result), 200 if result['success'] else 500

@notifications_bp.route('/api/notifications/<int:notification_id>', methods=['DELETE'])
@token_required
def delete_notification_endpoint(notification_id, current_user_id, current_username):
    """
    Delete a specific notification
    """
    result = database.delete_notification(notification_id, current_user_id)
    return jsonify(result), 200 if result['success'] else 400
