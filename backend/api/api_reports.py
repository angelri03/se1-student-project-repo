"""
Reports API endpoints
Handles report submission and management
"""

from flask import Blueprint, request, jsonify
import database
from .auth import token_required

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/api/reports', methods=['POST'])
@token_required
def submit_report(current_user_id, current_username):
    """
    Submit a report for a user or project
    Expects JSON with: reason, and either reported_user_id or reported_project_id
    """
    data = request.get_json()
    
    if not data or 'reason' not in data:
        return jsonify({'success': False, 'message': 'Reason is required'}), 400
    
    reason = data.get('reason', '').strip()
    reported_user_id = data.get('reported_user_id')
    reported_project_id = data.get('reported_project_id')
    
    if not reason:
        return jsonify({'success': False, 'message': 'Reason cannot be empty'}), 400
    
    if not reported_user_id and not reported_project_id:
        return jsonify({'success': False, 'message': 'Must specify either a user or project to report'}), 400
    
    # Prevent users from reporting themselves
    if reported_user_id and reported_user_id == current_user_id:
        return jsonify({'success': False, 'message': 'You cannot report yourself'}), 400
    
    result = database.create_report(
        reporter_id=current_user_id,
        reason=reason,
        reported_user_id=reported_user_id,
        reported_project_id=reported_project_id
    )
    
    # If report was created successfully, notify all admins
    if result['success']:
        admin_ids = database.get_admin_user_ids()
        
        # Determine what was reported
        if reported_user_id:
            reported_user = database.get_user_by_id(reported_user_id)
            reported_name = reported_user.get('username', 'Unknown') if reported_user else 'Unknown'
            message = f"{current_username} reported user {reported_name}"
        else:
            reported_project = database.get_project_by_id(reported_project_id)
            reported_name = reported_project.get('name', 'Unknown') if reported_project else 'Unknown'
            message = f"{current_username} reported project '{reported_name}'"
        
        # Create notification for each admin
        for admin_id in admin_ids:
            database.create_notification(
                user_id=admin_id,
                project_id=reported_project_id,
                type='report',
                message=message
            )
    
    return jsonify(result), 201 if result['success'] else 400


@reports_bp.route('/api/reports', methods=['GET'])
@token_required
def get_reports(current_user_id, current_username):
    """
    Get all reports (admin only)
    Query parameter: status to filter by status (pending, resolved, dismissed)
    """
    if not database.is_admin(current_user_id):
        return jsonify({'success': False, 'message': 'Admin access required'}), 403
    
    status = request.args.get('status')
    result = database.get_all_reports(status)
    
    return jsonify(result), 200 if result['success'] else 500


@reports_bp.route('/api/reports/<int:report_id>', methods=['GET'])
@token_required
def get_report(report_id, current_user_id, current_username):
    """
    Get a specific report by ID (admin only)
    """
    if not database.is_admin(current_user_id):
        return jsonify({'success': False, 'message': 'Admin access required'}), 403
    
    report = database.get_report_by_id(report_id)
    
    if not report:
        return jsonify({'success': False, 'message': 'Report not found'}), 404
    
    return jsonify({'success': True, 'report': report}), 200


@reports_bp.route('/api/reports/<int:report_id>', methods=['PUT'])
@token_required
def update_report(report_id, current_user_id, current_username):
    """
    Update report status and add admin notes (admin only)
    Expects JSON with: status ('pending', 'resolved', 'dismissed') and optional admin_notes
    """
    if not database.is_admin(current_user_id):
        return jsonify({'success': False, 'message': 'Admin access required'}), 403
    
    data = request.get_json()
    
    if not data or 'status' not in data:
        return jsonify({'success': False, 'message': 'Status is required'}), 400
    
    status = data.get('status')
    admin_notes = data.get('admin_notes')
    
    if status not in ['pending', 'resolved', 'dismissed']:
        return jsonify({'success': False, 'message': 'Invalid status'}), 400
    
    result = database.update_report_status(report_id, status, current_user_id, admin_notes)
    
    return jsonify(result), 200 if result['success'] else 400


@reports_bp.route('/api/reports/<int:report_id>', methods=['DELETE'])
@token_required
def delete_report_endpoint(report_id, current_user_id, current_username):
    """
    Delete a report (admin only)
    """
    if not database.is_admin(current_user_id):
        return jsonify({'success': False, 'message': 'Admin access required'}), 403
    
    result = database.delete_report(report_id)
    
    return jsonify(result), 200 if result['success'] else 400


@reports_bp.route('/api/reports/pending-count', methods=['GET'])
@token_required
def get_pending_count(current_user_id, current_username):
    """
    Get count of pending reports (admin only)
    """
    if not database.is_admin(current_user_id):
        return jsonify({'success': False, 'message': 'Admin access required'}), 403
    
    result = database.get_pending_reports_count()
    
    return jsonify(result), 200 if result['success'] else 500
