"""
User-related database operations
Handles user CRUD operations and authentication
"""

import sqlite3
import bcrypt
from typing import Dict, Optional
from .db_core import DATABASE_NAME

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_user(username: str, password: str, email: str) -> Dict:
    """
    Create a new user with hashed password
    Returns: {'success': bool, 'message': str, 'id': int (if successful)}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()
        
        hashed_password = hash_password(password)
        
        cursor.execute('''
            INSERT INTO users (username, password, email)
            VALUES (?, ?, ?)
        ''', (username, hashed_password, email))
        
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
        conn = sqlite3.connect(DATABASE_NAME)
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
        conn = sqlite3.connect(DATABASE_NAME)
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

def update_user(user_id: int, username: str = None, password: str = None, email: str = None, bio: str = None) -> Dict:
    """
    Update user information
    Only updates fields that are provided (not None)
    Password will be hashed automatically if provided
    Returns: {'success': bool, 'message': str}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
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
        conn = sqlite3.connect(DATABASE_NAME)
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

def get_all_users() -> Dict:
    """
    Get all users (without password hashes)
    Returns: {'success': bool, 'data': List[Dict] or 'message': str}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute('SELECT id, username, email FROM users ORDER BY username ASC')
        rows = cursor.fetchall()

        conn.close()

        users = [dict(row) for row in rows]
        return {'success': True, 'data': users}

    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}