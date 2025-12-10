"""
Database seed script
Populates the database with mock data for testing
"""

import os
import sys

# Change to backend directory to ensure correct database path
os.chdir(os.path.dirname(os.path.abspath(__file__)))

import database

def seed_database():
    """Seed the database with mock data"""

    # Initialize database tables
    database.init_db()
    print("Database initialized.")

    # Create mock users
    users = [
        {"username": "angelica", "password": "password123", "email": "angelica@example.com"},
        {"username": "robert", "password": "password123", "email": "robert@example.com"},
        {"username": "abdeljalil", "password": "password123", "email": "abdeljalil@example.com"},
    ]

    user_ids = {}
    for user in users:
        result = database.create_user(user["username"], user["password"], user["email"])
        if result["success"]:
            user_ids[user["username"]] = result["id"]
            print(f"Created user: {user['username']}")
        else:
            # User might already exist, try to get their ID
            existing = database.get_user_by_username(user["username"])
            if existing:
                user_ids[user["username"]] = existing["id"]
                print(f"User already exists: {user['username']}")
            else:
                print(f"Failed to create user {user['username']}: {result['message']}")

    # Create mock courses
    courses = [
        {"name": "Introduction to Generative AI", "description": "Learn the fundamentals of generative AI models"},
        {"name": "Natural Language Processing", "description": "Advanced NLP techniques and applications"},
        {"name": "AI4Edu", "description": "AI applications in education"},
        {"name": "Bachelor Semester Project", "description": "Independent research project"},
    ]

    course_ids = {}
    for course in courses:
        result = database.create_course(course["name"], course["description"])
        if result["success"]:
            course_ids[course["name"]] = result["id"]
            print(f"Created course: {course['name']}")
        else:
            print(f"Failed to create course {course['name']}: {result['message']}")

    # Create mock projects (without file - just database entries for display)
    projects = [
        {
            "name": "AI Assistant for CS Students",
            "description": "This project introduces an AI-powered note-taking tool designed to help computer science students learn faster and study more effectively. The app enhances the user's notes using generative AI. It summarizes material, expands brief points, explains complex technical concepts, and automatically generates flashcards. Built with an LLM and Retrieval-Augmented Generation (RAG) pipeline, sentence embeddings, and the OpenAI API, it delivers accurate, context-aware assistance tailored to CS coursework. Whether you're reviewing lectures, learning algorithms, or preparing for exams, the AI Assistant makes understanding and organizing information easier than ever.",
            "course": "Introduction to Generative AI",
            "topics": ["Web Development", "NLP", "RAG"],
            "owners": ["angelica", "robert"],
            "approved": True
        },
        {
            "name": "Interactive Human-in-the-Loop Storytelling",
            "description": "This project introduces an application for collaborative storytelling, where users and a Large Language Model (LLM) co-create narratives in an interactive environment. It combines a notepad-style application with a chat interface and a character builder, allowing users to seamlessly develop stories and characters. The system dynamically adapts to user input, utilizing Retrieval-Augmented Generation (RAG) to suggest contextually relevant story elements. With interactive feedback mechanisms, users can refine suggestions and explore creative possibilities, enhancing their storytelling experience.",
            "course": "Natural Language Processing",
            "topics": ["Natural Language Processing", "RAG", "LLM"],
            "owners": ["angelica", "robert"],
            "approved": True
        },
        {
            "name": "Parental Controls for AI",
            "description": "This project aims to enhance parental control tools for children's use of Generative AI in education, addressing risks such as plagiarism, misinformation, inappropriate content, and over-reliance on AI. It introduces a foundational system with customizable content filtering, secure reveal options, and daily usage-time limits to give parents greater oversight. The project ultimately seeks to create a safer, more guided GenAI experience for young learners while preserving the educational benefits of these technologies.",
            "course": "AI4Edu",
            "topics": ["Web Development", "AI Safety"],
            "owners": ["angelica", "robert", "abdeljalil"],
            "approved": True
        },
        {
            "name": "AI Art Detector",
            "description": "This project focuses on image classification using Convolutional Neural Networks to distinguish between AI-generated and human made art. Users can upload images to the web application, and the trained model will predict whether the image falls into the category of AI-generated art, or human made art.",
            "course": "Bachelor Semester Project",
            "topics": ["Deep Learning", "Computer Vision"],
            "owners": ["angelica"],
            "approved": True
        }
    ]

    for project in projects:
        # Get the first owner as the creator
        creator_username = project["owners"][0]
        creator_id = user_ids.get(creator_username)

        if not creator_id:
            print(f"Skipping project {project['name']}: creator {creator_username} not found")
            continue

        # Create the project with a placeholder file path
        result = database.create_project(
            name=project["name"],
            description=project["description"],
            file_path="uploads/projects/placeholder.zip",
            file_size=0,
            creator_user_id=creator_id
        )

        if not result["success"]:
            print(f"Failed to create project {project['name']}: {result['message']}")
            continue

        project_id = result["id"]
        print(f"Created project: {project['name']}")

        # Add additional owners
        for owner_username in project["owners"][1:]:
            owner_id = user_ids.get(owner_username)
            if owner_id:
                database.add_owner_to_project(project_id, owner_id)
                print(f"  Added owner: {owner_username}")

        # Set tags (topics)
        database.set_project_tags(project_id, project["topics"])
        print(f"  Added topics: {', '.join(project['topics'])}")

        # Assign to course
        course_name = project["course"]
        course_id = course_ids.get(course_name)
        if course_id:
            database.assign_project_to_course(project_id, course_id)
            print(f"  Assigned to course: {course_name}")

        # Approve project if needed
        if project["approved"]:
            database.approve_project(project_id)
            print(f"  Approved project")

    print("\nDatabase seeding complete!")

if __name__ == "__main__":
    seed_database()
