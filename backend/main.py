"""
Main application entry point
Aggregates all blueprints and runs the Flask server
"""

from flask import Flask, jsonify
from flask_cors import CORS
import database
from api import users_bp, projects_bp, courses_bp, topics_bp

app = Flask(__name__)
CORS(app)

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50 MB max upload

# Initialize the database when the server starts
database.init_db()

# Register blueprints
app.register_blueprint(users_bp)
app.register_blueprint(projects_bp)
app.register_blueprint(courses_bp)
app.register_blueprint(topics_bp)

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({'status': 'ok', 'message': 'Server is running'}), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)