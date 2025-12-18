"""
Main application entry point
Aggregates all blueprints and runs the Flask server
"""

from flask import Flask, jsonify, send_from_directory
from werkzeug.exceptions import RequestEntityTooLarge
from flask_cors import CORS
import database
from api import users_bp, projects_bp, courses_bp, topics_bp, bookmarks_bp
import os

app = Flask(__name__)
CORS(app)

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500 MB max upload


# Return JSON for 413 errors instead of default HTML
@app.errorhandler(RequestEntityTooLarge)
def handle_file_too_large(e):
    return jsonify({'success': False, 'message': 'Uploaded file is too large. Maximum allowed size is 500MB.'}), 413

# Initialize the database when the server starts
database.init_db()

# Register blueprints
app.register_blueprint(users_bp)
app.register_blueprint(projects_bp)
app.register_blueprint(courses_bp)
app.register_blueprint(topics_bp)
app.register_blueprint(bookmarks_bp)

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({'status': 'ok', 'message': 'Server is running'}), 200

# Serve uploaded files
@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    """Serve uploaded files"""
    return send_from_directory('uploads', filename)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)