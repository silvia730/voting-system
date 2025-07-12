// Categories and positions with candidate images
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
        showVotingPage();
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

// Show voting page
function showVotingPage() {
    if (!currentUser) {
        showSection(loginSection);
        return;
    }
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

// Render positions and candidates, grouped by category
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
                pos.candidates.forEach(candidate => {
                    const card = document.createElement('div');
                    card.className = 'candidate-card';
                    const radio = document.createElement('input');
                    radio.type = 'radio';
                    radio.name = `position-${pos.id}`;
                    radio.value = candidate.name;
                    radio.style.marginRight = '0.5rem';
                    const img = document.createElement('img');
                    img.src = candidate.image || 'images/placeholder.jpg';
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
    let votes = {};
    let allVoted = true;
    positions.forEach(pos => {
        const selected = document.querySelector(`input[name='position-${pos.id}']:checked`);
        if (selected) {
            // Find candidate ID by name
            const candidate = pos.candidates.find(c => c.name === selected.value);
            if (candidate) {
                votes[pos.id] = candidate.name; // We'll map to candidate ID below
            }
        } else {
            allVoted = false;
        }
    });
    if (!allVoted) {
        alert('Please vote for all positions.');
        return;
    }
    // Map candidate names to IDs for backend
    let votesById = {};
    positions.forEach(pos => {
        const selected = document.querySelector(`input[name='position-${pos.id}']:checked`);
        if (selected) {
            const candidate = pos.candidates.find(c => c.name === selected.value);
            if (candidate) {
                votesById[pos.id] = candidate.id || pos.candidates.indexOf(candidate) + 1; // fallback if no id
            }
        }
    });
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
