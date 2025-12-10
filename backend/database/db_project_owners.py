"""
Project owners database operations
Handles the many-to-many relationship between users and projects
All owners have equal privileges
"""

import sqlite3
from typing import Dict, List
from .db_core import DATABASE_NAME

def add_owner_to_project(project_id: int, user_id: int) -> Dict:
    """
    Add a user as an owner of a project
    Returns: {'success': bool, 'message': str}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()
        
        # Check if user is already an owner
        cursor.execute('''
            SELECT id FROM project_owners 
            WHERE project_id = ? AND user_id = ?
        ''', (project_id, user_id))
        
        if cursor.fetchone():
            conn.close()
            return {'success': False, 'message': 'User is already an owner of this project'}
        
        cursor.execute('''
            INSERT INTO project_owners (project_id, user_id)
            VALUES (?, ?)
        ''', (project_id, user_id))
        
        conn.commit()
        conn.close()
        
        return {'success': True, 'message': 'Owner added successfully'}
    
    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}

def remove_owner_from_project(project_id: int, user_id: int) -> Dict:
    """
    Remove a user as an owner from a project
    Returns: {'success': bool, 'message': str}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()
        
        # Check how many owners are left
        cursor.execute('''
            SELECT COUNT(*) FROM project_owners WHERE project_id = ?
        ''', (project_id,))
        
        owner_count = cursor.fetchone()[0]
        
        if owner_count <= 1:
            conn.close()
            return {'success': False, 'message': 'Cannot remove the last owner from a project'}
        
        cursor.execute('''
            DELETE FROM project_owners 
            WHERE project_id = ? AND user_id = ?
        ''', (project_id, user_id))
        
        conn.commit()
        
        if cursor.rowcount == 0:
            conn.close()
            return {'success': False, 'message': 'User is not an owner of this project'}
        
        conn.close()
        return {'success': True, 'message': 'Owner removed successfully'}
    
    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}

def get_project_owners(project_id: int) -> Dict:
    """
    Get all owners of a project
    Returns: {'success': bool, 'data': List[Dict] or 'message': str}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT po.*, u.username, u.email
            FROM project_owners po
            JOIN users u ON po.user_id = u.id
            WHERE po.project_id = ?
            ORDER BY po.added_at ASC
        ''', (project_id,))
        
        rows = cursor.fetchall()
        owners = [dict(row) for row in rows]
        
        conn.close()
        return {'success': True, 'data': owners}
    
    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}

def get_user_projects(user_id: int) -> Dict:
    """
    Get all projects a user owns
    Returns: {'success': bool, 'data': List[Dict] or 'message': str}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT p.*
            FROM projects p
            JOIN project_owners po ON p.id = po.project_id
            WHERE po.user_id = ?
            ORDER BY p.created_at DESC
        ''', (user_id,))
        
        rows = cursor.fetchall()
        projects = []
        
        for row in rows:
            project = dict(row)
            
            # Get tags for each project (join with topics table)
            cursor.execute('''
                SELECT t.name FROM project_tags pt
                JOIN topics t ON pt.topic_id = t.id
                WHERE pt.project_id = ?
            ''', (project['id'],))

            project['tags'] = [tag_row['name'] for tag_row in cursor.fetchall()]
            
            # Get all owners for each project
            cursor.execute('''
                SELECT u.id, u.username, u.email
                FROM users u
                JOIN project_owners po ON u.id = po.user_id
                WHERE po.project_id = ?
            ''', (project['id'],))
            
            project['owners'] = [dict(owner_row) for owner_row in cursor.fetchall()]
            
            projects.append(project)
        
        conn.close()
        return {'success': True, 'data': projects}
    
    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}

def is_project_owner(project_id: int, user_id: int) -> bool:
    """
    Check if a user is an owner of a project
    Returns: True if owner, False otherwise
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id FROM project_owners 
            WHERE project_id = ? AND user_id = ?
        ''', (project_id, user_id))
        
        result = cursor.fetchone() is not None
        conn.close()
        
        return result
    
    except Exception:
        return False

def get_owner_usernames(project_id: int) -> List[str]:
    """
    Get a list of all owner usernames for a project
    Returns: List of usernames
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT u.username
            FROM users u
            JOIN project_owners po ON u.id = po.user_id
            WHERE po.project_id = ?
            ORDER BY po.added_at ASC
        ''', (project_id,))
        
        usernames = [row[0] for row in cursor.fetchall()]
        conn.close()
        
        return usernames
    
    except Exception:
        return []