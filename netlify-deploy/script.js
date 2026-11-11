"use strict";

const skillsContainer = document.getElementById("skills-list");
const contactForm = document.getElementById("contact-form");
const formStatus = document.getElementById("form-status");
const downloadCVButton = document.getElementById("download-cv");
const categoryList = document.getElementById("category-list");
const categoryProjectsPanel = document.getElementById("category-projects-panel");
const categoryProjectsTitle = document.getElementById("category-projects-title");
const categoryProjectList = document.getElementById("category-project-list");
let portfolioSkills = [];
let revealObserver = null;
const observedElements = new WeakSet();

async function fetchJson(url, options) {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "The request could not be completed.");
    }

    return data;
}

async function loadSkills() {
    try {
        const skills = await fetchJson("skills.json");
        if (!Array.isArray(skills)) {
            throw new Error("Skills data is not available in the expected format.");
        }

        if (skills.length === 0) {
            portfolioSkills = [];
            skillsContainer.innerHTML = '<p class="loading-message">No skills have been added yet.</p>';
            return;
        }

        portfolioSkills = skills.map((skill) => String(skill.skill_name));
        skillsContainer.innerHTML = skills.map((skill, index) => {
            const percentage = Number(skill.percentage);
            if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
                throw new Error("A skill has an invalid percentage.");
            }
            const safeName = escapeHtml(String(skill.skill_name));
            const delay = index * 100;
            return `<div class="skill-item">
                <div class="skill-meta"><h3>${safeName}</h3><span>${percentage}%</span></div>
                <div class="skill-track" role="progressbar" aria-label="${safeName}" aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100">
                    <div class="skill-fill" data-width="${percentage}" style="transition-delay:${delay}ms"></div>
                </div>
            </div>`;
        }).join("");

        requestAnimationFrame(() => {
            skillsContainer.querySelectorAll(".skill-fill").forEach((bar) => {
                bar.style.width = `${bar.dataset.width}%`;
            });
        });
    } catch (error) {
        skillsContainer.innerHTML = `<p class="error-message">${escapeHtml(error.message)} Please try again later.</p>`;
    }
}

const projectCategories = [
    { type: "hotel", title: "Hotel Websites", description: "Welcoming, polished websites for hotels, resorts, and stays.", cover: "images/category-hotel.svg" },
    { type: "business", title: "Business Websites", description: "Professional websites that help businesses stand out and grow.", cover: "images/category-business.svg" },
    { type: "educational", title: "Educational Websites", description: "Clear, engaging websites for schools, colleges, and learning.", cover: "images/category-educational.svg" }
];
let availableProjectCategories = projectCategories.map((category) => ({ ...category, projects: [] }));

function safeHttpUrl(value) {
    const rawValue = String(value || "").trim();
    if (!rawValue) {
        return "";
    }

    try {
        const url = new URL(rawValue, window.location.href);
        return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
        return "";
    }
}

function safeImageUrl(value) {
    const rawValue = String(value || "").trim();
    if (!rawValue) {
        return "";
    }

    const absoluteUrl = safeHttpUrl(rawValue);
    if (!absoluteUrl) {
        return "";
    }

    if (/^https?:\/\//i.test(rawValue)) {
        return absoluteUrl;
    }

    try {
        const url = new URL(rawValue, window.location.href);
        return url.origin === window.location.origin ? rawValue : "";
    } catch {
        return "";
    }
}

function normalizeProjectCategories(data) {
    if (!Array.isArray(data)) {
        throw new Error("Projects data is not available in the expected format.");
    }

    const groups = new Map(projectCategories.map((category) => [category.type, { ...category, projects: [] }]));
    if (data.some((item) => Array.isArray(item.projects))) {
        data.forEach((category) => {
            const group = groups.get(category.type);
            if (group && Array.isArray(category.projects)) {
                group.projects = category.projects;
                group.cover = safeHttpUrl(category.cover) || group.cover;
                group.description = String(category.description || group.description);
            }
        });
    } else {
        data.forEach((project) => {
            const group = groups.get(String(project.project_type || ""));
            if (group) {
                group.projects.push(project);
            }
        });
    }

    return Array.from(groups.values());
}

function renderProjectCategories(categories) {
    categoryList.innerHTML = categories.map((category) => {
        const cover = safeImageUrl(category.projects[0]?.image) || safeImageUrl(category.cover) || "images/category-business.svg";
        const title = escapeHtml(category.title);
        const description = escapeHtml(category.description);
        return `<div class="col-md-6 col-lg-4">
            <article class="category-card">
                <img class="category-card-image" src="${escapeHtml(cover)}" alt="${title} cover image" loading="lazy" decoding="async">
                <div class="category-card-content">
                    <div class="category-card-title-row">
                        <h3>${title}</h3>
                        <span class="category-count">${category.projects.length} ${category.projects.length === 1 ? "Project" : "Projects"}</span>
                    </div>
                    <p>${description}</p>
                    <button class="category-view-button" type="button" data-category-type="${escapeHtml(category.type)}" aria-controls="category-projects-panel">
                        <span>View All Projects</span><span class="category-button-arrow" aria-hidden="true">→</span>
                    </button>
                </div>
            </article>
        </div>`;
    }).join("");
    observeRevealElements();
    categoryList.querySelectorAll(".category-card-image").forEach((image) => {
        image.addEventListener("error", () => {
            image.src = "profile.jpg";
        }, { once: true });
    });
}

function showCategoryProjects(category) {
    categoryProjectsTitle.textContent = category.title;
    if (category.projects.length === 0) {
        categoryProjectList.innerHTML = '<p class="loading-message">There are no projects in this category yet.</p>';
    } else {
        categoryProjectList.innerHTML = category.projects.map((project) => {
            const title = escapeHtml(String(project.title || "Untitled project"));
            const description = escapeHtml(String(project.description || ""));
            const imageUrl = safeImageUrl(project.image) || "profile.jpg";
            const image = `<img class="category-card-image" src="${escapeHtml(imageUrl)}" alt="${title} website project" loading="lazy" decoding="async">`;
            const projectUrl = safeHttpUrl(project.link || project.project_link);
            const link = projectUrl
                ? `<a class="btn view-project-btn px-4 py-2 rounded-pill" href="${escapeHtml(projectUrl)}" target="_blank" rel="noopener noreferrer">Visit Website</a>`
                : "";
            return `<div class="col-md-6 col-lg-4"><article class="category-card project-card">
                ${image}<div class="category-card-content"><h4>${title}</h4><p>${description}</p>${link}</div>
            </article></div>`;
        }).join("");
    }
    categoryProjectsPanel.hidden = false;
    categoryProjectList.querySelectorAll(".category-card-image").forEach((image) => {
        image.addEventListener("error", () => {
            image.src = "profile.jpg";
        }, { once: true });
    });
    categoryProjectsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

categoryList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category-type]");
    if (!button) return;
    const category = availableProjectCategories.find((item) => item.type === button.dataset.categoryType);
    if (category) showCategoryProjects(category);
});

document.getElementById("category-projects-close").addEventListener("click", () => {
    categoryProjectsPanel.hidden = true;
});

async function loadProjects() {
    renderProjectCategories(availableProjectCategories);
    try {
        const projectSection = document.querySelector(".projects-section[data-project-source]");
        if (!projectSection || !projectSection.dataset.projectSource) {
            throw new Error("Project data source is not configured.");
        }
        const data = await fetchJson(projectSection.dataset.projectSource);
        availableProjectCategories = normalizeProjectCategories(data);
        renderProjectCategories(availableProjectCategories);
    } catch (error) {
        console.warn("Using default project category cards because the project data is unavailable.", error);
        availableProjectCategories = projectCategories.map((category) => ({ ...category, projects: [] }));
        renderProjectCategories(availableProjectCategories);
    }
}

function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function observeRevealElements() {
    if (!revealObserver) {
        return;
    }

    document.querySelectorAll(
        ".section-heading, .service-card, .process-step, .stat-card, .faq-item, .contact-panel, .about-copy, .about-section .text-link"
    ).forEach((element) => {
        if (observedElements.has(element)) {
            return;
        }
        observedElements.add(element);
        element.classList.add("reveal-on-scroll");
        revealObserver.observe(element);
    });
}

function setupScrollEffects() {
    if (!("IntersectionObserver" in window)) {
        document.querySelectorAll("[data-counter]").forEach(setCounterFinalValue);
        return;
    }

    const revealReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });

    if (revealReducedMotion) {
        document.body.classList.add("motion-reduced");
        document.querySelectorAll("[data-counter]").forEach(setCounterFinalValue);
    } else {
        document.body.classList.add("motion-ready");
        observeRevealElements();
        setupCounterObserver();
    }
}

function setCounterFinalValue(counter) {
    counter.textContent = `${counter.dataset.target}${counter.dataset.suffix || ""}`;
}

function setupCounterObserver() {
    const counters = document.querySelectorAll("[data-counter]");
    if (!counters.length) {
        return;
    }

    const counterObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) {
                return;
            }
            observer.unobserve(entry.target);
            animateCounter(entry.target);
        });
    }, { threshold: 0.55 });

    counters.forEach((counter) => counterObserver.observe(counter));
}

function animateCounter(counter) {
    const target = Number(counter.dataset.target);
    const suffix = counter.dataset.suffix || "";
    const duration = 1400;
    const startTime = performance.now();

    function updateCounter(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        counter.textContent = `${Math.round(target * easedProgress)}${suffix}`;
        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        }
    }

    requestAnimationFrame(updateCounter);
}

function downloadCV() {
    const skillList = portfolioSkills.length
        ? `<ul>${portfolioSkills.map((skill) => `<li>${escapeHtml(skill)}</li>`).join("")}</ul>`
        : "<p>See my online portfolio for current skills and selected work.</p>";
    const cv = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ifikhar Khalil - CV</title>
<style>
body{max-width:760px;margin:48px auto;padding:0 24px;color:#24362b;font:15px/1.7 Arial,sans-serif}
h1{margin-bottom:4px;color:#1a2e22;font-size:34px}h2{margin-top:30px;padding-bottom:7px;border-bottom:1px solid #d8d6ca;color:#315b43;font-size:18px}
.role{margin-top:0;color:#8a6847;font-weight:bold}.contact{color:#667168}.print{padding:10px 15px;border:0;border-radius:6px;background:#1a2e22;color:white;font-weight:bold;cursor:pointer}
@media print{body{margin:0 auto}.print{display:none}}
</style>
</head>
<body>
<button class="print" onclick="window.print()">Print / Save as PDF</button>
<h1>Ifikhar Khalil</h1>
<p class="role">Web Developer Expert</p>
<p class="contact">Abbottabad, Pakistan · <a href="mailto:iftikharjani1574@gmail.com">iftikharjani1574@gmail.com</a> · <a href="index.html">iftiofficial.com</a></p>
<h2>Profile</h2>
<p>Web developer building modern, responsive websites with thoughtful design, reliable code, and a focus on useful details and delightful experiences.</p>
<h2>Services</h2>
<p>Web design · Responsive websites · Landing pages · Portfolio websites</p>
<h2>Skills</h2>
${skillList}
<p>For project details and current work, visit <a href="index.html">iftiofficial.com</a>.</p>
</body>
</html>`;
    const downloadUrl = URL.createObjectURL(new Blob([cv], { type: "text/html;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "Ifikhar-Khalil-CV.html";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
}

downloadCVButton.addEventListener("click", downloadCV);

if (new URLSearchParams(window.location.search).get("contact") === "success") {
    contactForm.reset();
    formStatus.textContent = "Message sent successfully, I will contact you soon";
}

loadSkills();
loadProjects();
setupScrollEffects();
