"""
Rating-related database operations
Handles project ratings by users
"""

import sqlite3
from typing import Dict, Optional
from datetime import datetime
from .db_core import DATABASE_NAME


def rate_project(project_id: int, user_id: int, rating: int) -> Dict:
    """
    Add or update a rating for a project by a user.
    Each user can only have one rating per project.
    Rating must be between 1 and 5.
    Returns: {'success': bool, 'message': str}
    """
    if rating < 1 or rating > 5:
        return {'success': False, 'message': 'Rating must be between 1 and 5'}

    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()

        # Check if user already rated this project
        cursor.execute('''
            SELECT id FROM project_ratings
            WHERE project_id = ? AND user_id = ?
        ''', (project_id, user_id))

        existing = cursor.fetchone()

        if existing:
            # Update existing rating
            cursor.execute('''
                UPDATE project_ratings
                SET rating = ?, updated_at = ?
                WHERE project_id = ? AND user_id = ?
            ''', (rating, datetime.now().isoformat(), project_id, user_id))
            message = 'Rating updated successfully'
        else:
            # Insert new rating
            cursor.execute('''
                INSERT INTO project_ratings (project_id, user_id, rating)
                VALUES (?, ?, ?)
            ''', (project_id, user_id, rating))
            message = 'Rating added successfully'

        conn.commit()
        conn.close()

        return {'success': True, 'message': message}

    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}


def get_user_rating(project_id: int, user_id: int) -> Optional[int]:
    """
    Get a user's rating for a specific project.
    Returns: The rating (1-5) or None if not rated
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT rating FROM project_ratings
            WHERE project_id = ? AND user_id = ?
        ''', (project_id, user_id))

        row = cursor.fetchone()
        conn.close()

        if row:
            return row[0]
        return None

    except Exception:
        return None


def get_project_rating(project_id: int) -> Dict:
    """
    Get the average rating and total number of ratings for a project.
    Returns: {'success': bool, 'average': float, 'count': int} or {'success': bool, 'message': str}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT AVG(rating) as average, COUNT(*) as count
            FROM project_ratings
            WHERE project_id = ?
        ''', (project_id,))

        row = cursor.fetchone()
        conn.close()

        average = row[0] if row[0] is not None else 0
        count = row[1] if row[1] is not None else 0

        return {
            'success': True,
            'average': round(average, 1) if average else 0,
            'count': count
        }

    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}


def delete_rating(project_id: int, user_id: int) -> Dict:
    """
    Delete a user's rating for a project.
    Returns: {'success': bool, 'message': str}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()

        cursor.execute('''
            DELETE FROM project_ratings
            WHERE project_id = ? AND user_id = ?
        ''', (project_id, user_id))

        conn.commit()

        if cursor.rowcount == 0:
            conn.close()
            return {'success': False, 'message': 'Rating not found'}

        conn.close()
        return {'success': True, 'message': 'Rating deleted successfully'}

    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}


def get_all_ratings_for_project(project_id: int) -> Dict:
    """
    Get all individual ratings for a project.
    Returns: {'success': bool, 'data': List[Dict]} or {'success': bool, 'message': str}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute('''
            SELECT pr.*, u.username
            FROM project_ratings pr
            JOIN users u ON pr.user_id = u.id
            WHERE pr.project_id = ?
            ORDER BY pr.created_at DESC
        ''', (project_id,))

        rows = cursor.fetchall()
        ratings = [dict(row) for row in rows]

        conn.close()
        return {'success': True, 'data': ratings}

    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}


def get_user_rating_stats(user_id: int) -> Dict:
    """
    Get rating statistics for all projects owned by a user.
    Returns: {'success': bool, 'total_ratings': int, 'average_rating': float}
    """
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()

        # Get all ratings for projects owned by this user
        cursor.execute('''
            SELECT AVG(pr.rating) as average, COUNT(*) as count
            FROM project_ratings pr
            JOIN project_owners po ON pr.project_id = po.project_id
            WHERE po.user_id = ?
        ''', (user_id,))

        row = cursor.fetchone()
        conn.close()

        average = row[0] if row[0] is not None else 0
        count = row[1] if row[1] is not None else 0

        return {
            'success': True,
            'total_ratings': count,
            'average_rating': round(average, 1) if average else 0
        }

    except Exception as e:
        return {'success': False, 'message': f'Error: {str(e)}'}
