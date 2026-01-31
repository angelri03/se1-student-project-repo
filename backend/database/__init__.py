"""
Database package
Aggregates all database operations
"""

from .db_core import init_db, DATABASE_NAME
from .db_users import (
    hash_password,
    verify_password,
    create_user,
    get_user_by_username,
    get_user_by_id,
    update_user,
    delete_user,
    get_all_users,
    is_admin,
    flag_user,
    get_user_flags,
)
from .db_projects import (
    create_project,
    get_project_by_id,
    get_all_approved_projects,
    get_all_projects,
    search_projects_by_tag,
    update_project,
    approve_project,
    unapprove_project,
    delete_project,
    add_tag_to_project,
    remove_tag_from_project,
    set_project_tags,
    get_all_tags
)
from .db_project_owners import (
    add_owner_to_project,
    remove_owner_from_project,
    get_project_owners,
    get_user_projects,
    get_user_pending_projects,
    is_project_owner,
    get_owner_usernames,
    get_project_creator
)
from .db_courses import (
    create_course,
    get_course_by_id,
    get_all_courses,
    update_course,
    delete_course,
    assign_project_to_course,
    unassign_project_from_course,
    get_projects_by_course,
    get_project_course
)
from .db_topics import (
    create_topic,
    get_topic_by_id,
    get_all_topics,
    update_topic,
    delete_topic
)
from .db_ratings import (
    rate_project,
    get_user_rating,
    get_project_rating,
    delete_rating,
    get_all_ratings_for_project,
    get_user_rating_stats
)
from .db_media import (
    add_project_media,
    get_project_media,
    delete_project_media,
    get_media_by_id
)
from .db_bookmarks import (
    add_bookmark,
    remove_bookmark,
    get_user_bookmarks,
    is_bookmarked,
    get_bookmark_count
)
from .db_notifications import (
    create_notification,
    get_user_notifications,
    mark_notification_as_read,
    mark_all_notifications_as_read,
    delete_notification,
    get_unread_count,
    create_notification_for_project_owners
)

__all__ = [
    # Core
    'init_db',
    'DATABASE_NAME',
    
    # Users
    'hash_password',
    'verify_password',
    'create_user',
    'get_user_by_username',
    'get_user_by_id',
    'update_user',
    'delete_user',
    'get_all_users',
    'is_admin',
    'flag_user',
    'get_user_flags',
    
    # Projects
    'create_project',
    'get_project_by_id',
    'get_all_approved_projects',
    'get_all_projects',
    'search_projects_by_tag',
    'update_project',
    'approve_project',
    'unapprove_project',
    'delete_project',
    'add_tag_to_project',
    'remove_tag_from_project',
    'set_project_tags',
    'get_all_tags',
    
    # Project Owners
    'add_owner_to_project',
    'remove_owner_from_project',
    'get_project_owners',
    'get_user_projects',
    'get_user_pending_projects',
    'is_project_owner',
    'get_owner_usernames',
    'get_project_creator',
    
    # Courses
    'create_course',
    'get_course_by_id',
    'get_all_courses',
    'update_course',
    'delete_course',
    'assign_project_to_course',
    'unassign_project_from_course',
    'get_projects_by_course',
    'get_project_course',
    
    # Topics
    'create_topic',
    'get_topic_by_id',
    'get_all_topics',
    'update_topic',
    'delete_topic',

    # Ratings
    'rate_project',
    'get_user_rating',
    'get_project_rating',
    'delete_rating',
    'get_all_ratings_for_project',
    'get_user_rating_stats',

    # Media
    'add_project_media',
    'get_project_media',
    'delete_project_media',
    'get_media_by_id',
    
    # Bookmarks
    'add_bookmark',
    'remove_bookmark',
    'get_user_bookmarks',
    'is_bookmarked',
    'get_bookmark_count',
    
    # Notifications
    'create_notification',
    'get_user_notifications',
    'mark_notification_as_read',
    'mark_all_notifications_as_read',
    'delete_notification',
    'get_unread_count',
    'create_notification_for_project_owners'
]