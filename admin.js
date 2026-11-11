"use strict";

const loginPanel = document.getElementById("login-panel");
const loginForm = document.getElementById("login-form");
const loginStatus = document.getElementById("login-status");
const dashboard = document.getElementById("dashboard");
const projectForm = document.getElementById("project-form");
const projectStatus = document.getElementById("project-status");
const listStatus = document.getElementById("list-status");
const projectsList = document.getElementById("projects-list");
const projectCount = document.getElementById("project-count");
const logoutButton = document.getElementById("logout-button");
const apiUrl = "api/add-project.php";

async function requestJson(url, options) {
    const response = await fetch(url, options);
    let data;
    try {
        data = await response.json();
    } catch {
        throw new Error("The server returned an invalid response. Please try again.");
    }

    if (!response.ok) {
        const error = new Error(data.message || "The request could not be completed.");
        error.status = response.status;
        throw error;
    }

    return data;
}

function showStatus(element, message, isError) {
    element.textContent = message;
    element.classList.toggle("is-error", isError);
}

function showDashboard() {
    loginPanel.hidden = true;
    dashboard.hidden = false;
    loadProjects();
}

function showLogin() {
    dashboard.hidden = true;
    loginPanel.hidden = false;
}

async function checkSession() {
    try {
        const session = await requestJson(`${apiUrl}?action=session`);
        if (session.authenticated) {
            showDashboard();
        }
    } catch (error) {
        showStatus(loginStatus, error.message, true);
    }
}

async function loadProjects() {
    projectsList.replaceChildren();
    projectCount.textContent = "";
    showStatus(listStatus, "Loading projects...", false);

    try {
        const projects = await requestJson("api/get-projects.php");
        if (!Array.isArray(projects)) {
            throw new Error("The projects list is not in the expected format.");
        }

        projectCount.textContent = `${projects.length} ${projects.length === 1 ? "project" : "projects"}`;
        if (projects.length === 0) {
            const emptyMessage = document.createElement("p");
            emptyMessage.className = "empty-message";
            emptyMessage.textContent = "No projects yet. Add your first project above.";
            projectsList.append(emptyMessage);
            showStatus(listStatus, "", false);
            return;
        }

        projects.forEach((project) => projectsList.append(createProjectItem(project)));
        showStatus(listStatus, "", false);
    } catch (error) {
        showStatus(listStatus, error.message, true);
    }
}

function createProjectItem(project) {
    const item = document.createElement("article");
    item.className = "project-item";

    const image = document.createElement("img");
    image.alt = "";
    image.loading = "lazy";
    image.src = safeImageUrl(project.image);
    image.addEventListener("error", () => image.removeAttribute("src"), { once: true });

    const details = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = String(project.title || "");
    const description = document.createElement("p");
    description.textContent = String(project.description || "");
    const typeLabel = document.createElement("span");
    typeLabel.className = "project-type-label";
    typeLabel.textContent = getProjectTypeLabel(project.project_type);
    details.append(title, typeLabel, description);

    const deleteButton = document.createElement("button");
    deleteButton.className = "button button-danger";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => deleteProject(project.id, deleteButton));

    item.append(image, details, deleteButton);
    return item;
}

function getProjectTypeLabel(type) {
    return {
        hotel: "Hotel Websites",
        business: "Companies / Business Websites",
        educational: "Educational Websites"
    }[type] || "Business Websites";
}

function safeImageUrl(value) {
    const image = String(value || "");
    if (/^https?:\/\//i.test(image)) {
        return image;
    }
    if (/^uploads\/projects\/[a-f0-9]+\.(jpg|png|gif|webp)$/i.test(image)) {
        return image;
    }
    return "";
}

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!loginForm.reportValidity()) {
        return;
    }

    const button = loginForm.querySelector('button[type="submit"]');
    button.disabled = true;
    showStatus(loginStatus, "Signing in...", false);

    try {
        const formData = new FormData(loginForm);
        await requestJson(`${apiUrl}?action=login`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({
                username: formData.get("username"),
                password: formData.get("password")
            })
        });
        loginForm.reset();
        showStatus(loginStatus, "", false);
        showDashboard();
    } catch (error) {
        showStatus(loginStatus, error.message, true);
    } finally {
        button.disabled = false;
    }
});

projectForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!projectForm.reportValidity()) {
        return;
    }

    const imageUrl = document.getElementById("image-url").value.trim();
    const imageFile = document.getElementById("image-file").files[0];
    if (!imageUrl && !imageFile) {
        showStatus(projectStatus, "Enter an image URL or choose an image file.", true);
        return;
    }

    const button = projectForm.querySelector('button[type="submit"]');
    button.disabled = true;
    showStatus(projectStatus, "Saving project...", false);

    try {
        await requestJson(apiUrl, {
            method: "POST",
            headers: { "Accept": "application/json" },
            body: new FormData(projectForm)
        });
        projectForm.reset();
        showStatus(projectStatus, "Project saved successfully.", false);
        await loadProjects();
    } catch (error) {
        if (error.status === 401) {
            showDashboard();
            showStatus(loginStatus, "Your session expired. Please sign in again.", true);
            showLogin();
        } else {
            showStatus(projectStatus, error.message, true);
        }
    } finally {
        button.disabled = false;
    }
});

async function deleteProject(id, button) {
    if (!window.confirm("Delete this project? This cannot be undone.")) {
        return;
    }

    button.disabled = true;
    showStatus(listStatus, "Deleting project...", false);
    try {
        await requestJson("api/delete-project.php", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({ id })
        });
        showStatus(listStatus, "Project deleted.", false);
        await loadProjects();
    } catch (error) {
        if (error.status === 401) {
            showLogin();
            showStatus(loginStatus, "Your session expired. Please sign in again.", true);
        } else {
            button.disabled = false;
            showStatus(listStatus, error.message, true);
        }
    }
}

logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    try {
        await requestJson(`${apiUrl}?action=logout`, { method: "POST" });
        showDashboard();
        showLogin();
        showStatus(loginStatus, "You have signed out.", false);
    } catch (error) {
        showStatus(listStatus, error.message, true);
    } finally {
        logoutButton.disabled = false;
    }
});

checkSession();
