from flask import Flask, request, jsonify
from flask_cors import CORS
import database

app = Flask(__name__)
CORS(app)  # This allows your React frontend to communicate with the backend

# Initialize the database when the server starts
database.init_db()

# Whitelist of allowed tables (security measure)
ALLOWED_TABLES = ['users']

def validate_table(table: str) -> bool:
    """Check if the table name is in the allowed list"""
    return table in ALLOWED_TABLES

@app.route('/api/users', methods=['POST'])
def create_user():
    """
    Create a new user
    Expected JSON: {"username": "...", "password": "...", "email": "..."}
    """
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['username', 'password', 'email']
    if not all(field in data for field in required_fields):
        return jsonify({'success': False, 'message': 'Missing required fields'}), 400
    
    result = database.create_entry('users', data)
    status_code = 201 if result['success'] else 400
    return jsonify(result), status_code

@app.route('/api/users', methods=['GET'])
def get_users():
    """Get all users"""
    result = database.get_entries('users')
    status_code = 200 if result['success'] else 500
    return jsonify(result), status_code

@app.route('/api/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    """
    Update an existing user
    Expected JSON: {"username": "...", "password": "...", "email": "..."}
    (any combination of fields)
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'success': False, 'message': 'No data provided'}), 400
    
    result = database.modify_entry('users', user_id, data)
    status_code = 200 if result['success'] else 404
    return jsonify(result), status_code

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    """Delete a user"""
    result = database.delete_entry('users', user_id)
    status_code = 200 if result['success'] else 404
    return jsonify(result), status_code

@app.route('/api/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({'status': 'ok', 'message': 'Server is running'}), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
