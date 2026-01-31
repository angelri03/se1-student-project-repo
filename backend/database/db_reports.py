"""
Database operations for reports
Handles creating and managing user/project reports
"""

import sqlite3
from typing import Dict, List, Optional
from datetime import datetime
from .db_core import DATABASE_NAME


def create_report(reporter_id: int, reason: str, reported_user_id: int = None, 
                  reported_project_id: int = None) -> Dict:
    """
    Create a new report for a user or project
    Either reported_user_id or reported_project_id must be provided
    Returns: {'success': bool, 'message': str, 'report_id': int (if success)}
    """
    if not reported_user_id and not reported_project_id:
        return {'success': False, 'message': 'Must specify either a user or project to report'}
    
    if reported_user_id and reported_project_id:
        return {'success': False, 'message': 'Can only report a user or project, not both'}
    
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO reports (reporter_id, reported_user_id, reported_project_id, reason, status)
            VALUES (?, ?, ?, ?, 'pending')
        ''', (reporter_id, reported_user_id, reported_project_id, reason))
        
        conn.commit()
        report_id = cursor.lastrowid
        conn.close()
        
        return {
            'success': True, 
            'message': 'Report submitted successfully',
            'report_id': report_id
        }
    
    except Exception as e:
        return {'success': False, 'message': f'Error creating report: {str(e)}'}


def get_all_reports(status: str = None) -> Dict:
    """
    Get all reports, optionally filtered by status
    Returns: {'success': bool, 'reports': List[Dict]}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        if status:
            cursor.execute('''
                SELECT r.*, 
                       u_reporter.username as reporter_username,
                       u_reported.username as reported_username,
                       p.name as reported_project_name,
                       u_resolver.username as resolved_by_username
                FROM reports r
                JOIN users u_reporter ON r.reporter_id = u_reporter.id
                LEFT JOIN users u_reported ON r.reported_user_id = u_reported.id
                LEFT JOIN projects p ON r.reported_project_id = p.id
                LEFT JOIN users u_resolver ON r.resolved_by = u_resolver.id
                WHERE r.status = ?
                ORDER BY r.created_at DESC
            ''', (status,))
        else:
            cursor.execute('''
                SELECT r.*, 
                       u_reporter.username as reporter_username,
                       u_reported.username as reported_username,
                       p.name as reported_project_name,
                       u_resolver.username as resolved_by_username
                FROM reports r
                JOIN users u_reporter ON r.reporter_id = u_reporter.id
                LEFT JOIN users u_reported ON r.reported_user_id = u_reported.id
                LEFT JOIN projects p ON r.reported_project_id = p.id
                LEFT JOIN users u_resolver ON r.resolved_by = u_resolver.id
                ORDER BY r.created_at DESC
            ''')
        
        reports = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return {'success': True, 'reports': reports}
    
    except Exception as e:
        return {'success': False, 'message': f'Error fetching reports: {str(e)}', 'reports': []}


def get_report_by_id(report_id: int) -> Optional[Dict]:
    """
    Get a specific report by ID
    Returns: Dict with report data or None if not found
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT r.*, 
                   u_reporter.username as reporter_username,
                   u_reported.username as reported_username,
                   p.name as reported_project_name,
                   u_resolver.username as resolved_by_username
            FROM reports r
            JOIN users u_reporter ON r.reporter_id = u_reporter.id
            LEFT JOIN users u_reported ON r.reported_user_id = u_reported.id
            LEFT JOIN projects p ON r.reported_project_id = p.id
            LEFT JOIN users u_resolver ON r.resolved_by = u_resolver.id
            WHERE r.id = ?
        ''', (report_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        return dict(row) if row else None
    
    except Exception:
        return None


def update_report_status(report_id: int, status: str, admin_id: int, 
                         admin_notes: str = None) -> Dict:
    """
    Update the status of a report (e.g., 'pending', 'resolved', 'dismissed')
    Returns: {'success': bool, 'message': str}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()
        
        if status == 'resolved' or status == 'dismissed':
            cursor.execute('''
                UPDATE reports 
                SET status = ?, admin_notes = ?, resolved_by = ?, resolved_at = ?
                WHERE id = ?
            ''', (status, admin_notes, admin_id, datetime.now().isoformat(), report_id))
        else:
            cursor.execute('''
                UPDATE reports 
                SET status = ?, admin_notes = ?
                WHERE id = ?
            ''', (status, admin_notes, report_id))
        
        conn.commit()
        
        if cursor.rowcount == 0:
            conn.close()
            return {'success': False, 'message': 'Report not found'}
        
        conn.close()
        return {'success': True, 'message': 'Report updated successfully'}
    
    except Exception as e:
        return {'success': False, 'message': f'Error updating report: {str(e)}'}


def delete_report(report_id: int) -> Dict:
    """
    Delete a report
    Returns: {'success': bool, 'message': str}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM reports WHERE id = ?', (report_id,))
        conn.commit()
        
        if cursor.rowcount == 0:
            conn.close()
            return {'success': False, 'message': 'Report not found'}
        
        conn.close()
        return {'success': True, 'message': 'Report deleted successfully'}
    
    except Exception as e:
        return {'success': False, 'message': f'Error deleting report: {str(e)}'}


def get_pending_reports_count() -> Dict:
    """
    Get the count of pending reports
    Returns: {'success': bool, 'count': int}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) FROM reports WHERE status = ?', ('pending',))
        count = cursor.fetchone()[0]
        
        conn.close()
        return {'success': True, 'count': count}
    
    except Exception as e:
        return {'success': False, 'message': f'Error counting reports: {str(e)}', 'count': 0}
