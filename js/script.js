document.addEventListener('DOMContentLoaded', () => {
const navbar = document.querySelector('.navbar');
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

window.addEventListener('scroll', () => {
    if (window.scrollY > 60) {
        navbar.style.background = 'black';
        navbar.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
    } else {
        navbar.style.background = 'rgba(0,0,0,0.6)';
        navbar.style.boxShadow = 'none';
    }
});

if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
}
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
    });
});

    // --- Global Helpers ---
    window.showAdminTab = (tabId) => {
        document.querySelectorAll('.admin-tab').forEach(el => el.style.display = 'none');
        document.getElementById(tabId).style.display = 'block';
    };

    // Fix Delete Button Scope
    window.deleteItem = async (e, type, id) => {
        e.stopPropagation(); // Prevent card click event
        if (!confirm('Are you sure you want to delete this?')) return;
        try {
            await fetch(`/api/${type}/${id}`, { method: 'DELETE' });
            if (type === 'events') loadEvents();
            if (type === 'projects') loadProjects();
            if (type === 'team') loadTeam();
        } catch (err) { alert('Delete failed'); }
    };

    // --- Content Modals ---
    const contentModal = document.getElementById('content-modal');
    const modalBody = document.getElementById('modal-body-content');

    window.openProjectModal = (event, project) => {
        event.stopPropagation();
        event.preventDefault();
        modalBody.innerHTML = `
            <div class="modal-header">
                <h2>${project.title}</h2>
            </div>
            <div class="modal-body">
                <div class="modal-section">
                    <h3>Description</h3>
                    <p>${project.description}</p>
                </div>
                <div class="modal-section">
                    <h3>Tech Stack</h3>
                    <div class="tech-stack">
                        ${project.tech.split(',').map(t => `<span class="tech-badge">${t.trim()}</span>`).join('')}
                    </div>
                </div>
                <div class="modal-actions">
                    <a href="${project.repoLink}" target="_blank" class="btn primary-btn">View Repository →</a>
                </div>
            </div>
        `;
        contentModal.style.display = 'flex';
        document.body.classList.add('modal-open');

    };

    window.openActivityModal = (event, activity) => {
        window.openEventModal = (event, evt) => {
            event.stopPropagation();
            event.preventDefault();

            modalBody.innerHTML = `
                <div class="modal-header">
                <h2>${evt.title}</h2>
                    <p class="modal-date">${new Date(evt.date).toDateString()}</p>
                </div>

                <div class="modal-body">
                    <div class="modal-section">
                        <h3>Description</h3>
                        <p>${evt.description}</p>
                    </div>

                    ${evt.link && evt.link !== '#'
                        ? `
                        <div class="modal-actions">
                            <a href="${evt.link}" target="_blank" class="register-link">
                                Register
                            </a>
                        </div>
                        `
                        : ''
                    }
                </div>
            `;

            contentModal.style.display = 'flex';
            document.body.classList.add('modal-open');

        };

        event.stopPropagation();
        event.preventDefault();


        modalBody.innerHTML = `
            <div class="modal-header">
                <h2>${activity.title}</h2>
                <p class="modal-date">${new Date(activity.date).toDateString()}</p>
            </div>
            <div class="modal-body">
                <div class="modal-section">
                    <h3>Description</h3>
                    <p>${activity.description}</p>
                </div>
            </div>
        `;
        contentModal.style.display = 'flex';
        document.body.classList.add('modal-open');

    };

    // Close modals on outside click
    window.onclick = (e) => {
        if (e.target == contentModal) {
            contentModal.style.display = "none";
            document.body.classList.remove('modal-open');
        }
    };


    // --- Render Logic ---

    async function loadEvents() {
        const upcomingContainer = document.getElementById('upcoming-events-container');
        const activitiesContainer = document.getElementById('activities-container');
        const isAdmin = localStorage.getItem('isAdmin') === 'true';

        const res = await fetch('/api/events');
        const events = await res.json();
        const now = new Date(); now.setHours(0, 0, 0, 0);

        upcomingContainer.innerHTML = events.filter(e => new Date(e.date) >= now).map(evt => {
            const splash = (evt.images && evt.images.length > 0) ? evt.images[0] : (evt.image || null);
            return `
            <div class="card event-card" onclick="openEventModal(event, ${JSON.stringify(evt).replace(/"/g, '&quot;')})">
                ${isAdmin ? `<div class="delete-btn" onclick="deleteItem(event, 'events', ${evt.id})">&times;</div>` : ''}
                ${splash ? `<img src="${splash}">` : ''}
                <div class="card-content">
                    <span class="card-date">${new Date(evt.date).toDateString()}</span>
                    <h3>${evt.title}</h3>
                    <p>${evt.description.substring(0, 100)}...</p>
                    ${evt.link ? `<a href="${evt.link}" target="_blank" class="btn primary-btn" style="margin-top:10px; font-size:0.8rem;">Register</a>` : ''}
                </div>
            </div>`;
        }).join('') || '<p>No upcoming events.</p>';

        activitiesContainer.innerHTML = events.filter(e => new Date(e.date) < now).map(evt => {
            const safeEvt = JSON.stringify(evt).replace(/"/g, '&quot;');
            const activityImage = (evt.images && evt.images.length > 0) ? evt.images[0] : (evt.image || null);
            return `
            <div class="activity-item" onclick="openActivityModal(event, ${safeEvt})">
                ${isAdmin ? `<div class="delete-btn" onclick="deleteItem(event, 'events', ${evt.id})">&times;</div>` : ''}
                ${activityImage ? `<img src="${activityImage}" class="activity-card-img" alt="${evt.title}">` : ''}
                <h3>${evt.title}</h3>
            </div>`;
        }).join('') || '<p style="color:white;">No activities.</p>';
    }

    async function loadProjects() {
        const container = document.getElementById('projects-container');
        const isAdmin = localStorage.getItem('isAdmin') === 'true';
        const res = await fetch('/api/projects');
        const projects = await res.json();

        container.innerHTML = projects.map(proj => {
            const safeProj = JSON.stringify(proj).replace(/"/g, '&quot;');
            return `
            <div class="project-card-horizontal" onclick="openProjectModal(event, ${safeProj})">
                ${isAdmin ? `<div class="delete-btn" onclick="deleteItem(event, 'projects', ${proj.id})">&times;</div>` : ''}
                <h3>${proj.title}</h3>
                <div class="tech-stack" style="margin-top:15px;">
                    ${proj.tech.split(',').map(t => `<span class="tech-badge">${t.trim()}</span>`).join('')}
                </div>
            </div>`;
        }).join('') || '<p>No projects.</p>';
    }

    async function loadTeam() {
        const container = document.getElementById('team-container');
        const isAdmin = localStorage.getItem('isAdmin') === 'true';
        const res = await fetch('/api/team');
        const team = await res.json();

        container.innerHTML = team.map(member => `
            <div class="team-card">
                ${isAdmin ? `<div class="delete-btn" onclick="deleteItem(event, 'team', ${member.id})">&times;</div>` : ''}
                <img src="${member.photo || 'https://via.placeholder.com/250'}" class="team-photo">
                <div class="team-overlay">
                    <h3>${member.name}</h3>
                    <p style="color:var(--accent-green)">${member.role}</p>
                    <p>${member.dept}</p>
                </div>
            </div>
        `).join('') || '<p>No team members.</p>';
    }

    // --- Admin & Setup ---
    const adminBtn = document.getElementById('open-admin-btn');

    if (adminBtn) {
        if (localStorage.getItem('isAdmin') === 'true') {
            adminBtn.removeAttribute('href');
            adminBtn.style.cursor = 'pointer';
            adminBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const dashboard = document.querySelector('#admin-dashboard');
                dashboard.style.display = 'block';
                setTimeout(() => {
                    dashboard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 0);
            });
        }
    }

    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('isAdmin');
        window.location.reload();
    });

    function checkAdmin() {
        const isAdmin = localStorage.getItem('isAdmin') === 'true';
        document.getElementById('admin-dashboard').style.display = isAdmin ? 'block' : 'none';
        adminBtn.textContent = isAdmin ? 'Dashboard' : 'Admin';
        loadEvents(); loadProjects(); loadTeam();
    }

    checkAdmin();

    document.getElementById('event-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await fetch('/api/events', { method: 'POST', body: new FormData(e.target) });
        e.target.reset(); alert('Posted'); loadEvents();
    });

    document.getElementById('team-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await fetch('/api/team', { method: 'POST', body: new FormData(e.target) });
        e.target.reset(); alert('Posted'); loadTeam();
    });

    document.getElementById('project-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const d = Object.fromEntries(new FormData(e.target).entries());
        await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(d)
        });
        e.target.reset(); alert('Posted'); loadProjects();
    });

    const activitiesSection = document.querySelector('.activities-section');
    const activityObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.8s ease-out forwards';
                const activityCards = entry.target.querySelectorAll('.activity-item');
                activityCards.forEach((card, index) => {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(50px)';
                    setTimeout(() => {
                        card.style.transition = 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, index * 100);
                });
                activityObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });

    if (activitiesSection) {
        activityObserver.observe(activitiesSection);
    }

});

