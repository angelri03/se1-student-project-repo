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
        
        conn.close()
        print("\nMigration completed successfully!")
        
    except Exception as e:
        print(f"Error during migration: {str(e)}")
        raise

if __name__ == '__main__':
    migrate_database()
