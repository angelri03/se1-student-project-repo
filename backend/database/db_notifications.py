"""
Notification-related database operations
Handles notification CRUD operations
"""

import sqlite3
from typing import Dict, List, Optional
from .db_core import DATABASE_NAME, get_connection

def create_notification(user_id: int, project_id: Optional[int], type: str, message: str) -> Dict:
    """
    Create a new notification for a user
    Returns: {'success': bool, 'message': str, 'id': int (if successful)}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO notifications (user_id, project_id, type, message)
            VALUES (?, ?, ?, ?)
        ''', (user_id, project_id, type, message))
        
        conn.commit()
        notification_id = cursor.lastrowid
        conn.close()
        
        return {'success': True, 'message': 'Notification created successfully', 'id': notification_id}
    
    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}

def get_user_notifications(user_id: int, unread_only: bool = False) -> Dict:
    """
    Get all notifications for a user
    Args:
        user_id: The user ID
        unread_only: If True, only return unread notifications
    Returns: Dict with success and list of notifications
    """
    try:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        if unread_only:
            cursor.execute('''
                SELECT n.*, p.name as project_name
                FROM notifications n
                LEFT JOIN projects p ON n.project_id = p.id
                WHERE n.user_id = ? AND n.is_read = 0
                ORDER BY n.created_at DESC
            ''', (user_id,))
        else:
            cursor.execute('''
                SELECT n.*, p.name as project_name
                FROM notifications n
                LEFT JOIN projects p ON n.project_id = p.id
                WHERE n.user_id = ?
                ORDER BY n.created_at DESC
            ''', (user_id,))
        
        notifications = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return {'success': True, 'notifications': notifications}
    
    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}

def mark_notification_as_read(notification_id: int, user_id: int) -> Dict:
    """
    Mark a notification as read
    Only the owner of the notification can mark it as read
    Returns: {'success': bool, 'message': str}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Verify the notification belongs to the user
        cursor.execute('''
            SELECT id FROM notifications
            WHERE id = ? AND user_id = ?
        ''', (notification_id, user_id))
        
        if not cursor.fetchone():
            conn.close()
            return {'success': False, 'message': 'Notification not found or access denied'}
        
        cursor.execute('''
            UPDATE notifications
            SET is_read = 1
            WHERE id = ? AND user_id = ?
        ''', (notification_id, user_id))
        
        conn.commit()
        conn.close()
        
        return {'success': True, 'message': 'Notification marked as read'}
    
    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}

def mark_all_notifications_as_read(user_id: int) -> Dict:
    """
    Mark all notifications for a user as read
    Returns: {'success': bool, 'message': str}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE notifications
            SET is_read = 1
            WHERE user_id = ? AND is_read = 0
        ''', (user_id,))
        
        conn.commit()
        conn.close()
        
        return {'success': True, 'message': 'All notifications marked as read'}
    
    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}

def delete_notification(notification_id: int, user_id: int) -> Dict:
    """
    Delete a notification
    Only the owner of the notification can delete it
    Returns: {'success': bool, 'message': str}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Verify the notification belongs to the user
        cursor.execute('''
            SELECT id FROM notifications
            WHERE id = ? AND user_id = ?
        ''', (notification_id, user_id))
        
        if not cursor.fetchone():
            conn.close()
            return {'success': False, 'message': 'Notification not found or access denied'}
        
        cursor.execute('''
            DELETE FROM notifications
            WHERE id = ? AND user_id = ?
        ''', (notification_id, user_id))
        
        conn.commit()
        conn.close()
        
        return {'success': True, 'message': 'Notification deleted successfully'}
    
    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}

def get_unread_count(user_id: int) -> Dict:
    """
    Get the count of unread notifications for a user
    Returns: Dict with success and count
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT COUNT(*) as count
            FROM notifications
            WHERE user_id = ? AND is_read = 0
        ''', (user_id,))
        
        count = cursor.fetchone()[0]
        conn.close()
        
        return {'success': True, 'count': count}
    
    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}

def create_notification_for_project_owners(project_id: int, type: str, message: str, exclude_user_id: Optional[int] = None) -> Dict:
    """
    Create notifications for all owners of a project
    Args:
        project_id: The project ID
        type: Type of notification
        message: Notification message
        exclude_user_id: Optional user ID to exclude from notifications (e.g., the admin performing the action)
    Returns: Dict with success and count of notifications created
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Get all owners of the project
        if exclude_user_id:
            cursor.execute('''
                SELECT user_id FROM project_owners
                WHERE project_id = ? AND user_id != ?
            ''', (project_id, exclude_user_id))
        else:
            cursor.execute('''
                SELECT user_id FROM project_owners
                WHERE project_id = ?
            ''', (project_id,))
        
        owner_ids = [row[0] for row in cursor.fetchall()]
        
        # Create a notification for each owner
        for owner_id in owner_ids:
            cursor.execute('''
                INSERT INTO notifications (user_id, project_id, type, message)
                VALUES (?, ?, ?, ?)
            ''', (owner_id, project_id, type, message))
        
        conn.commit()
        conn.close()
        
        return {'success': True, 'message': f'{len(owner_ids)} notification(s) created', 'count': len(owner_ids)}
    
    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}
