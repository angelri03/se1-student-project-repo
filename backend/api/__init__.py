"""
API package
Aggregates all API blueprints
"""

from .api_users import users_bp
from .api_projects import projects_bp
from .api_courses import courses_bp
from .api_topics import topics_bp
from .api_bookmarks import bookmarks_bp
from .api_logs import logs_bp
from .api_notifications import notifications_bp
from .api_reports import reports_bp

__all__ = ['users_bp', 'projects_bp', 'courses_bp', 'topics_bp', 'bookmarks_bp', 'logs_bp', 'notifications_bp', 'reports_bp']