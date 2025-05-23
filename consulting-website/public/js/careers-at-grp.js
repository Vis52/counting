
        // Job data
        const jobs = [
            {
                id: 1,
                title: "Senior Frontend Developer",
                department: "engineering",
                location: "Remote",
                type: "Full-time",
                salary: "₹120,000 - ₹150,000",
                posted: "2 days ago",
                description: "We're looking for an experienced frontend developer to lead our web application development. You'll work with React, TypeScript, and modern web technologies to build beautiful, performant user interfaces.",
                tags: ["React", "TypeScript", "CSS", "UI/UX"],
                email: "info@grpcareer.com"
            },
            {
                id: 2,
                title: "Product Designer",
                department: "design",
                location: "Noida",
                type: "Full-time",
                salary: "₹110,000 - ₹140,000",
                posted: "1 week ago",
                description: "Join our design team to create intuitive, user-centered products. You'll collaborate with engineers and product managers to design flows, prototypes, and high-fidelity visuals for our products.",
                tags: ["Figma", "UX Research", "Prototyping", "User Testing"],
                email: "info@grpcareer.com"
            },
            {
                id: 3,
                title: "DevOps Engineer",
                department: "engineering",
                location: "Remote",
                type: "Full-time",
                salary: "₹130,000 - ₹160,000",
                posted: "3 days ago",
                description: "We need a DevOps engineer to build and maintain our cloud infrastructure. You'll work with AWS, Kubernetes, Terraform, and CI/CD pipelines to ensure our systems are scalable, reliable, and secure.",
                tags: ["AWS", "Kubernetes", "Terraform", "CI/CD"],
                email: "info@grpcareer.com"
            },
            {
                id: 4,
                title: "Marketing Specialist",
                department: "marketing",
                location: "Noida",
                type: "Full-time",
                salary: "₹80,000 - ₹100,000",
                posted: "5 days ago",
                description: "Join our marketing team to develop and execute campaigns that drive growth. You'll create content, manage social media, analyze performance metrics, and help shape our brand voice.",
                tags: ["Content Marketing", "Social Media", "SEO", "Analytics"],
                email: "info@grpcareer.com"
            },
            {
                id: 5,
                title: "Backend Engineer (Node.js)",
                department: "engineering",
                location: "Remote",
                type: "Full-time",
                salary: "₹115,000 - ₹145,000",
                posted: "1 day ago",
                description: "We're seeking a backend engineer to develop and maintain our server infrastructure. You'll work with Node.js, MongoDB, and microservices architecture to build scalable APIs and services.",
                tags: ["Node.js", "MongoDB", "REST APIs", "Microservices"],
                email: "info@grpcareer.com"
            }
        ];

        // DOM elements
        const jobListings = document.getElementById('jobListings');
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');
        const deptFilter = document.getElementById('deptFilter');
        const locationFilter = document.getElementById('locationFilter');
        const typeFilter = document.getElementById('typeFilter');
        const deptFilterBtn = document.getElementById('deptFilterBtn');
        const locationFilterBtn = document.getElementById('locationFilterBtn');
        const typeFilterBtn = document.getElementById('typeFilterBtn');
        const resetFilters = document.getElementById('resetFilters');
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        const currentYear = document.getElementById('currentYear');

        // State
        let filters = {
            search: '',
            department: 'all',
            location: 'all',
            type: 'all'
        };
        let savedJobs = JSON.parse(localStorage.getItem('savedJobs')) || [];
        let displayedJobs = 3; // Initial number of jobs to display
        const jobsPerPage = 3;

        // Set current year
        currentYear.textContent = new Date().getFullYear();

        // Sanitize HTML to prevent XSS
        function sanitizeHTML(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }

        // Render jobs
        function renderJobs() {
            jobListings.innerHTML = '<div class="loading">Loading jobs...</div>';
            setTimeout(() => {
                const filteredJobs = jobs.filter(job => {
                    const searchMatch = filters.search === '' ||
                        job.title.toLowerCase().includes(filters.search.toLowerCase()) ||
                        job.description.toLowerCase().includes(filters.search.toLowerCase()) ||
                        job.location.toLowerCase().includes(filters.search.toLowerCase());
                    const deptMatch = filters.department === 'all' || job.department === filters.department;
                    const locationMatch = filters.location === 'all' || job.location.toLowerCase().includes(filters.location.toLowerCase());
                    const typeMatch = filters.type === 'all' || job.type.toLowerCase() === filters.type.toLowerCase();
                    return searchMatch && deptMatch && locationMatch && typeMatch;
                });

                const jobsToShow = filteredJobs.slice(0, displayedJobs);
                jobListings.innerHTML = jobsToShow.length > 0 ? jobsToShow.map(job => `
                    <div class="job-card" data-id="${job.id}">
                        <h3 class="job-title">${sanitizeHTML(job.title)}</h3>
                        <div class="job-meta">
                            <span><i class="fas fa-map-marker-alt"></i> ${sanitizeHTML(job.location)}</span>
                            <span><i class="fas fa-briefcase"></i> ${sanitizeHTML(job.type)}</span>
                            <span><i class="fas fa-dollar-sign"></i> ${sanitizeHTML(job.salary)}</span>
                            <span><i class="fas fa-clock"></i> Posted ${sanitizeHTML(job.posted)}</span>
                        </div>
                        <p class="job-description">${sanitizeHTML(job.description)}</p>
                        <div class="job-tags">
                            ${job.tags.map(tag => `<span class="job-tag">${sanitizeHTML(tag)}</span>`).join('')}
                        </div>
                        <div class="job-actions">
                            <a href="mailto:${encodeURIComponent(job.email)}?subject=Application for ${encodeURIComponent(job.title)}" class="apply-btn" aria-label="Apply for ${sanitizeHTML(job.title)}">Apply Now</a>
                            <button class="save-btn ${savedJobs.includes(job.id) ? 'saved' : ''}" data-id="${job.id}" aria-label="${savedJobs.includes(job.id) ? 'Remove from saved jobs' : 'Save job'} ${sanitizeHTML(job.title)}">
                                <i class="far fa-bookmark"></i> ${savedJobs.includes(job.id) ? 'Saved' : 'Save'}
                            </button>
                        </div>
                    </div>
                `).join('') : '<p style="text-align: center; color: var(--gray);">No jobs match your criteria.</p>';

                loadMoreBtn.style.display = displayedJobs >= filteredJobs.length ? 'none' : 'block';
            }, 500);
        }

        // Save job
        function toggleSaveJob(jobId) {
            const index = savedJobs.indexOf(jobId);
            if (index === -1) {
                savedJobs.push(jobId);
                alert('Job saved!');
            } else {
                savedJobs.splice(index, 1);
                alert('Job removed from saved!');
            }
            localStorage.setItem('savedJobs', JSON.stringify(savedJobs));
            renderJobs();
        }

        // Update filter button text
        function updateFilterButton(btn, value) {
            const label = btn.parentElement.querySelector(`[data-value="${value}"]`).textContent;
            btn.innerHTML = `${sanitizeHTML(label)} <i class="fas fa-chevron-down"></i>`;
        }

        // Event listeners
        searchBtn.addEventListener('click', () => {
            filters.search = searchInput.value.trim();
            displayedJobs = jobsPerPage;
            renderJobs();
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                filters.search = searchInput.value.trim();
                displayedJobs = jobsPerPage;
                renderJobs();
            }
        });

        deptFilter.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') {
                e.preventDefault();
                filters.department = e.target.dataset.value;
                updateFilterButton(deptFilterBtn, filters.department);
                displayedJobs = jobsPerPage;
                renderJobs();
            }
        });

        locationFilter.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') {
                e.preventDefault();
                filters.location = e.target.dataset.value;
                updateFilterButton(locationFilterBtn, filters.location);
                displayedJobs = jobsPerPage;
                renderJobs();
            }
        });

        typeFilter.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') {
                e.preventDefault();
                filters.type = e.target.dataset.value;
                updateFilterButton(typeFilterBtn, filters.type);
                displayedJobs = jobsPerPage;
                renderJobs();
            }
        });

        resetFilters.addEventListener('click', () => {
            filters = { search: '', department: 'all', location: 'all', type: 'all' };
            searchInput.value = '';
            deptFilterBtn.innerHTML = 'All Departments <i class="fas fa-chevron-down"></i>';
            locationFilterBtn.innerHTML = 'All Locations <i class="fas fa-chevron-down"></i>';
            typeFilterBtn.innerHTML = 'All Types <i class="fas fa-chevron-down"></i>';
            displayedJobs = jobsPerPage;
            renderJobs();
        });

        loadMoreBtn.addEventListener('click', () => {
            displayedJobs += jobsPerPage;
            renderJobs();
        });

        jobListings.addEventListener('click', (e) => {
            if (e.target.closest('.save-btn')) {
                const btn = e.target.closest('.save-btn');
                const jobId = parseInt(btn.dataset.id);
                toggleSaveJob(jobId);
            }
        });

        jobListings.addEventListener('keydown', (e) => {
            if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.save-btn')) {
                e.preventDefault();
                const btn = e.target.closest('.save-btn');
                const jobId = parseInt(btn.dataset.id, 10); // Specify radix
                if (!isNaN(jobId)) {
                    toggleSaveJob(jobId);
                } else {
                    console.error('Invalid job ID');
                }
            }
        });

        // Department filter from dept cards
        const deptGrid = document.querySelector('.dept-grid');
        if (deptGrid) {
            deptGrid.addEventListener('click', (e) => {
                if (e.target.closest('a[data-dept]')) {
                    e.preventDefault();
                    const dept = e.target.closest('a[data-dept]').dataset.dept;
                    filters.department = dept;
                    updateFilterButton(deptFilterBtn, dept);
                    displayedJobs = jobsPerPage;
                    renderJobs();
                    if (jobListings) {
                        window.scrollTo({ top: jobListings.offsetTop, behavior: 'smooth' });
                    } else {
                        console.error('Job listings container not found');
                    }
                }
            });
        } else {
            console.error('Department grid not found');
        }

        // Initial render
        renderJobs();