"""
Course-related database operations
Handles course CRUD operations
"""

import sqlite3
from typing import Dict, List, Optional
from .db_core import DATABASE_NAME

def create_course(code: str, name: str, semester: str = None, term: str = None, description: str = None) -> Dict:
    """
    Create a new course
    Returns: {'success': bool, 'message': str, 'id': int (if successful)}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO courses (code, name, semester, term, description)
            VALUES (?, ?, ?, ?, ?)
        ''', (code, name, semester, term, description))
        
        conn.commit()
        course_id = cursor.lastrowid
        conn.close()
        
        return {'success': True, 'message': 'Course created successfully', 'id': course_id}
    
    except sqlite3.IntegrityError:
        return {'success': False, 'message': 'Course code already exists'}
    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}

def get_course_by_id(course_id: int) -> Optional[Dict]:
    """
    Get a course by ID
    Returns: Dict with course data or None if not found
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute('SELECT * FROM courses WHERE id = ?', (course_id,))
        row = cursor.fetchone()

        conn.close()

        if row:
            return dict(row)
        return None

    except Exception:
        return None

def get_all_courses() -> Dict:
    """
    Get all courses
    Returns: {'success': bool, 'data': List[Dict] or 'message': str}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute('SELECT * FROM courses ORDER BY name')
        rows = cursor.fetchall()

        conn.close()

        courses = [dict(row) for row in rows]
        return {'success': True, 'data': courses}

    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}

def update_course(course_id: int, code: str = None, name: str = None, semester: str = None, term: str = None, description: str = None) -> Dict:
    """
    Update course information
    Only updates fields that are provided (not None)
    Returns: {'success': bool, 'message': str}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()
        
        update_fields = []
        values = []
        
        if code is not None:
            update_fields.append('code = ?')
            values.append(code)
        
        if name is not None:
            update_fields.append('name = ?')
            values.append(name)
        
        if semester is not None:
            update_fields.append('semester = ?')
            values.append(semester)
        
        if term is not None:
            update_fields.append('term = ?')
            values.append(term)
        
        if description is not None:
            update_fields.append('description = ?')
            values.append(description)
        
        if not update_fields:
            return {'success': False, 'message': 'No fields to update'}
        
        values.append(course_id)
        query = f"UPDATE courses SET {', '.join(update_fields)} WHERE id = ?"
        
        cursor.execute(query, values)
        conn.commit()
        
        if cursor.rowcount == 0:
            conn.close()
            return {'success': False, 'message': 'Course not found'}
        
        conn.close()
        return {'success': True, 'message': 'Course updated successfully'}
    
    except sqlite3.IntegrityError:
        return {'success': False, 'message': 'Course name already exists'}
    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}

def delete_course(course_id: int) -> Dict:
    """
    Delete a course
    Returns: {'success': bool, 'message': str}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM courses WHERE id = ?', (course_id,))
        conn.commit()
        
        if cursor.rowcount == 0:
            conn.close()
            return {'success': False, 'message': 'Course not found'}
        
        conn.close()
        return {'success': True, 'message': 'Course deleted successfully'}
    
    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}

def assign_project_to_course(project_id: int, course_id: int) -> Dict:
    """
    Assign a project to a course (replaces existing assignment if any)
    Returns: {'success': bool, 'message': str}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()
        
        # Check if project already has a course assigned
        cursor.execute('SELECT course_id FROM project_course WHERE project_id = ?', (project_id,))
        existing = cursor.fetchone()
        
        if existing:
            # Update existing assignment
            cursor.execute('''
                UPDATE project_course 
                SET course_id = ?, assigned_at = CURRENT_TIMESTAMP
                WHERE project_id = ?
            ''', (course_id, project_id))
        else:
            # Create new assignment
            cursor.execute('''
                INSERT INTO project_course (project_id, course_id)
                VALUES (?, ?)
            ''', (project_id, course_id))
        
        conn.commit()
        conn.close()
        
        return {'success': True, 'message': 'Project assigned to course successfully'}
    
    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}

def unassign_project_from_course(project_id: int) -> Dict:
    """
    Remove course assignment from a project
    Returns: {'success': bool, 'message': str}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM project_course WHERE project_id = ?', (project_id,))
        conn.commit()
        
        if cursor.rowcount == 0:
            conn.close()
            return {'success': False, 'message': 'Project has no course assignment'}
        
        conn.close()
        return {'success': True, 'message': 'Course assignment removed successfully'}
    
    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}

def get_projects_by_course(course_id: int) -> Dict:
    """
    Get all projects assigned to a course
    Returns: {'success': bool, 'data': List[Dict] or 'message': str}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT p.*
            FROM projects p
            JOIN project_course pc ON p.id = pc.project_id
            WHERE pc.course_id = ?
            ORDER BY p.created_at DESC
        ''', (course_id,))
        
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
            
            # Get tags for each project
            cursor.execute('''
                SELECT tag FROM project_tags WHERE project_id = ?
            ''', (project['id'],))
            
            project['tags'] = [tag_row['tag'] for tag_row in cursor.fetchall()]
            projects.append(project)
        
        conn.close()
        return {'success': True, 'data': projects}
    
    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}

def get_project_course(project_id: int) -> Optional[Dict]:
    """
    Get the course assigned to a project
    Returns: Dict with course data or None if no course assigned
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT c.*
            FROM courses c
            JOIN project_course pc ON c.id = pc.course_id
            WHERE pc.project_id = ?
        ''', (project_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return dict(row)
        return None
    
    except Exception:
        return None

