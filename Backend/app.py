from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import mysql.connector
from dotenv import load_dotenv
import os
from werkzeug.utils import secure_filename

load_dotenv()

app = Flask(__name__)
CORS(app)

# MySQL config (load from .env)
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 3306)),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
}
DB_NAME = os.getenv('DB_NAME', 'voting_system')

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

def get_db():
    return mysql.connector.connect(**DB_CONFIG)

def get_db_with_database():
    config_with_db = DB_CONFIG.copy()
    config_with_db['database'] = DB_NAME
    return mysql.connector.connect(**config_with_db)

def initialize_db():
    print('--- initialize_db: Starting database initialization ---')
    try:
        # First, connect without database to create it if it doesn't exist
        db = get_db()
        cursor = db.cursor()
        cursor.execute("CREATE DATABASE IF NOT EXISTS voting_system")
        db.commit()
        cursor.close()
        db.close()
        print('Database voting_system created or already exists.')
        
        # Now connect with the database and create tables
        db = get_db_with_database()
        cursor = db.cursor()
        schema = """
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100),
            email VARCHAR(100) UNIQUE,
            password VARCHAR(100),
            has_voted BOOLEAN DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS positions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100),
            category VARCHAR(100)
        );
        CREATE TABLE IF NOT EXISTS candidates (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100),
            image VARCHAR(255),
            position_id INT,
            FOREIGN KEY (position_id) REFERENCES positions(id)
        );
        CREATE TABLE IF NOT EXISTS votes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            position_id INT,
            candidate_id INT,
            voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (position_id) REFERENCES positions(id),
            FOREIGN KEY (candidate_id) REFERENCES candidates(id),
            UNIQUE KEY unique_vote (user_id, position_id)
        );
        """
        for statement in schema.split(';'):
            if statement.strip():
                cursor.execute(statement)
        db.commit()
        cursor.close()
        db.close()
        print('Tables created or already exist.')
    except Exception as e:
        print('Error in initialize_db:', e)
    print('--- initialize_db: Finished ---')

def populate_sample_data():
    print('--- populate_sample_data: Starting ---')
    try:
        db = get_db_with_database()
        cursor = db.cursor()
        # Check if users table is empty
        cursor.execute('SELECT COUNT(*) FROM users')
        if cursor.fetchone()[0] == 0:
            cursor.execute("""
                INSERT INTO users (name, email, password, has_voted) VALUES
                ('John Doe', 'john@example.com', 'Password123', 0),
                ('Jane Smith', 'jane@example.com', 'Password123', 0)
            """)
        # Check if positions table is empty
        cursor.execute('SELECT COUNT(*) FROM positions')
        if cursor.fetchone()[0] == 0:
            cursor.execute("""
                INSERT INTO positions (name, category) VALUES
                ('President', 'students'),
                ('Secretary', 'students'),
                ('Head Teacher', 'teachers'),
                ('Staff Rep', 'staff')
            """)
        # Check if candidates table is empty
        cursor.execute('SELECT COUNT(*) FROM candidates')
        if cursor.fetchone()[0] == 0:
            # Get position ids
            cursor.execute('SELECT id FROM positions WHERE name="President"')
            president_id = cursor.fetchone()[0]
            cursor.execute('SELECT id FROM positions WHERE name="Secretary"')
            secretary_id = cursor.fetchone()[0]
            cursor.execute('SELECT id FROM positions WHERE name="Head Teacher"')
            head_teacher_id = cursor.fetchone()[0]
            cursor.execute('SELECT id FROM positions WHERE name="Staff Rep"')
            staff_rep_id = cursor.fetchone()[0]
            cursor.execute(f"""
                INSERT INTO candidates (name, image, position_id) VALUES
                    ('Alice', NULL, {president_id}),
                    ('Bob', NULL, {president_id}),
                    ('Carol', NULL, {secretary_id}),
                    ('Dave', NULL, {secretary_id}),
                    ('Ms. Johnson', NULL, {head_teacher_id}),
                    ('Mr. Smith', NULL, {head_teacher_id}),
                    ('Ms. Green', NULL, {staff_rep_id}),
                    ('Mr. Brown', NULL, {staff_rep_id})
            """)
        # Remove images for candidates with id 5, 6, 7, and 8 (force initials display)
        cursor.execute('UPDATE candidates SET image=NULL WHERE id IN (5, 6, 7, 8)')
        db.commit()
        cursor.close()
        db.close()
        print('Sample data populated.')
    except Exception as e:
        print('Error in populate_sample_data:', e)
    print('--- populate_sample_data: Finished ---')

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    print(f"Login attempt: email={email}, password={password}")
    db = get_db_with_database()
    cursor = db.cursor(dictionary=True)
    cursor.execute('SELECT * FROM users WHERE email=%s AND password=%s', (email, password))
    user = cursor.fetchone()
    if not user:
        # Try to find by email only
        cursor.execute('SELECT * FROM users WHERE email=%s', (email,))
        user = cursor.fetchone()
        if not user:
            # Auto-insert new user
            print(f"Inserting new user: {email}")
            cursor.execute('INSERT INTO users (name, email, password, has_voted) VALUES (%s, %s, %s, 0)', (email.split('@')[0], email, password))
            db.commit()
            cursor.execute('SELECT * FROM users WHERE email=%s', (email,))
            user = cursor.fetchone()
        elif user['password'] != password:
            print(f"Invalid password for {email}")
            cursor.close()
            db.close()
            return jsonify({'success': False, 'message': 'Invalid credentials'}), 401
    print(f"User found or created: {user}")
    cursor.close()
    db.close()
    return jsonify({'success': True, 'user': user})

@app.route('/api/vote', methods=['POST'])
def vote():
    data = request.json
    print("Received vote data:", data)  # Debug log
    user_id = data.get('user_id')
    votes = data.get('votes')  # {position_id: candidate_id}
    db = get_db_with_database()
    cursor = db.cursor()
    try:
        # Get user name for logging
        cursor.execute('SELECT name, email FROM users WHERE id=%s', (user_id,))
        user_info = cursor.fetchone()
        user_name = user_info[0] if user_info else f"User {user_id}"
        print(f"User {user_name} (ID: {user_id}) is voting...")
        
        for position_id, candidate_id in votes.items():
            # Get position and candidate names for logging
            cursor.execute('SELECT name FROM positions WHERE id=%s', (position_id,))
            position_name = cursor.fetchone()[0]
            cursor.execute('SELECT name FROM candidates WHERE id=%s', (candidate_id,))
            candidate_name = cursor.fetchone()[0]
            
            print(f"Vote: {user_name} voted for {candidate_name} as {position_name}")
            cursor.execute('INSERT INTO votes (user_id, position_id, candidate_id) VALUES (%s, %s, %s) ON DUPLICATE KEY UPDATE candidate_id=VALUES(candidate_id)', (user_id, position_id, candidate_id))
        cursor.execute('UPDATE users SET has_voted=1 WHERE id=%s', (user_id,))
        db.commit()
        print(f"Vote saved successfully for {user_name}")
    except Exception as e:
        print("Error while saving vote:", e)  # Debug log
        db.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cursor.close()
        db.close()
    return jsonify({'success': True})

@app.route('/api/results', methods=['GET'])
def results():
    db = get_db_with_database()
    cursor = db.cursor(dictionary=True)
    cursor.execute('''
        SELECT p.id as position_id, p.name as position_name, c.id as candidate_id, c.name as candidate_name, COUNT(v.id) as votes
        FROM positions p
        JOIN candidates c ON c.position_id = p.id
        LEFT JOIN votes v ON v.position_id = p.id AND v.candidate_id = c.id
        GROUP BY p.id, c.id
    ''')
    results = cursor.fetchall()
    cursor.close()
    db.close()
    return jsonify({'results': results})

@app.route('/api/positions', methods=['GET'])
def get_positions():
    db = get_db_with_database()
    cursor = db.cursor(dictionary=True)
    cursor.execute('SELECT * FROM positions')
    positions = cursor.fetchall()
    for pos in positions:
        cursor.execute('SELECT * FROM candidates WHERE position_id=%s', (pos['id'],))
        pos['candidates'] = cursor.fetchall()
    cursor.close()
    db.close()
    return jsonify({'positions': positions})

@app.route('/api/users', methods=['POST'])
def add_user():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    name = data.get('name') or email.split('@')[0]
    if not email or not password:
        return jsonify({'success': False, 'message': 'Email and password are required.'}), 400
    db = get_db_with_database()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute('SELECT * FROM users WHERE email=%s', (email,))
        if cursor.fetchone():
            return jsonify({'success': False, 'message': 'Email already exists.'}), 409
        cursor.execute('INSERT INTO users (name, email, password, has_voted) VALUES (%s, %s, %s, 0)', (name, email, password))
        db.commit()
        cursor.execute('SELECT * FROM users WHERE email=%s', (email,))
        user = cursor.fetchone()
        return jsonify({'success': True, 'user': user})
    except Exception as e:
        db.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cursor.close()
        db.close()

@app.route('/api/users', methods=['GET'])
def get_users():
    db = get_db_with_database()
    cursor = db.cursor(dictionary=True)
    cursor.execute('SELECT * FROM users')
    users = cursor.fetchall()
    cursor.close()
    db.close()
    return jsonify({'users': users})

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    db = get_db_with_database()
    cursor = db.cursor()
    try:
        # Check if user has votes
        cursor.execute('SELECT COUNT(*) FROM votes WHERE user_id=%s', (user_id,))
        if cursor.fetchone()[0] > 0:
            return jsonify({'success': False, 'message': 'Cannot delete user who has voted.'}), 400
        cursor.execute('DELETE FROM users WHERE id=%s', (user_id,))
        db.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cursor.close()
        db.close()

@app.route('/api/candidates', methods=['GET'])
def get_candidates():
    db = get_db_with_database()
    cursor = db.cursor(dictionary=True)
    cursor.execute('SELECT * FROM candidates')
    candidates = cursor.fetchall()
    cursor.close()
    db.close()
    return jsonify({'candidates': candidates})

@app.route('/api/candidates/<int:candidate_id>', methods=['PUT'])
def update_candidate(candidate_id):
    data = request.json
    name = data.get('name')
    position_id = data.get('position_id')
    image = data.get('image')  # Optional: path or URL
    db = get_db_with_database()
    cursor = db.cursor()
    try:
        update_fields = []
        params = []
        if name:
            update_fields.append('name=%s')
            params.append(name)
        if position_id:
            update_fields.append('position_id=%s')
            params.append(position_id)
        if image:
            update_fields.append('image=%s')
            params.append(image)
        if not update_fields:
            return jsonify({'success': False, 'message': 'No fields to update.'}), 400
        params.append(candidate_id)
        cursor.execute(f"UPDATE candidates SET {', '.join(update_fields)} WHERE id=%s", tuple(params))
        db.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cursor.close()
        db.close()

@app.route('/api/candidates/<int:candidate_id>/image', methods=['POST'])
def upload_candidate_image(candidate_id):
    if 'image' not in request.files:
        return jsonify({'success': False, 'message': 'No image file provided.'}), 400
    file = request.files['image']
    if file.filename == '':
        return jsonify({'success': False, 'message': 'No selected file.'}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(f"candidate_{candidate_id}_" + file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        # Update candidate image path in DB (store relative path)
        db = get_db_with_database()
        cursor = db.cursor()
        try:
            image_url = f'/uploads/{filename}'
            cursor.execute('UPDATE candidates SET image=%s WHERE id=%s', (image_url, candidate_id))
            db.commit()
            return jsonify({'success': True, 'image': image_url})
        except Exception as e:
            db.rollback()
            return jsonify({'success': False, 'message': str(e)}), 500
        finally:
            cursor.close()
            db.close()
    else:
        return jsonify({'success': False, 'message': 'Invalid file type.'}), 400

@app.route('/api/candidates/<int:candidate_id>/remove_image', methods=['PATCH'])
def remove_candidate_image(candidate_id):
    db = get_db_with_database()
    cursor = db.cursor()
    try:
        cursor.execute('UPDATE candidates SET image=NULL WHERE id=%s', (candidate_id,))
        db.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cursor.close()
        db.close()

@app.route('/api/candidates', methods=['POST'])
def add_candidate():
    data = request.json
    name = data.get('name')
    position_id = data.get('position_id')
    image = data.get('image', None)
    if not name or not position_id:
        return jsonify({'success': False, 'message': 'Name and position_id are required.'}), 400
    # Only set image if a real image is provided
    if image is not None and (not isinstance(image, str) or image.strip() == ''):
        image = None
    db = get_db_with_database()
    cursor = db.cursor()
    try:
        cursor.execute('INSERT INTO candidates (name, image, position_id) VALUES (%s, %s, %s)', (name, image, position_id))
        db.commit()
        candidate_id = cursor.lastrowid
        return jsonify({'success': True, 'candidate_id': candidate_id})
    except Exception as e:
        db.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cursor.close()
        db.close()

@app.route('/api/candidates/<int:candidate_id>', methods=['DELETE'])
def delete_candidate(candidate_id):
    db = get_db_with_database()
    cursor = db.cursor()
    try:
        cursor.execute('DELETE FROM candidates WHERE id=%s', (candidate_id,))
        db.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cursor.close()
        db.close()

if __name__ == '__main__':
    initialize_db()
    populate_sample_data()
    app.run(debug=True)
