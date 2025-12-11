"""
Topic-related database operations
Handles topic CRUD operations
"""

import sqlite3
from typing import Dict, Optional
from .db_core import DATABASE_NAME

def create_topic(name: str, description: str = None) -> Dict:
    """
    Create a new topic
    Returns: {'success': bool, 'message': str, 'id': int (if successful)}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO topics (name, description)
            VALUES (?, ?)
        ''', (name, description))
        
        conn.commit()
        topic_id = cursor.lastrowid
        conn.close()
        
        return {'success': True, 'message': 'Topic created successfully', 'id': topic_id}
    
    except sqlite3.IntegrityError:
        return {'success': False, 'message': 'Topic name already exists'}
    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}

def get_topic_by_id(topic_id: int) -> Optional[Dict]:
    """
    Get a topic by ID
    Returns: Dict with topic data or None if not found
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM topics WHERE id = ?', (topic_id,))
        row = cursor.fetchone()
        
        conn.close()
        
        if row:
            return dict(row)
        return None
    
    except Exception:
        return None

def get_all_topics() -> Dict:
    """
    Get all topics
    Returns: {'success': bool, 'data': List[Dict] or 'message': str}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM topics ORDER BY name')
        rows = cursor.fetchall()
        topics = [dict(row) for row in rows]
        
        conn.close()
        return {'success': True, 'data': topics}
    
    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}

def update_topic(topic_id: int, name: str = None, description: str = None) -> Dict:
    """
    Update topic information
    Only updates fields that are provided (not None)
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
        
        if not update_fields:
            return {'success': False, 'message': 'No fields to update'}
        
        values.append(topic_id)
        query = f"UPDATE topics SET {', '.join(update_fields)} WHERE id = ?"
        
        cursor.execute(query, values)
        conn.commit()
        
        if cursor.rowcount == 0:
            conn.close()
            return {'success': False, 'message': 'Topic not found'}
        
        conn.close()
        return {'success': True, 'message': 'Topic updated successfully'}
    
    except sqlite3.IntegrityError:
        return {'success': False, 'message': 'Topic name already exists'}
    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}

def delete_topic(topic_id: int) -> Dict:
    """
    Delete a topic
    Returns: {'success': bool, 'message': str}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM topics WHERE id = ?', (topic_id,))
        conn.commit()
        
        if cursor.rowcount == 0:
            conn.close()
            return {'success': False, 'message': 'Topic not found'}
        
        conn.close()
        return {'success': True, 'message': 'Topic deleted successfully'}
    
    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}

