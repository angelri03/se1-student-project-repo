"""
Project media-related database operations
Handles media attachments for projects (images, videos, etc.)
"""

import sqlite3
from typing import Dict, List, Optional
from .db_core import DATABASE_NAME


def add_project_media(project_id: int, file_path: str, file_name: str, file_type: str, file_size: int) -> Dict:
    """
    Add a media attachment to a project
    Returns: {'success': bool, 'message': str, 'id': int (if successful)}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO project_media (project_id, file_path, file_name, file_type, file_size)
            VALUES (?, ?, ?, ?, ?)
        ''', (project_id, file_path, file_name, file_type, file_size))
        
        media_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return {'success': True, 'message': 'Media added successfully', 'id': media_id}
    
    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}


def get_project_media(project_id: int) -> List[Dict]:
    """
    Get all media attachments for a project
    Returns: List of media dictionaries
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM project_media
            WHERE project_id = ?
            ORDER BY created_at ASC
        ''', (project_id,))
        
        rows = cursor.fetchall()
        media = [dict(row) for row in rows]
        
        conn.close()
        return media
    
    except Exception:
        return []


def delete_project_media(media_id: int) -> Dict:
    """
    Delete a media attachment
    Returns: {'success': bool, 'message': str}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()
        
        # Get file path before deleting
        cursor.execute('SELECT file_path FROM project_media WHERE id = ?', (media_id,))
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            return {'success': False, 'message': 'Media not found'}
        
        file_path = row[0]
        
        cursor.execute('DELETE FROM project_media WHERE id = ?', (media_id,))
        conn.commit()
        conn.close()
        
        return {'success': True, 'message': 'Media deleted successfully', 'file_path': file_path}
    
    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}


def get_media_by_id(media_id: int) -> Optional[Dict]:
    """
    Get a specific media attachment by ID
    Returns: Media dict or None
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM project_media WHERE id = ?', (media_id,))
        row = cursor.fetchone()
        
        conn.close()
        
        if row:
            return dict(row)
        return None
    
    except Exception:
        return None
