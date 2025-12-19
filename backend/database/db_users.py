"""
User-related database operations
Handles user CRUD operations and authentication
"""

import sqlite3
import bcrypt
from typing import Dict, Optional
from .db_core import DATABASE_NAME, get_connection

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_user(username: str, password: str, email: str, is_student: int = 1, 
                semester: str = None, study_programme: str = None, organization: str = None) -> Dict:
    """
    Create a new user with hashed password
    Returns: {'success': bool, 'message': str, 'id': int (if successful)}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        hashed_password = hash_password(password)
        
        cursor.execute('''
            INSERT INTO users (username, password, email, is_student, semester, study_programme, organization)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (username, hashed_password, email, is_student, semester, study_programme, organization))
        
        conn.commit()
        user_id = cursor.lastrowid
        conn.close()
        
        return {'success': True, 'message': 'User created successfully', 'id': user_id}
    
    except sqlite3.IntegrityError:
        return {'success': False, 'message': 'Username or email already exists'}
    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}

def get_user_by_username(username: str) -> Optional[Dict]:
    """
    Get a user by username
    Returns: Dict with user data or None if not found
    """
    try:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
        row = cursor.fetchone()
        
        conn.close()
        
        if row:
            return dict(row)
        return None
    
    except Exception:
        return None

def get_user_by_id(user_id: int) -> Optional[Dict]:
    """
    Get a user by ID
    Returns: Dict with user data or None if not found
    """
    try:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
        row = cursor.fetchone()
        
        conn.close()
        
        if row:
            return dict(row)
        return None
    
    except Exception:
        return None

# Sentinel value for update_user to distinguish between None and not provided
_UNSET = object()

def update_user(user_id: int, username: str = None, password: str = None, email: str = None, bio: str = None,
                is_student: int = None, semester: str = None, study_programme: str = None, organization: str = None,
                admin: int = None, profile_picture = _UNSET) -> Dict:
    """
    Update user information
    Only updates fields that are provided (not None)
    Password will be hashed automatically if provided
    For profile_picture: pass a string path to set, None to remove, or omit to leave unchanged
    Returns: {'success': bool, 'message': str}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        update_fields = []
        values = []
        
        if username is not None:
            update_fields.append('username = ?')
            values.append(username)
        
        if password is not None:
            update_fields.append('password = ?')
            values.append(hash_password(password))
        
        if email is not None:
            update_fields.append('email = ?')
            values.append(email)
        
        if bio is not None:
            update_fields.append('bio = ?')
            values.append(bio)
        
        if is_student is not None:
            update_fields.append('is_student = ?')
            values.append(is_student)
        
        if semester is not None:
            update_fields.append('semester = ?')
            values.append(semester)
        
        if study_programme is not None:
            update_fields.append('study_programme = ?')
            values.append(study_programme)
        
        if organization is not None:
            update_fields.append('organization = ?')
            values.append(organization)

        if admin is not None:
            update_fields.append('admin = ?')
            values.append(admin)
        
        # Allow explicitly setting profile_picture to None to remove it
        if profile_picture is not _UNSET:
            update_fields.append('profile_picture = ?')
            values.append(profile_picture)
        
        if not update_fields:
            return {'success': False, 'message': 'No fields to update'}
        
        values.append(user_id)
        query = f"UPDATE users SET {', '.join(update_fields)} WHERE id = ?"
        
        cursor.execute(query, values)
        conn.commit()
        
        if cursor.rowcount == 0:
            conn.close()
            return {'success': False, 'message': 'User not found'}
        
        conn.close()
        return {'success': True, 'message': 'User updated successfully'}
    
    except sqlite3.IntegrityError:
        return {'success': False, 'message': 'Username or email already exists'}
    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}

def delete_user(user_id: int) -> Dict:
    """
    Delete a user
    Returns: {'success': bool, 'message': str}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute('DELETE FROM users WHERE id = ?', (user_id,))
        conn.commit()

        if cursor.rowcount == 0:
            conn.close()
            return {'success': False, 'message': 'User not found'}

        conn.close()
        return {'success': True, 'message': 'User deleted successfully'}

    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}

def is_admin(user_id: int) -> bool:
    """
    Check if a user is an admin
    Returns: True if user is admin, False otherwise
    """
    try:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute('SELECT admin FROM users WHERE id = ?', (user_id,))
        row = cursor.fetchone()

        conn.close()

        if row:
            return row['admin'] == 1
        return False

    except Exception:
        return False

def get_all_users() -> Dict:
    """
    Get all users (without password hashes)
    Returns: {'success': bool, 'data': List[Dict] or 'message': str}
    """
    try:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute('SELECT id, username, email, admin, created_at FROM users ORDER BY username ASC')
        rows = cursor.fetchall()

        conn.close()

        users = [dict(row) for row in rows]
        return {'success': True, 'data': users}

    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}


def flag_user(user_id: int, flagged_by: int, reason: str = None) -> Dict:
    """
    Insert a flag for a user. Returns {'success': bool}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()
        cursor.execute('INSERT INTO user_flags (user_id, flagged_by, reason) VALUES (?, ?, ?)', (user_id, flagged_by, reason))
        conn.commit()
        conn.close()
        return {'success': True}
    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}


def get_user_flags(user_id: int) -> Dict:
    """
    Retrieve flags for a given user.
    Returns: {'success': bool, 'data': List[Dict] or 'message': str}
    Each flag: id, user_id, flagged_by, reason, created_at, flagged_by_username
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute('''
            SELECT uf.id, uf.user_id, uf.flagged_by, uf.reason, uf.created_at, u.username as flagged_by_username
            FROM user_flags uf
            LEFT JOIN users u ON uf.flagged_by = u.id
            WHERE uf.user_id = ?
            ORDER BY uf.created_at DESC
        ''', (user_id,))

        rows = cursor.fetchall()
        conn.close()

        flags = [dict(row) for row in rows]
        return {'success': True, 'data': flags}
    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}