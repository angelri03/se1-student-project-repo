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
    delete_user
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
    is_project_owner,
    get_owner_usernames
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
    get_project_course,
    add_topic_to_course,
    remove_topic_from_course
)
from .db_topics import (
    create_topic,
    get_topic_by_id,
    get_all_topics,
    update_topic,
    delete_topic,
    get_courses_by_topic
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
    'is_project_owner',
    'get_owner_usernames',
    
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
    'add_topic_to_course',
    'remove_topic_from_course',
    
    # Topics
    'create_topic',
    'get_topic_by_id',
    'get_all_topics',
    'update_topic',
    'delete_topic',
    'get_courses_by_topic'
]