"""
API package
Aggregates all API blueprints
"""

from .api_users import users_bp
from .api_projects import projects_bp
from .api_courses import courses_bp
from .api_topics import topics_bp
from .api_bookmarks import bookmarks_bp

__all__ = ['users_bp', 'projects_bp', 'courses_bp', 'topics_bp', 'bookmarks_bp']