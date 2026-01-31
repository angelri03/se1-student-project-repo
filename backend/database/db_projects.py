"""
Project-related database operations
Handles project CRUD operations, tags, and search functionality
"""

import sqlite3
from typing import Dict, List, Optional
from datetime import datetime
from .db_core import DATABASE_NAME

def create_project(name: str, description: str, file_path: str, file_size: int, creator_user_id: int) -> Dict:
    """
    Create a new project entry and add the creator as the first owner
    Returns: {'success': bool, 'message': str, 'id': int (if successful)}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO projects (name, description, file_path, file_size, approved)
            VALUES (?, ?, ?, ?, 0)
        ''', (name, description, file_path, file_size))
        
        project_id = cursor.lastrowid
        
        # Automatically add the creator as the first owner
        cursor.execute('''
            INSERT INTO project_owners (project_id, user_id)
            VALUES (?, ?)
        ''', (project_id, creator_user_id))
        
        conn.commit()
        conn.close()
        
        return {'success': True, 'message': 'Project created successfully', 'id': project_id}
    
    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}

def get_project_by_id(project_id: int) -> Optional[Dict]:
    """
    Get a project by ID with its owner information and tags
    Returns: Dict with project data including owners and tags, or None if not found
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get project
        cursor.execute('SELECT * FROM projects WHERE id = ?', (project_id,))
        
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            return None
        
        project = dict(row)
        
        # Get all owners for this project
        cursor.execute('''
            SELECT u.id, u.username, u.email
            FROM users u
            JOIN project_owners po ON u.id = po.user_id
            WHERE po.project_id = ?
            ORDER BY po.added_at ASC
        ''', (project_id,))
        
        project['owners'] = [dict(owner_row) for owner_row in cursor.fetchall()]
        
        # Get tags for this project (join with topics table)
        cursor.execute('''
            SELECT t.name FROM project_tags pt
            JOIN topics t ON pt.topic_id = t.id
            WHERE pt.project_id = ?
        ''', (project_id,))

        tags = [tag_row['name'] for tag_row in cursor.fetchall()]
        project['tags'] = tags
        
        # Get last editor's username if available
        if project.get('last_edited_by_id'):
            cursor.execute('SELECT username FROM users WHERE id = ?', (project['last_edited_by_id'],))
            editor_row = cursor.fetchone()
            if editor_row:
                project['last_edited_by'] = editor_row['username']
        
        conn.close()
        return project
    
    except Exception:
        return None

def get_all_approved_projects() -> Dict:
    """
    Get all approved projects
    Returns: {'success': bool, 'data': List[Dict] or 'message': str}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM projects
            WHERE approved = 1
            ORDER BY created_at DESC
        ''')
        
        rows = cursor.fetchall()
        projects = []
        
        for row in rows:
            project = dict(row)
            
            # Get owners for each project
            cursor.execute('''
                SELECT u.id, u.username, u.email
                FROM users u
                JOIN project_owners po ON u.id = po.user_id
                WHERE po.project_id = ?
            ''', (project['id'],))
            
            project['owners'] = [dict(owner_row) for owner_row in cursor.fetchall()]
            
            # Get tags for each project (join with topics table)
            cursor.execute('''
                SELECT t.name FROM project_tags pt
                JOIN topics t ON pt.topic_id = t.id
                WHERE pt.project_id = ?
            ''', (project['id'],))

            project['tags'] = [tag_row['name'] for tag_row in cursor.fetchall()]
            
            # Get average rating for each project
            cursor.execute('''
                SELECT AVG(rating) as avg_rating, COUNT(*) as total_ratings
                FROM project_ratings
                WHERE project_id = ?
            ''', (project['id'],))
            rating_row = cursor.fetchone()
            project['average_rating'] = round(rating_row['avg_rating'], 2) if rating_row['avg_rating'] else None
            project['total_ratings'] = rating_row['total_ratings'] if rating_row['total_ratings'] else 0
            
            projects.append(project)

        conn.close()
        return {'success': True, 'data': projects}

    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}

def get_all_projects() -> Dict:
    """
    Get ALL projects (approved and unapproved) - for admin use
    Returns: {'success': bool, 'data': List[Dict] or 'message': str}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM projects
            ORDER BY approved ASC, created_at DESC
        ''')
        
        rows = cursor.fetchall()
        projects = []
        
        for row in rows:
            project = dict(row)
            
            # Get owners for each project
            cursor.execute('''
                SELECT u.id, u.username, u.email
                FROM users u
                JOIN project_owners po ON u.id = po.user_id
                WHERE po.project_id = ?
            ''', (project['id'],))
            
            project['owners'] = [dict(owner_row) for owner_row in cursor.fetchall()]
            
            # Get tags for each project (join with topics table)
            cursor.execute('''
                SELECT t.name FROM project_tags pt
                JOIN topics t ON pt.topic_id = t.id
                WHERE pt.project_id = ?
            ''', (project['id'],))

            project['tags'] = [tag_row['name'] for tag_row in cursor.fetchall()]
            
            # Get average rating for each project
            cursor.execute('''
                SELECT AVG(rating) as avg_rating, COUNT(*) as total_ratings
                FROM project_ratings
                WHERE project_id = ?
            ''', (project['id'],))
            rating_row = cursor.fetchone()
            project['average_rating'] = round(rating_row['avg_rating'], 2) if rating_row['avg_rating'] else None
            project['total_ratings'] = rating_row['total_ratings'] if rating_row['total_ratings'] else 0
            
            projects.append(project)

        conn.close()
        return {'success': True, 'data': projects}

    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}

def search_projects_by_tag(tag: str) -> Dict:
    """
    Search for approved projects by tag (topic name)
    Returns: {'success': bool, 'data': List[Dict] or 'message': str}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute('''
            SELECT DISTINCT p.*
            FROM projects p
            JOIN project_tags pt ON p.id = pt.project_id
            JOIN topics t ON pt.topic_id = t.id
            WHERE LOWER(t.name) = ? AND p.approved = 1
            ORDER BY p.created_at DESC
        ''', (tag.lower(),))

        rows = cursor.fetchall()
        projects = []

        for row in rows:
            project = dict(row)

            # Get owners for each project
            cursor.execute('''
                SELECT u.id, u.username, u.email
                FROM users u
                JOIN project_owners po ON u.id = po.user_id
                WHERE po.project_id = ?
            ''', (project['id'],))

            project['owners'] = [dict(owner_row) for owner_row in cursor.fetchall()]

            # Get all tags for each project (join with topics table)
            cursor.execute('''
                SELECT t.name FROM project_tags pt
                JOIN topics t ON pt.topic_id = t.id
                WHERE pt.project_id = ?
            ''', (project['id'],))

            project['tags'] = [tag_row['name'] for tag_row in cursor.fetchall()]
            projects.append(project)

        conn.close()
        return {'success': True, 'data': projects}

    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}

def update_project(project_id: int, name: str = None, description: str = None, 
                   file_path: str = None, file_size: int = None, last_edited_by_id: int = None) -> Dict:
    """
    Update project information
    Only updates fields that are provided (not None)
    Automatically updates the updated_at timestamp
    Returns: {'success': bool, 'message': str}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()
        
        update_fields = []
        values = []
        
        if name is not None:
            update_fields.append('name = ?')
            values.append(name)
        
        if description is not None:
            update_fields.append('description = ?')
            values.append(description)
        
        if file_path is not None:
            update_fields.append('file_path = ?')
            values.append(file_path)
        
        if file_size is not None:
            update_fields.append('file_size = ?')
            values.append(file_size)
        
        if last_edited_by_id is not None:
            update_fields.append('last_edited_by_id = ?')
            values.append(last_edited_by_id)
        
        if not update_fields:
            return {'success': False, 'message': 'No fields to update'}
        
        # Always update the timestamp
        update_fields.append('updated_at = ?')
        values.append(datetime.now().isoformat())
        
        values.append(project_id)
        query = f"UPDATE projects SET {', '.join(update_fields)} WHERE id = ?"
        
        cursor.execute(query, values)
        conn.commit()
        
        if cursor.rowcount == 0:
            conn.close()
            return {'success': False, 'message': 'Project not found'}
        
        conn.close()
        return {'success': True, 'message': 'Project updated successfully'}
    
    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}

def approve_project(project_id: int) -> Dict:
    """
    Approve a project (admin function)
    Returns: {'success': bool, 'message': str}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()
        
        cursor.execute('UPDATE projects SET approved = 1 WHERE id = ?', (project_id,))
        conn.commit()
        
        if cursor.rowcount == 0:
            conn.close()
            return {'success': False, 'message': 'Project not found'}
        
        conn.close()
        return {'success': True, 'message': 'Project approved successfully'}
    
    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}

def unapprove_project(project_id: int) -> Dict:
    """
    Unapprove a project (admin function)
    Returns: {'success': bool, 'message': str}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()
        
        cursor.execute('UPDATE projects SET approved = 0 WHERE id = ?', (project_id,))
        conn.commit()
        
        if cursor.rowcount == 0:
            conn.close()
            return {'success': False, 'message': 'Project not found'}
        
        conn.close()
        return {'success': True, 'message': 'Project unapproved successfully'}
    
    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}

def delete_project(project_id: int) -> Dict:
    """
    Delete a project and all its tags and owners
    Returns: {'success': bool, 'message': str}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM projects WHERE id = ?', (project_id,))
        conn.commit()
        
        if cursor.rowcount == 0:
            conn.close()
            return {'success': False, 'message': 'Project not found'}
        
        conn.close()
        return {'success': True, 'message': 'Project deleted successfully'}
    
    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}

# ===== TAG FUNCTIONS =====

def _get_or_create_topic(cursor, topic_name: str) -> int:
    """
    Get a topic by name or create it if it doesn't exist.
    Returns the topic_id.
    """
    topic_name = topic_name.lower().strip()

    # Check if topic exists
    cursor.execute('SELECT id FROM topics WHERE LOWER(name) = ?', (topic_name,))
    row = cursor.fetchone()

    if row:
        return row[0]

    # Create the topic
    cursor.execute('INSERT INTO topics (name) VALUES (?)', (topic_name,))
    return cursor.lastrowid

def add_tag_to_project(project_id: int, tag: str) -> Dict:
    """
    Add a tag (topic) to a project
    Creates the topic if it doesn't exist
    Returns: {'success': bool, 'message': str}
    """
    tag = tag.lower().strip()

    if not tag:
        return {'success': False, 'message': 'Tag cannot be empty'}

    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()

        # Get or create the topic
        topic_id = _get_or_create_topic(cursor, tag)

        # Check if tag already exists for this project
        cursor.execute('''
            SELECT id FROM project_tags
            WHERE project_id = ? AND topic_id = ?
        ''', (project_id, topic_id))

        if cursor.fetchone():
            conn.close()
            return {'success': False, 'message': 'Tag already exists for this project'}

        cursor.execute('''
            INSERT INTO project_tags (project_id, topic_id)
            VALUES (?, ?)
        ''', (project_id, topic_id))

        conn.commit()
        conn.close()

        return {'success': True, 'message': 'Tag added successfully'}

    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}

def remove_tag_from_project(project_id: int, tag: str) -> Dict:
    """
    Remove a tag (topic) from a project
    Returns: {'success': bool, 'message': str}
    """
    tag = tag.lower().strip()

    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()

        # Find the topic id
        cursor.execute('SELECT id FROM topics WHERE LOWER(name) = ?', (tag,))
        topic_row = cursor.fetchone()

        if not topic_row:
            conn.close()
            return {'success': False, 'message': 'Tag not found'}

        topic_id = topic_row[0]

        cursor.execute('''
            DELETE FROM project_tags
            WHERE project_id = ? AND topic_id = ?
        ''', (project_id, topic_id))

        conn.commit()

        if cursor.rowcount == 0:
            conn.close()
            return {'success': False, 'message': 'Tag not found'}

        conn.close()
        return {'success': True, 'message': 'Tag removed successfully'}

    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}

def set_project_tags(project_id: int, tags: List[str]) -> Dict:
    """
    Set all tags (topics) for a project (replaces existing tags)
    Creates topics if they don't exist
    Returns: {'success': bool, 'message': str}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()

        # Remove all existing tags
        cursor.execute('DELETE FROM project_tags WHERE project_id = ?', (project_id,))

        # Add new tags
        for tag in tags:
            tag = tag.lower().strip()
            if tag:  # Only add non-empty tags
                topic_id = _get_or_create_topic(cursor, tag)
                cursor.execute('''
                    INSERT OR IGNORE INTO project_tags (project_id, topic_id)
                    VALUES (?, ?)
                ''', (project_id, topic_id))

        conn.commit()
        conn.close()

        return {'success': True, 'message': 'Tags updated successfully'}

    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}

def get_all_tags() -> Dict:
    """
    Get all unique tags (topics) that are used by projects
    Returns: {'success': bool, 'data': List[str] or 'message': str}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT DISTINCT t.name FROM topics t
            JOIN project_tags pt ON t.id = pt.topic_id
            ORDER BY t.name
        ''')
        tags = [row[0] for row in cursor.fetchall()]

        conn.close()
        return {'success': True, 'data': tags}

    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}