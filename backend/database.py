import sqlite3
from typing import Dict, List, Optional

DATABASE_NAME = 'se1.db'

def init_db():
    """Initialize the database and create tables if they don't exist"""
    conn = sqlite3.connect(DATABASE_NAME)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE
        )
    ''')
    
    conn.commit()
    conn.close()

def create_entry(table: str, entry: Dict) -> Dict:
    """
    Create a new entry in the specified table
    Returns: {'success': bool, 'message': str, 'id': int (if successful)}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()
        
        # Build the INSERT query dynamically
        columns = ', '.join(entry.keys())
        placeholders = ', '.join(['?' for _ in entry])
        query = f'INSERT INTO {table} ({columns}) VALUES ({placeholders})'
        
        cursor.execute(query, list(entry.values()))
        conn.commit()
        
        entry_id = cursor.lastrowid
        conn.close()
        
        return {'success': True, 'message': 'Entry created successfully', 'id': entry_id}
    
    except sqlite3.IntegrityError as e:
        return {'success': False, 'message': f'Integrity error: {str(e)}'}
    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}

def get_entries(table: str) -> Dict:
    """
    Get all entries from the specified table
    Returns: {'success': bool, 'data': List[Dict] or 'message': str}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        conn.row_factory = sqlite3.Row  # This enables column access by name
        cursor = conn.cursor()
        
        cursor.execute(f'SELECT * FROM {table}')
        rows = cursor.fetchall()
        
        # Convert rows to list of dictionaries
        entries = [dict(row) for row in rows]
        
        conn.close()
        return {'success': True, 'data': entries}
    
    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}

def modify_entry(table: str, entry_id: int, entry: Dict) -> Dict:
    """
    Modify an existing entry in the specified table
    Returns: {'success': bool, 'message': str}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()
        
        # Build the UPDATE query dynamically
        set_clause = ', '.join([f'{key} = ?' for key in entry.keys()])
        query = f'UPDATE {table} SET {set_clause} WHERE id = ?'
        
        cursor.execute(query, list(entry.values()) + [entry_id])
        conn.commit()
        
        if cursor.rowcount == 0:
            conn.close()
            return {'success': False, 'message': 'Entry not found'}
        
        conn.close()
        return {'success': True, 'message': 'Entry updated successfully'}
    
    except sqlite3.IntegrityError as e:
        return {'success': False, 'message': f'Integrity error: {str(e)}'}
    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}

def delete_entry(table: str, entry_id: int) -> Dict:
    """
    Delete an entry from the specified table
    Returns: {'success': bool, 'message': str}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()
        
        cursor.execute(f'DELETE FROM {table} WHERE id = ?', (entry_id,))
        conn.commit()
        
        if cursor.rowcount == 0:
            conn.close()
            return {'success': False, 'message': 'Entry not found'}
        
        conn.close()
        return {'success': True, 'message': 'Entry deleted successfully'}
    
    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}
