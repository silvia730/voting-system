// Admin credentials (hardcoded for demo)
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

// Categories and positions for admin dashboard
const categories = [
    { id: 'students', name: 'Students' },
    { id: 'teachers', name: 'Teachers' },
    { id: 'staff', name: 'Staff' }
];

const positions = [
    {
        id: 1,
        name: 'President',
        candidates: [
            { name: 'Alice', image: 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&w=256&h=256&fit=crop' },
            { name: 'Bob', image: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=facearea&w=256&h=256&facepad=2' }
        ],
        category: 'students'
    },
    {
        id: 2,
        name: 'Secretary',
        candidates: [
            { name: 'Carol', image: 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&w=256&h=256&fit=crop' },
            { name: 'Dave', image: 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=facearea&w=256&h=256&facepad=2' }
        ],
        category: 'students'
    },
    {
        id: 3,
        name: 'Head Teacher',
        candidates: [
            { name: 'Ms. Johnson', image: 'https://images.pexels.com/photos/1181696/pexels-photo-1181696.jpeg?auto=compress&w=256&h=256&fit=crop' },
            { name: 'Mr. Smith', image: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=facearea&w=256&h=256&facepad=2' }
        ],
        category: 'teachers'
    },
    {
        id: 4,
        name: 'Staff Rep',
        candidates: [
            { name: 'Ms. Green', image: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&w=256&h=256&fit=crop' },
            { name: 'Mr. Brown', image: 'https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=facearea&w=256&h=256&facepad=2' }
        ],
        category: 'staff'
    }
];

const adminLoginSection = document.getElementById('admin-login-section');
const adminDashboard = document.getElementById('admin-dashboard');
const adminLoginForm = document.getElementById('admin-login-form');

const usersTab = document.getElementById('admin-users-tab');
const positionsTab = document.getElementById('admin-positions-tab');
const resultsTab = document.getElementById('admin-results-tab');

function showTab(tab) {
    usersTab.style.display = 'none';
    positionsTab.style.display = 'none';
    resultsTab.style.display = 'none';
    if (tab === 'users') usersTab.style.display = 'block';
    if (tab === 'positions') positionsTab.style.display = 'block';
    if (tab === 'results') resultsTab.style.display = 'block';
}

function adminLogout() {
    adminDashboard.style.display = 'none';
    adminLoginSection.style.display = 'block';
}

adminLoginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('admin-username').value.trim();
    const password = document.getElementById('admin-password').value;
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        adminLoginSection.style.display = 'none';
        adminDashboard.style.display = 'block';
        showTab('users');
        renderAdminUsers();
        renderAdminPositions();
        renderAdminResults();
    } else {
        alert('Invalid admin credentials');
    }
});

// Render users (refactored to fetch from backend)
async function renderAdminUsers() {
    const usersList = document.getElementById('admin-users-list');
    usersList.innerHTML = '<p>Loading...</p>';
    try {
        const response = await fetch('https://voting-system-backend-cewd.onrender.com/api/users');
        const data = await response.json();
        const users = data.users || [];
        if (users.length === 0) {
            usersList.innerHTML = '<p>No users found.</p>';
            return;
        }
        usersList.innerHTML = '<ul>' + users.map(u => `
            <li>${u.email} (${u.has_voted ? 'Voted' : 'Not Voted'})
                <button onclick="deleteUser(${u.id})" style="margin-left:1rem;color:#fff;background:#e74c3c;border:none;border-radius:5px;padding:2px 8px;cursor:pointer;">Delete</button>
            </li>`).join('') + '</ul>';
    } catch (err) {
        usersList.innerHTML = '<p>Error loading users.</p>';
    }
}

// Delete user logic (refactored to use backend API)
window.deleteUser = async function(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
        const response = await fetch(`https://voting-system-backend-cewd.onrender.com/api/users/${userId}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        if (!data.success) {
            alert(data.message || 'Failed to delete user.');
            return;
        }
        renderAdminUsers();
    } catch (err) {
        alert('Error connecting to server.');
    }
}

// Render positions and candidates
function renderAdminPositions() {
    const positionsList = document.getElementById('admin-positions-list');
    if (positions.length === 0) {
        positionsList.innerHTML = '<p>No positions found.</p>';
        return;
    }
    positionsList.innerHTML = positions.map(pos => `
        <div style="margin-bottom:1.5rem;">
            <strong>${pos.name}</strong> (${pos.category})<br>
            <ul>
                ${pos.candidates.map(c => `<li><img src='${c.image}' alt='${c.name}' style='width:30px;height:30px;border-radius:50%;vertical-align:middle;margin-right:8px;'>${c.name}</li>`).join('')}
            </ul>
        </div>
    `).join('');
}

// Render results (always show current leader)
function renderAdminResults() {
    const resultsList = document.getElementById('admin-results-list');
    // Tally votes from users
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    if (positions.length === 0) {
        resultsList.innerHTML = '<p>No positions found.</p>';
        return;
    }
    let voteCounts = {};
    positions.forEach(pos => {
        voteCounts[pos.id] = {};
        pos.candidates.forEach(candidate => {
            voteCounts[pos.id][candidate.name] = 0;
        });
    });
    users.forEach(user => {
        if (user.hasVoted && user.votes) {
            Object.entries(user.votes).forEach(([posId, candidate]) => {
                if (voteCounts[posId] && voteCounts[posId][candidate] !== undefined) {
                    voteCounts[posId][candidate]++;
                }
            });
        }
    });
    resultsList.innerHTML = positions.map(pos => {
        let maxVotes = 0;
        let winner = '';
        pos.candidates.forEach(candidate => {
            const count = voteCounts[pos.id][candidate.name];
            if (count > maxVotes) {
                maxVotes = count;
                winner = candidate.name;
            }
        });
        return `
            <div style='margin-bottom:1.5rem;'>
                <strong>${pos.name}</strong> (${pos.category})<br>
                <ul>
                    ${pos.candidates.map(c => `<li>${c.name}: ${voteCounts[pos.id][c.name]} votes</li>`).join('')}
                </ul>
                <em>Current Leader: ${winner || 'No votes yet'}</em>
            </div>
        `;
    }).join('');
}

// Expose showTab and adminLogout globally
window.showTab = showTab;
window.adminLogout = adminLogout;

// Add User Form in Users Tab
document.getElementById('admin-users-tab').innerHTML += `
    <h4>Add New User</h4>
    <form id="admin-add-user-form" style="margin-bottom:1rem;">
        <input type="email" id="admin-add-user-email" placeholder="Email" required style="margin-bottom:0.5rem;">
        <input type="password" id="admin-add-user-password" placeholder="Password" required style="margin-bottom:0.5rem;">
        <button type="submit">Add User</button>
    </form>
    <div id="admin-add-user-message" style="color:#e74c3c;"></div>
`;

// Add User Logic (refactored to use backend API)
document.getElementById('admin-add-user-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('admin-add-user-email').value.trim();
    const password = document.getElementById('admin-add-user-password').value;
    const messageDiv = document.getElementById('admin-add-user-message');
    messageDiv.textContent = '';
    try {
        const response = await fetch('https://voting-system-backend-cewd.onrender.com/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!data.success) {
            messageDiv.textContent = data.message || 'Failed to add user.';
            return;
        }
        messageDiv.style.color = '#27ae60';
        messageDiv.textContent = 'User added!';
        renderAdminUsers(); // Optionally, refresh user list from backend
        this.reset();
    } catch (err) {
        messageDiv.textContent = 'Error connecting to server.';
    }
}); 
