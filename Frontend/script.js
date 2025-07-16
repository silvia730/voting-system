// Categories and positions with candidate images
let categories = [];
let positions = [];

// Fetch positions and categories from backend
async function fetchPositionsAndCategories() {
    const res = await fetch('https://voting-system-backend-cewd.onrender.com/api/positions');
    const data = await res.json();
    positions = data.positions || [];
    // Extract unique categories from positions
    const catMap = {};
    positions.forEach(pos => {
        if (pos.category && !catMap[pos.category]) {
            catMap[pos.category] = { id: pos.category, name: capitalize(pos.category) };
        }
    });
    categories = Object.values(catMap);
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Section elements
const loginSection = document.getElementById('login-section');
const votingSection = document.getElementById('voting-section');
const resultsSection = document.getElementById('results-section');
const forgotPasswordSection = document.getElementById('forgot-password-section');

// Forms and containers
const loginForm = document.getElementById('login-form');
const votingForm = document.getElementById('voting-form');
const positionsContainer = document.getElementById('positions-container');
const voteMessage = document.getElementById('vote-message');
const resultsContainer = document.getElementById('results-container');

// Navigation buttons
const logoutBtn = document.getElementById('logout-btn');
const backToLogin = document.getElementById('back-to-login');

// Helper: Show only one section
function showSection(section) {
    loginSection.style.display = 'none';
    votingSection.style.display = 'none';
    resultsSection.style.display = 'none';
    forgotPasswordSection.style.display = 'none';
    section.style.display = 'block';
}

// Store the current user in a JS variable for the session
let currentUser = null;

// Login logic (refactored to use backend API)
loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    try {
        const response = await fetch('https://voting-system-backend-cewd.onrender.com/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!data.success) {
            alert(data.message || 'Invalid credentials.');
            return;
        }
        currentUser = data.user;
        await showVotingPage(); // Wait for positions to be fetched
    } catch (err) {
        alert('Error connecting to server.');
    }
});

// Logout
logoutBtn.addEventListener('click', function() {
    currentUser = null;
    showSection(loginSection);
});

// Back to login from results
backToLogin.addEventListener('click', function() {
    currentUser = null;
    showSection(loginSection);
});

// Show voting page (fetch live data)
async function showVotingPage() {
    if (!currentUser) {
        showSection(loginSection);
        return;
    }
    await fetchPositionsAndCategories();
    // If user has already voted, show message and disable form
    if (currentUser.hasVoted) {
        votingForm.style.display = 'none';
        voteMessage.textContent = 'You have already cast your vote. Please wait for results.';
    } else {
        votingForm.style.display = 'block';
        voteMessage.textContent = '';
        renderPositions();
    }
    showSection(votingSection);
}

// Render positions and candidates, grouped by category (from live data)
function renderPositions() {
    positionsContainer.innerHTML = '';
    categories.forEach(cat => {
        const catPositions = positions.filter(pos => pos.category === cat.id);
        if (catPositions.length > 0) {
            const catDiv = document.createElement('div');
            catDiv.innerHTML = `<h3 style='margin-bottom:0.5rem;'>${cat.name}</h3>`;
            catPositions.forEach(pos => {
                const posDiv = document.createElement('div');
                posDiv.innerHTML = `<strong>${pos.name}</strong><br>`;
                (pos.candidates || []).forEach(candidate => {
                    const card = document.createElement('div');
                    card.className = 'candidate-card';
                    const radio = document.createElement('input');
                    radio.type = 'radio';
                    radio.name = `position-${pos.id}`;
                    radio.value = candidate.id;
                    radio.style.marginRight = '0.5rem';
                    const img = document.createElement('img');
                    img.src = candidate.image && candidate.image.trim() ? candidate.image : 'images/placeholder.jpg';
                    img.alt = candidate.name;
                    img.className = 'candidate-img';
                    const nameSpan = document.createElement('span');
                    nameSpan.className = 'candidate-name';
                    nameSpan.textContent = candidate.name;
                    card.appendChild(radio);
                    card.appendChild(img);
                    card.appendChild(nameSpan);
                    posDiv.appendChild(card);
                });
                catDiv.appendChild(posDiv);
            });
            positionsContainer.appendChild(catDiv);
        }
    });
}

// Voting logic (refactored to use backend API)
votingForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!currentUser) return;
    let votesById = {};
    let allVoted = true;
    positions.forEach(pos => {
        const selected = document.querySelector(`input[name='position-${pos.id}']:checked`);
        if (selected) {
            votesById[pos.id] = parseInt(selected.value);
        } else {
            allVoted = false;
        }
    });
    if (!allVoted) {
        alert('Please vote for all positions.');
        return;
    }
    try {
        const response = await fetch('https://voting-system-backend-cewd.onrender.com/api/vote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser.id, votes: votesById })
        });
        const data = await response.json();
        if (!data.success) {
            alert(data.message || 'Failed to submit vote.');
            return;
        }
        currentUser.hasVoted = true;
        voteMessage.textContent = 'You have already cast your vote. Please wait for results.';
        votingForm.style.display = 'none';
        // Optionally, notify admin dashboard to refresh users/results (if open)
        if (window.parent && window.parent.renderAdminUsers) window.parent.renderAdminUsers();
        if (window.parent && window.parent.renderAdminResults) window.parent.renderAdminResults();
    } catch (err) {
        alert('Error submitting vote to server.');
    }
});

// Refactored: Show results by fetching from backend
async function showResultsPage() {
    try {
        const response = await fetch('https://voting-system-backend-cewd.onrender.com/api/results');
        const data = await response.json();
        if (!Array.isArray(data)) {
            resultsContainer.innerHTML = '<em>No results available.</em>';
            showSection(resultsSection);
            return;
        }
        resultsContainer.innerHTML = '';
        // Group results by position
        const grouped = {};
        data.forEach(row => {
            if (!grouped[row.position_id]) {
                grouped[row.position_id] = {
                    position_name: row.position_name,
                    candidates: []
                };
            }
            grouped[row.position_id].candidates.push({
                candidate_name: row.candidate_name,
                votes: row.votes
            });
        });
        Object.values(grouped).forEach(pos => {
            const posDiv = document.createElement('div');
            posDiv.innerHTML = `<strong>${pos.position_name}</strong><br>`;
            let maxVotes = 0;
            let winner = '';
            pos.candidates.forEach(candidate => {
                posDiv.innerHTML += `${candidate.candidate_name}: ${candidate.votes} votes<br>`;
                if (candidate.votes > maxVotes) {
                    maxVotes = candidate.votes;
                    winner = candidate.candidate_name;
                }
            });
            posDiv.innerHTML += `<em>Winner: ${winner || 'No votes yet'}</em><br><br>`;
            resultsContainer.appendChild(posDiv);
        });
        showSection(resultsSection);
    } catch (err) {
        resultsContainer.innerHTML = '<em>Error fetching results from server.</em>';
        showSection(resultsSection);
    }
}

// On page load, show login or voting if already logged in (session only)
window.onload = function() {
    if (currentUser) {
        showVotingPage();
    } else {
        showSection(loginSection);
    }
};

// Forgot password logic
const forgotPasswordLink = document.getElementById('forgot-password-link');
const forgotPasswordForm = document.getElementById('forgot-password-form');
const backToLoginFromForgot = document.getElementById('back-to-login-from-forgot');

forgotPasswordLink.addEventListener('click', function(e) {
    e.preventDefault();
    showSection(forgotPasswordSection);
});

backToLoginFromForgot.addEventListener('click', function(e) {
    e.preventDefault();
    showSection(loginSection);
});

forgotPasswordForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value.trim();
    let users = getUsers(); // This function is no longer available
    const user = users.find(u => u.email === email);
    if (!user) {
        alert('No account found with that email.');
        return;
    }
    // Simulate sending reset link
    alert('A password reset link has been sent to your email (simulated).');
    showSection(loginSection);
});
