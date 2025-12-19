"""
Core database functionality
Handles database initialization and table creation
"""

import sqlite3

DATABASE_NAME = 'se1.db'

def init_db():
    """Initialize the database and create all tables if they don't exist"""
    conn = sqlite3.connect(DATABASE_NAME)
    cursor = conn.cursor()
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            bio TEXT,
            admin INTEGER DEFAULT 0,
            is_student INTEGER DEFAULT 1,
            semester INTEGER,
            study_programme TEXT,
            organization TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Projects table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            file_path TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            approved INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Project owners table (many-to-many relationship)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS project_owners (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(project_id, user_id)
        )
    ''')
    
    # Project tags table (maps projects to topics)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS project_tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            topic_id INTEGER NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
            UNIQUE(project_id, topic_id)
        )
    ''')
    
    # Courses table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS courses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            semester INTEGER,
            term TEXT,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Topics table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS topics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Project-Course mapping (1 project -> 1 course, 1 course -> many projects)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS project_course (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL UNIQUE,
            course_id INTEGER NOT NULL,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
        )
    ''')
    
    
    # Project ratings table (one rating per user per project)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS project_ratings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(project_id, user_id)
        )
    ''')
    
    # Bookmarks table (users can bookmark projects)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS bookmarks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            project_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            UNIQUE(user_id, project_id)
        )
    ''')

    # Create indexes for better query performance
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_tags_project
        ON project_tags(project_id)
    ''')

    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_tags_topic
        ON project_tags(topic_id)
    ''')
    
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_projects_approved 
        ON projects(approved)
    ''')
    
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_owners_project 
        ON project_owners(project_id)
    ''')
    
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_owners_user 
        ON project_owners(user_id)
    ''')
    
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_project_course_project 
        ON project_course(project_id)
    ''')
    
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_project_course_course 
        ON project_course(course_id)
    ''')
    
    
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_ratings_project
        ON project_ratings(project_id)
    ''')

    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_ratings_user
        ON project_ratings(user_id)
    ''')
    
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_bookmarks_user
        ON bookmarks(user_id)
    ''')
    
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_bookmarks_project
        ON bookmarks(project_id)
    ''')

    # User flags table (admin can flag problematic users)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_flags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            flagged_by INTEGER,
            reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (flagged_by) REFERENCES users(id) ON DELETE SET NULL
        )
    ''')

    conn.commit()
    conn.close()


def get_connection(timeout: int = 30):
    """
    Return a new sqlite3 connection.
    Uses longer timeout.
    """
    return sqlite3.connect(DATABASE_NAME, timeout=timeout, check_same_thread=False)