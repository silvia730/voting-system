from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector

app = Flask(__name__)
CORS(app)

# MySQL config (update with your credentials)
DB_CONFIG = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'password': '#07silvia,njeri'
}

def get_db():
    return mysql.connector.connect(**DB_CONFIG)

def get_db_with_database():
    config_with_db = DB_CONFIG.copy()
    config_with_db['database'] = 'voting_system'
    return mysql.connector.connect(**config_with_db)

def initialize_db():
    # First, connect without database to create it if it doesn't exist
    db = get_db()
    cursor = db.cursor()
    cursor.execute("CREATE DATABASE IF NOT EXISTS voting_system")
    db.commit()
    cursor.close()
    db.close()
    
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

def populate_sample_data():
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
            ('Alice', 'https://ui-avatars.com/api/?name=Alice', {president_id}),
            ('Bob', 'https://ui-avatars.com/api/?name=Bob', {president_id}),
            ('Carol', 'https://ui-avatars.com/api/?name=Carol', {secretary_id}),
            ('Dave', 'https://ui-avatars.com/api/?name=Dave', {secretary_id}),
            ('Ms. Johnson', 'https://ui-avatars.com/api/?name=Ms+Johnson', {head_teacher_id}),
            ('Mr. Smith', 'https://ui-avatars.com/api/?name=Mr+Smith', {head_teacher_id}),
            ('Ms. Green', 'https://ui-avatars.com/api/?name=Ms+Green', {staff_rep_id}),
            ('Mr. Brown', 'https://ui-avatars.com/api/?name=Mr+Brown', {staff_rep_id})
        """)
    db.commit()
    cursor.close()
    db.close()

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

if __name__ == '__main__':
    initialize_db()
    populate_sample_data()
    app.run(debug=True) 