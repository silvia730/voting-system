// Admin credentials (hardcoded for demo)
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

// Categories and positions for admin dashboard
const categories = [
    { id: 'students', name: 'Students' },
    { id: 'teachers', name: 'Teachers' },
    { id: 'staff', name: 'Staff' }
];

// Remove hardcoded positions and candidates
// Fetch positions and candidates from backend
let positions = [];
let candidates = [];

async function fetchPositionsAndCandidates() {
    // Fetch positions (with candidates included)
    const res = await fetch('https://voting-system-backend-xdpf.onrender.com/api/positions');
    const data = await res.json();
    positions = data.positions || [];
    // Flatten all candidates for easy lookup
    candidates = [];
    positions.forEach(pos => {
        (pos.candidates || []).forEach(c => {
            candidates.push({ ...c, position_name: pos.name, position_category: pos.category });
        });
    });
}

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
        const response = await fetch('https://voting-system-backend-xdpf.onrender.com/api/users');
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
        const response = await fetch(`https://voting-system-backend-xdpf.onrender.com/api/users/${userId}`, {
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

// Helper: show toast message
function showToast(message, type = 'success') {
    let toast = document.createElement('div');
    toast.className = `admin-toast admin-toast-${type}`;
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 2500);
}

// Helper: get initials from name
function getInitials(name) {
    if (!name) return '';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Render positions and candidates with card layout, edit/add/delete features
async function renderAdminPositions() {
    await fetchPositionsAndCandidates();
    const positionsList = document.getElementById('admin-positions-list');
    if (positions.length === 0) {
        positionsList.innerHTML = '<p>No positions found.</p>';
        return;
    }
    positionsList.innerHTML = positions.map(pos => `
        <div class="admin-position-card">
            <div class="admin-position-header">
                <span class="admin-position-title">${pos.name}</span>
                <span class="admin-position-category">(${pos.category})</span>
            </div>
            <div class="admin-candidates-list">
                ${pos.candidates.map(c => `
                    <div class="admin-candidate-card" id="candidate-card-${c.id}">
                        ${c.image && c.image.trim() ?
                            `<img src='${c.image}' alt='${c.name}' class="admin-candidate-img" id="candidate-img-${c.id}" style="cursor:pointer;" onclick="triggerImageUpload(${c.id})">`
                            :
                            `<div class="admin-candidate-avatar" id="candidate-img-${c.id}" style="cursor:pointer;" onclick="triggerImageUpload(${c.id})">${getInitials(c.name)}</div>`
                        }
                        <input type='file' accept='image/*' id='candidate-img-input-${c.id}' style='display:none' onchange="changeCandidateImage(${c.id})">
                        <span class="admin-candidate-name" id="candidate-name-${c.id}">${c.name}</span>
                        <button class="admin-edit-btn" onclick="editCandidate(${c.id})">Edit</button>
                        <button class="admin-delete-btn" onclick="deleteCandidate(${c.id})">Delete</button>
                        <form class="admin-edit-form" id="edit-form-${c.id}" style="display:none;" onsubmit="return saveCandidateEdit(${c.id})">
                            <input type='text' value='${c.name}' id='edit-candidate-name-${c.id}' required oninput="liveUpdateAvatar(${c.id})">
                            <select id='edit-candidate-position-${c.id}'>
                                ${positions.map(p => `<option value='${p.id}' ${p.id === c.position_id ? 'selected' : ''}>${p.name}</option>`).join('')}
                            </select>
                            <button type='submit'>Save</button>
                            <button type='button' onclick="cancelEditCandidate(${c.id})">Cancel</button>
                            <button type='button' class='admin-remove-img-btn' onclick="removeCandidateImage(${c.id})">Remove Image</button>
                        </form>
                    </div>
                `).join('')}
            </div>
            <button class="admin-add-candidate-btn" onclick="showAddCandidateForm(${pos.id})">+ Add Candidate</button>
            <form class="admin-add-candidate-form" id="add-candidate-form-${pos.id}" style="display:none;" onsubmit="return addCandidate(${pos.id})">
                <input type='text' id='add-candidate-name-${pos.id}' placeholder='Candidate Name' required>
                <input type='file' accept='image/*' id='add-candidate-image-${pos.id}'>
                <button type='submit'>Add</button>
                <button type='button' onclick="cancelAddCandidate(${pos.id})">Cancel</button>
            </form>
        </div>
    `).join('');
}

// Edit candidate: show form
window.editCandidate = function(candidateId) {
    document.getElementById(`edit-form-${candidateId}`).style.display = 'flex';
    document.getElementById(`candidate-name-${candidateId}`).style.display = 'none';
};
window.cancelEditCandidate = function(candidateId) {
    document.getElementById(`edit-form-${candidateId}`).style.display = 'none';
    document.getElementById(`candidate-name-${candidateId}`).style.display = 'inline';
};

// Trigger file input when image is clicked
window.triggerImageUpload = function(candidateId) {
    document.getElementById(`candidate-img-input-${candidateId}`).click();
};

// Change candidate image instantly (works for both img and initials avatar)
window.changeCandidateImage = async function(candidateId) {
    const input = document.getElementById(`candidate-img-input-${candidateId}`);
    if (input.files && input.files[0]) {
        const formData = new FormData();
        formData.append('image', input.files[0]);
        let imgRes = await fetch(`https://voting-system-backend-xdpf.onrender.com/api/candidates/${candidateId}/image`, {
            method: 'POST',
            body: formData
        });
        if (imgRes.ok) {
            const data = await imgRes.json();
            // Replace avatar with image
            const imgElem = document.getElementById(`candidate-img-${candidateId}`);
            if (imgElem.tagName === 'IMG') {
                imgElem.src = data.image;
            } else {
                // Replace initials div with img
                imgElem.outerHTML = `<img src='${data.image}' alt='' class='admin-candidate-img' id='candidate-img-${candidateId}' style='cursor:pointer;' onclick='triggerImageUpload(${candidateId})'>`;
            }
            showToast('Image updated!');
        } else {
            showToast('Image upload failed', 'error');
        }
    }
};

// Save candidate edits (name, position)
window.saveCandidateEdit = async function(candidateId) {
    event.preventDefault();
    const name = document.getElementById(`edit-candidate-name-${candidateId}`).value;
    const position_id = document.getElementById(`edit-candidate-position-${candidateId}`).value;
    // Update name and position
    let res = await fetch(`https://voting-system-backend-xdpf.onrender.com/api/candidates/${candidateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, position_id })
    });
    if (!res.ok) { showToast('Failed to update candidate', 'error'); return false; }
    showToast('Candidate updated!');
    // Re-render to update avatar and name everywhere
    renderAdminPositions();
    return false;
};

// Delete candidate
window.deleteCandidate = async function(candidateId) {
    if (!confirm('Are you sure you want to delete this candidate?')) return;
    let res = await fetch(`https://voting-system-backend-xdpf.onrender.com/api/candidates/${candidateId}`, { method: 'DELETE' });
    if (res.ok) {
        showToast('Candidate deleted!');
        renderAdminPositions();
    } else {
        showToast('Failed to delete candidate', 'error');
    }
};

// Show add candidate form
window.showAddCandidateForm = function(positionId) {
    document.getElementById(`add-candidate-form-${positionId}`).style.display = 'flex';
};
window.cancelAddCandidate = function(positionId) {
    document.getElementById(`add-candidate-form-${positionId}`).style.display = 'none';
};

// Add candidate (image optional)
window.addCandidate = async function(positionId) {
    event.preventDefault();
    const name = document.getElementById(`add-candidate-name-${positionId}`).value;
    const imageInput = document.getElementById(`add-candidate-image-${positionId}`);
    // Create candidate (without image first)
    let res = await fetch('https://voting-system-backend-xdpf.onrender.com/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, position_id: positionId })
    });
    if (!res.ok) { showToast('Failed to add candidate', 'error'); return false; }
    let { candidate_id } = await res.json();
    // If image selected, upload it
    if (imageInput.files && imageInput.files[0]) {
        const formData = new FormData();
        formData.append('image', imageInput.files[0]);
        let imgRes = await fetch(`https://voting-system-backend-xdpf.onrender.com/candidates/${candidate_id}/image`, {
            method: 'POST',
            body: formData
        });
        if (!imgRes.ok) { showToast('Image upload failed', 'error'); return false; }
    }
    showToast('Candidate added!');
    renderAdminPositions();
    return false;
};

// Render results from backend
async function renderAdminResults() {
    const resultsList = document.getElementById('admin-results-list');
    const res = await fetch('https://voting-system-backend-xdpf.onrender.com/api/results');
    const data = await res.json();
    const results = data.results || [];
    if (results.length === 0) {
        resultsList.innerHTML = '<p>No results found.</p>';
        return;
    }
    // Group by position
    const grouped = {};
    results.forEach(r => {
        if (!grouped[r.position_id]) grouped[r.position_id] = { name: r.position_name, candidates: [] };
        grouped[r.position_id].candidates.push({ name: r.candidate_name, votes: r.votes });
    });
    resultsList.innerHTML = Object.values(grouped).map(pos => {
        const leader = pos.candidates.reduce((max, c) => c.votes > max.votes ? c : max, { votes: -1 });
        return `
            <div style='margin-bottom:1.5rem;'>
                <strong>${pos.name}</strong><br>
                <ul>
                    ${pos.candidates.map(c => `<li>${c.name}: ${c.votes} votes</li>`).join('')}
                </ul>
                <em>Current Leader: ${leader.name || 'No votes yet'}</em>
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
        const response = await fetch('https://voting-system-backend-xdpf.onrender.com/api/users', {
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
