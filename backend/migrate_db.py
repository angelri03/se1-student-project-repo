"""
Database migration script
Adds bio column to users table and creates project_media table
"""
import sqlite3

DATABASE_NAME = 'se1.db'

def migrate_database():
    """Run all database migrations"""
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        cursor = conn.cursor()
        
        print("Starting database migration...\n")
        
        # Add bio column to users table
        print("Checking users table...")
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'bio' not in columns:
            print("  Adding bio column...")
            cursor.execute('ALTER TABLE users ADD COLUMN bio TEXT')
            conn.commit()
            print("Bio column added successfully!")
        else:
            print("Bio column already exists.")
        
        if 'created_at' not in columns:
            print("  Adding created_at column...")
            cursor.execute('ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
            conn.commit()
            print("Created_at column added successfully!")
        else:
            print("Created_at column already exists.")

        if 'admin' not in columns:
            print("  Adding admin column...")
            cursor.execute('ALTER TABLE users ADD COLUMN admin INTEGER DEFAULT 0')
            conn.commit()
            print("Admin column added successfully!")
        else:
            print("Admin column already exists.")
        
        if 'is_student' not in columns:
            print("  Adding is_student column...")
            cursor.execute('ALTER TABLE users ADD COLUMN is_student INTEGER DEFAULT 1')
            conn.commit()
            print("Is_student column added successfully!")
        else:
            print("Is_student column already exists.")
        
        if 'semester' not in columns:
            print("  Adding semester column...")
            cursor.execute('ALTER TABLE users ADD COLUMN semester TEXT')
            conn.commit()
            print("Semester column added successfully!")
        else:
            print("Semester column already exists.")
        
        if 'study_programme' not in columns:
            print("  Adding study_programme column...")
            cursor.execute('ALTER TABLE users ADD COLUMN study_programme TEXT')
            conn.commit()
            print("Study_programme column added successfully!")
        else:
            print("Study_programme column already exists.")
        
        if 'organization' not in columns:
            print("  Adding organization column...")
            cursor.execute('ALTER TABLE users ADD COLUMN organization TEXT')
            conn.commit()
            print("Organization column added successfully!")
        else:
            print("Organization column already exists.")
        
        if 'profile_picture' not in columns:
            print("  Adding profile_picture column...")
            cursor.execute('ALTER TABLE users ADD COLUMN profile_picture TEXT')
            conn.commit()
            print("Profile_picture column added successfully!")
        else:
            print("Profile_picture column already exists.")
        
        if 'profile_link' not in columns:
            print("  Adding profile_link column...")
            cursor.execute('ALTER TABLE users ADD COLUMN profile_link TEXT')
            conn.commit()
            print("Profile_link column added successfully!")
        else:
            print("Profile_link column already exists.")
        
        if 'profile_visibility' not in columns:
            print("  Adding profile_visibility column...")
            cursor.execute("ALTER TABLE users ADD COLUMN profile_visibility TEXT DEFAULT 'public'")
            conn.commit()
            print("Profile_visibility column added successfully!")
        else:
            print("Profile_visibility column already exists.")
        
        # Create project_media table
        print("\nChecking project_media table...")
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='project_media'")
        if cursor.fetchone() is None:
            print("  Creating project_media table...")
            cursor.execute('''
                CREATE TABLE project_media (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id INTEGER NOT NULL,
                    file_path TEXT NOT NULL,
                    file_name TEXT NOT NULL,
                    file_type TEXT NOT NULL,
                    file_size INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
                )
            ''')
            
            print("  Creating index...")
            cursor.execute('''
                CREATE INDEX idx_media_project
                ON project_media(project_id)
            ''')
            
            conn.commit()
            print("Project media table created successfully!")
        else:
            print("Project media table already exists.")


        # Create user_flags table
        print("\nChecking user_flags table...")
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_flags'")
        if cursor.fetchone() is None:
            print("  Creating user_flags table...")
            cursor.execute('''
                CREATE TABLE user_flags (
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
            print("User_flags table created successfully!")
        else:
            print("User_flags table already exists.")


        # Update courses table
        print("\nChecking courses table...")
        cursor.execute("PRAGMA table_info(courses)")
        course_columns = [column[1] for column in cursor.fetchall()]
        
        if 'code' not in course_columns:
            print("  Adding code column...")
            cursor.execute('ALTER TABLE courses ADD COLUMN code TEXT')
            conn.commit()
            print("Code column added successfully!")
        else:
            print("Code column already exists.")
        
        if 'semester' not in course_columns:
            print("  Adding semester column...")
            cursor.execute('ALTER TABLE courses ADD COLUMN semester TEXT')
            conn.commit()
            print("Semester column added successfully!")
        else:
            print("Semester column already exists.")
        
        if 'term' not in course_columns:
            print("  Adding term column...")
            cursor.execute('ALTER TABLE courses ADD COLUMN term TEXT')
            conn.commit()
            print("Term column added successfully!")
        else:
            print("Term column already exists.")
        
        # Add metadata column to notifications table
        print("\nChecking notifications table...")
        cursor.execute("PRAGMA table_info(notifications)")
        notification_columns = [column[1] for column in cursor.fetchall()]
        
        if 'metadata' not in notification_columns:
            print("  Adding metadata column...")
            cursor.execute('ALTER TABLE notifications ADD COLUMN metadata TEXT')
            conn.commit()
            print("Metadata column added successfully!")
        else:
            print("Metadata column already exists.")
        
        # Add last_edited_by_id column to projects table
        print("\nChecking projects table...")
        cursor.execute("PRAGMA table_info(projects)")
        project_columns = [column[1] for column in cursor.fetchall()]
        
        if 'last_edited_by_id' not in project_columns:
            print("  Adding last_edited_by_id column...")
            cursor.execute('ALTER TABLE projects ADD COLUMN last_edited_by_id INTEGER')
            conn.commit()
            print("Last_edited_by_id column added successfully!")
        else:
            print("Last_edited_by_id column already exists.")
        
        if 'project_link' not in project_columns:
            print("  Adding project_link column...")
            cursor.execute('ALTER TABLE projects ADD COLUMN project_link TEXT')
            conn.commit()
            print("Project_link column added successfully!")
        else:
            print("Project_link column already exists.")
        
        # Create reports table
        print("\nChecking reports table...")
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='reports'")
        if cursor.fetchone() is None:
            print("  Creating reports table...")
            cursor.execute('''
                CREATE TABLE reports (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    reporter_id INTEGER NOT NULL,
                    reported_user_id INTEGER,
                    reported_project_id INTEGER,
                    reason TEXT NOT NULL,
                    status TEXT DEFAULT 'pending',
                    admin_notes TEXT,
                    resolved_by INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    resolved_at TIMESTAMP,
                    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (reported_project_id) REFERENCES projects(id) ON DELETE CASCADE,
                    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
                    CHECK ((reported_user_id IS NOT NULL) OR (reported_project_id IS NOT NULL))
                )
            ''')
            
            print("  Creating report indexes...")
            cursor.execute('''
                CREATE INDEX idx_reports_reporter
                ON reports(reporter_id)
            ''')
            cursor.execute('''
                CREATE INDEX idx_reports_status
                ON reports(status)
            ''')
            
            conn.commit()
            print("Reports table created successfully!")
        else:
            print("Reports table already exists.")
        
        conn.close()
        print("\nMigration completed successfully!")
        
    except Exception as e:
        print(f"Error during migration: {str(e)}")
        raise

if __name__ == '__main__':
    migrate_database()
