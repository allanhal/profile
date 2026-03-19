// ===== Matrix Rain Background =====
function initMatrix(canvas) {
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const chars = "アイウエオカキクケコサシスセソタチツテト0123456789ABCDEF{}[]()<>/\\|";
  const fontSize = 14;
  const columns = Math.floor(canvas.width / fontSize);
  const drops = Array(columns).fill(1);

  function draw() {
    ctx.fillStyle = "rgba(10, 10, 10, 0.06)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#00ff4118";
    ctx.font = fontSize + "px monospace";

    for (let i = 0; i < drops.length; i++) {
      const char = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(char, i * fontSize, drops[i] * fontSize);
      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }
  }

  setInterval(draw, 50);

  window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

// ===== Boot Sequence =====
function runBootSequence(data) {
  const el = document.getElementById("boot-sequence");
  const lines = [
    "[sys]  initializing terminal...",
    `[load] profile: ${data.name}`,
    `[load] projects: ${data.projects.length} modules found`,
    "[net]  connecting to github.com... <span class='ok'>OK</span>",
    "[boot] rendering portfolio...",
    "[  <span class='ok'>OK</span>  ] ready.",
  ];

  let i = 0;
  function nextLine() {
    if (i < lines.length) {
      const line = document.createElement("div");
      line.className = "boot-line";
      line.innerHTML = lines[i];
      line.style.animationDelay = "0s";
      el.appendChild(line);
      i++;
      setTimeout(nextLine, 120 + Math.random() * 80);
    } else {
      setTimeout(showContent, 300);
    }
  }
  nextLine();
}

// ===== Render Profile =====
function renderProfile(data) {
  const el = document.getElementById("profile");

  const linksHtml = data.social
    .map((s) => `<a href="${s.url}" target="_blank" class="profile-link">[${s.label}]</a>`)
    .join("");

  el.innerHTML = `
    <div class="profile-photo-wrap">
      <img class="profile-photo" id="profile-photo" src="${data.photo}" alt="${data.name}" onclick="togglePhoto()" />
    </div>
    <div class="profile-info">
      <h1 class="profile-name">${data.name}</h1>
      <p class="profile-role">${data.role}</p>
      <p class="profile-exp">${data.experience}</p>
      <div class="profile-links">${linksHtml}</div>
    </div>
  `;
}

// ===== Render Projects =====
function renderProjects(data) {
  const grid = document.getElementById("projects-grid");

  data.projects.forEach((proj, idx) => {
    const row = document.createElement("div");
    row.className = "project-row fade-in";
    row.style.animationDelay = `${idx * 0.06}s`;

    const tags = proj.tech.map((t) => `<span class="tag">${t}</span>`).join("");

    const repoLink = proj.repo
      ? `<a href="${proj.repo}" target="_blank" class="row-link" onclick="event.stopPropagation()">source</a>`
      : "";
    const liveLink = proj.live
      ? `<a href="${proj.live}" target="_blank" class="row-link" onclick="event.stopPropagation()">live</a>`
      : "";

    row.innerHTML = `
      <div class="project-index">${String(idx).padStart(2, "0")}</div>
      <div class="project-main">
        <div class="project-row-header">
          <span class="project-row-title">${proj.title}</span>
        </div>
        <div class="project-row-desc">${proj.description}</div>
        <div class="project-row-meta">${tags}</div>
        <div class="project-row-links">${repoLink}${liveLink}</div>
        <div class="project-expanded" id="preview-${idx}">
          <img class="project-preview-img" src="${proj.preview}" alt="${proj.title} preview" loading="lazy" />
        </div>
      </div>
    `;

    row.addEventListener("click", () => togglePreview(idx));
    grid.appendChild(row);
  });

  // Footer
  const footer = document.createElement("div");
  footer.className = "terminal-footer";
  footer.textContent = `${data.projects.length} projects loaded // ${new Date().getFullYear()} ${data.name}`;
  document.getElementById("content").appendChild(footer);
}

// ===== Toggle Preview =====
function togglePreview(idx) {
  const el = document.getElementById(`preview-${idx}`);
  const allPreviews = document.querySelectorAll(".project-expanded");
  allPreviews.forEach((p, i) => {
    if (i !== idx) p.classList.remove("active");
  });
  el.classList.toggle("active");
}

// ===== Toggle Photo =====
let photoState = false;
function togglePhoto() {
  if (!window._profileData) return;
  const img = document.getElementById("profile-photo");
  photoState = !photoState;
  img.src = photoState ? window._profileData.photoAlt : window._profileData.photo;
}

// ===== Show Content =====
function showContent() {
  document.getElementById("boot-sequence").style.display = "none";
  document.getElementById("content").style.display = "block";
}

// ===== Init =====
async function init() {
  initMatrix(document.getElementById("matrix-bg"));

  const res = await fetch("data.json");
  const data = await res.json();
  window._profileData = data;

  runBootSequence(data);
  renderProfile(data);
  renderProjects(data);
}

init();
