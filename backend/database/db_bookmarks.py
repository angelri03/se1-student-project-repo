"""
Bookmark-related database operations
Handles adding, removing, and retrieving bookmarks
"""

import sqlite3
from typing import Dict, List, Optional
from .db_core import DATABASE_NAME

def add_bookmark(user_id: int, project_id: int) -> Dict:
    """
    Add a bookmark for a user
    Returns: {'success': bool, 'message': str}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()
        
        # Check if project exists
        cursor.execute('SELECT id FROM projects WHERE id = ?', (project_id,))
        if not cursor.fetchone():
            conn.close()
            return {'success': False, 'message': 'Project not found'}
        
        # Check if already bookmarked
        cursor.execute('''
            SELECT id FROM bookmarks WHERE user_id = ? AND project_id = ?
        ''', (user_id, project_id))
        
        if cursor.fetchone():
            conn.close()
            return {'success': False, 'message': 'Project already bookmarked'}
        
        # Add bookmark
        cursor.execute('''
            INSERT INTO bookmarks (user_id, project_id)
            VALUES (?, ?)
        ''', (user_id, project_id))
        
        conn.commit()
        conn.close()
        
        return {'success': True, 'message': 'Bookmark added successfully'}
    
    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}

def remove_bookmark(user_id: int, project_id: int) -> Dict:
    """
    Remove a bookmark for a user
    Returns: {'success': bool, 'message': str}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()
        
        # Check if bookmark exists
        cursor.execute('''
            SELECT id FROM bookmarks WHERE user_id = ? AND project_id = ?
        ''', (user_id, project_id))
        
        if not cursor.fetchone():
            conn.close()
            return {'success': False, 'message': 'Bookmark not found'}
        
        # Remove bookmark
        cursor.execute('''
            DELETE FROM bookmarks WHERE user_id = ? AND project_id = ?
        ''', (user_id, project_id))
        
        conn.commit()
        conn.close()
        
        return {'success': True, 'message': 'Bookmark removed successfully'}
    
    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}

def get_user_bookmarks(user_id: int) -> Dict:
    """
    Get all bookmarked projects for a user with full project details
    Returns: {'success': bool, 'data': List[Dict], 'message': str (if error)}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get all bookmarked projects with details
        cursor.execute('''
            SELECT 
                p.id, p.name, p.description, p.file_path, p.file_size,
                p.approved, p.created_at, p.updated_at
            FROM bookmarks b
            JOIN projects p ON b.project_id = p.id
            WHERE b.user_id = ?
            ORDER BY b.created_at DESC
        ''', (user_id,))
        
        projects = []
        for row in cursor.fetchall():
            project = dict(row)
            project_id = project['id']
            
            # Get owners
            cursor.execute('''
                SELECT u.id, u.username, u.email
                FROM project_owners po
                JOIN users u ON po.user_id = u.id
                WHERE po.project_id = ?
            ''', (project_id,))
            
            project['owners'] = [dict(owner_row) for owner_row in cursor.fetchall()]
            
            # Get tags
            cursor.execute('''
                SELECT t.name
                FROM project_tags pt
                JOIN topics t ON pt.topic_id = t.id
                WHERE pt.project_id = ?
            ''', (project_id,))
            
            project['tags'] = [row['name'] for row in cursor.fetchall()]
            
            projects.append(project)
        
        conn.close()
        
        return {'success': True, 'data': projects}
    
    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}', 'data': []}

def is_bookmarked(user_id: int, project_id: int) -> bool:
    """
    Check if a project is bookmarked by a user
    Returns: bool
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id FROM bookmarks WHERE user_id = ? AND project_id = ?
        ''', (user_id, project_id))
        
        result = cursor.fetchone()
        conn.close()
        
        return result is not None
    
    except Exception as e:
        return False

def get_bookmark_count(project_id: int) -> int:
    """
    Get the number of bookmarks for a project
    Returns: int
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT COUNT(*) as count FROM bookmarks WHERE project_id = ?
        ''', (project_id,))
        
        result = cursor.fetchone()
        conn.close()
        
        return result[0] if result else 0
    
    except Exception as e:
        return 0
