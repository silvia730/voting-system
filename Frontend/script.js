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

// Helper: Get users from localStorage
function getUsers() {
    return JSON.parse(localStorage.getItem('users') || '[]');
}

// Helper: Save users to localStorage
function saveUsers(users) {
    localStorage.setItem('users', JSON.stringify(users));
}

// Helper: Get current user from localStorage
function getCurrentUser() {
    return JSON.parse(localStorage.getItem('currentUser') || 'null');
}

// Helper: Set current user in localStorage
function setCurrentUser(user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
}

// Helper: Remove current user
function removeCurrentUser() {
    localStorage.removeItem('currentUser');
}

// Login logic
loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    let users = getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
        alert('Invalid credentials.');
        return;
    }
    setCurrentUser(user);
    showVotingPage();
});

// Logout
logoutBtn.addEventListener('click', function() {
    removeCurrentUser();
    showSection(loginSection);
});

// Back to login from results
backToLogin.addEventListener('click', function() {
    removeCurrentUser();
    showSection(loginSection);
});

// Show voting page
function showVotingPage() {
    const user = getCurrentUser();
    if (!user) {
        showSection(loginSection);
        return;
    }
    // If user has already voted, show message and disable form
    if (user.hasVoted) {
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

// Voting logic
votingForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const user = getCurrentUser();
    if (!user) return;
    let votes = {};
    let allVoted = true;
    positions.forEach(pos => {
        const selected = document.querySelector(`input[name='position-${pos.id}']:checked`);
        if (selected) {
            votes[pos.id] = selected.value;
        } else {
            allVoted = false;
        }
    });
    if (!allVoted) {
        alert('Please vote for all positions.');
        return;
    }
    // Save vote to user
    let users = getUsers();
    let idx = users.findIndex(u => u.email === user.email);
    users[idx].hasVoted = true;
    users[idx].votes = votes;
    saveUsers(users);
    setCurrentUser(users[idx]);
    voteMessage.textContent = 'You have already cast your vote. Please wait for results.';
    votingForm.style.display = 'none';
});

// Simulate results (for demo: show results if all users have voted)
function showResultsPage() {
    // Tally votes
    let users = getUsers();
    let voteCounts = {};
    positions.forEach(pos => {
        voteCounts[pos.id] = {};
        pos.candidates.forEach(candidate => {
            voteCounts[pos.id][candidate.name] = 0;
        });
    });
    users.forEach(user => {
        if (user.hasVoted && user.votes) {
            Object.entries(user.votes).forEach(([posId, candidateName]) => {
                if (voteCounts[posId] && voteCounts[posId][candidateName] !== undefined) {
                    voteCounts[posId][candidateName]++;
                }
            });
        }
    });
    // Render results
    resultsContainer.innerHTML = '';
    positions.forEach(pos => {
        const posDiv = document.createElement('div');
        posDiv.innerHTML = `<strong>${pos.name}</strong><br>`;
        let maxVotes = 0;
        let winner = '';
        pos.candidates.forEach(candidate => {
            const count = voteCounts[pos.id][candidate.name];
            posDiv.innerHTML += `${candidate.name}: ${count} votes<br>`;
            if (count > maxVotes) {
                maxVotes = count;
                winner = candidate.name;
            }
        });
        posDiv.innerHTML += `<em>Winner: ${winner || 'No votes yet'}</em><br><br>`;
        resultsContainer.appendChild(posDiv);
    });
    showSection(resultsSection);
}

// For demo: show results if all users have voted
function checkIfAllVoted() {
    let users = getUsers();
    if (users.length > 0 && users.every(u => u.hasVoted)) {
        showResultsPage();
    }
}

// For now, check after every vote
votingForm.addEventListener('submit', function() {
    setTimeout(checkIfAllVoted, 500);
});

// On page load, show login or voting if already logged in
window.onload = function() {
    const user = getCurrentUser();
    if (user) {
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
    let users = getUsers();
    const user = users.find(u => u.email === email);
    if (!user) {
        alert('No account found with that email.');
        return;
    }
    // Simulate sending reset link
    alert('A password reset link has been sent to your email (simulated).');
    showSection(loginSection);
});