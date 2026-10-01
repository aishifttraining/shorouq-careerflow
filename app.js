(function () {
  "use strict";

  var STORAGE = {
    applications: "careerflow-applications-v1",
    readiness: "careerflow-readiness-v1",
    cvText: "careerflow-cv-text-v1",
    analysis: "careerflow-analysis-v1",
    analyzedApplications: "careerflow-analyzed-applications-v1",
    theme: "careerflow-theme-v1"
  };

  var STATUS_VALUES = ["Applied", "Screening", "Interview", "Offer", "Rejected"];
  var CATEGORY_ORDER = ["Education", "Technical Skills", "Soft Skills", "Experience", "Languages", "Certifications", "Other Qualifications"];
  var state = {
    applications: loadJson(STORAGE.applications, []),
    readiness: loadJson(STORAGE.readiness, {}),
    analyzedApplications: loadJson(STORAGE.analyzedApplications, {}),
    activeFilter: "All",
    analysis: loadJson(STORAGE.analysis, null),
    activeApplicationId: null,
    applicationContextTemplate: ""
  };
  var toastTimer;

  var els = {
    appDialog: document.getElementById("application-dialog"),
    appForm: document.getElementById("application-form"),
    appId: document.getElementById("application-id"),
    company: document.getElementById("application-company"),
    title: document.getElementById("application-title"),
    status: document.getElementById("application-status"),
    date: document.getElementById("application-date"),
    formErrors: document.getElementById("application-form-errors"),
    applicationsList: document.getElementById("applications-list"),
    applicationCount: document.getElementById("application-count"),
    statusFilter: document.getElementById("status-filter"),
    dashboardFollowups: document.getElementById("dashboard-followups"),
    recentApplications: document.getElementById("recent-applications"),
    followupBadge: document.getElementById("followup-count-badge"),
    jobDescription: document.getElementById("job-description"),
    cvText: document.getElementById("cv-text"),
    analysisContext: document.getElementById("analysis-context"),
    analysisErrors: document.getElementById("analysis-errors"),
    analyzeButton: document.getElementById("analyze-button"),
    analysisResults: document.getElementById("analysis-results"),
    requirementsCategories: document.getElementById("requirements-categories"),
    matchesFound: document.getElementById("matches-found"),
    matchesNotFound: document.getElementById("matches-not-found"),
    matchesVerify: document.getElementById("matches-verify"),
    readinessActions: document.getElementById("readiness-actions"),
    interviewQuestions: document.getElementById("interview-questions"),
    careerMap: document.getElementById("career-map-list"),
    themeToggle: document.getElementById("theme-toggle"),
    toast: document.getElementById("toast")
  };

  function loadJson(key, fallback) {
    try {
      var value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function saveJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      showToast("Your browser could not save this change locally.", true);
    }
  }

  function getSavedTheme() {
    try {
      var theme = localStorage.getItem(STORAGE.theme);
      return theme === "light" || theme === "dark" ? theme : null;
    } catch (error) {
      return null;
    }
  }

  function getSystemTheme() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function updateThemeToggle(theme) {
    els.themeToggle.textContent = theme === "dark" ? "Light mode" : "Dark mode";
    els.themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
    els.themeToggle.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    updateThemeToggle(theme);
  }

  function initializeTheme() {
    applyTheme(getSavedTheme() || getSystemTheme());
  }

  function toggleTheme() {
    var theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE.theme, theme);
    } catch (error) {
      showToast("Your browser could not save this theme preference locally.", true);
    }
  }

  function getToday() {
    var today = new Date();
    today.setHours(12, 0, 0, 0);
    return today;
  }

  function toDateInputValue(date) {
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  function dateFromInput(value) {
    if (!value) return null;
    var parts = value.split("-");
    if (parts.length !== 3) return null;
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0, 0);
  }

  function getDaysSince(value) {
    var date = dateFromInput(value);
    if (!date) return 0;
    return Math.floor((getToday().getTime() - date.getTime()) / 86400000);
  }

  function isFollowupDue(application) {
    return (application.status === "Applied" || application.status === "Interview") && getDaysSince(application.date) >= 14;
  }

  function formatDate(value) {
    var date = dateFromInput(value);
    if (!date) return "Date unavailable";
    return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function toSafeId(value) {
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "-");
  }

  function statusClass(status) {
    return "status-" + status.toLowerCase();
  }

  function createId(prefix) {
    return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function showToast(message, isError) {
    clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.className = "toast" + (isError ? " error" : "");
    els.toast.hidden = false;
    toastTimer = setTimeout(function () {
      els.toast.hidden = true;
    }, 4600);
  }

  function setMetric(id, value) {
    document.getElementById(id).textContent = value;
  }

  function getReadinessSummary() {
    var plan = state.analysis && state.analysis.plan ? state.analysis.plan : [];
    var total = plan.length;
    var complete = plan.filter(function (action) { return state.readiness[action.id]; }).length;
    return { total: total, complete: complete, remaining: total - complete, percentage: total ? Math.round((complete / total) * 100) : 0 };
  }

  function getReadinessPercentage() {
    return getReadinessSummary().percentage;
  }

  function updateReadinessDisplays() {
    var readiness = getReadinessSummary();
    var percentage = readiness.percentage;
    var valueText = readiness.total ? readiness.complete + " of " + readiness.total + " actions complete; " + readiness.remaining + " remaining." : "No readiness actions yet.";
    setMetric("metric-readiness", percentage + "%");
    document.getElementById("readiness-panel-percent").textContent = percentage + "%";
    document.getElementById("readiness-progress").style.width = percentage + "%";
    var dashboardProgress = document.querySelector(".readiness-panel .progress-track");
    dashboardProgress.setAttribute("aria-valuenow", percentage);
    dashboardProgress.setAttribute("aria-valuetext", valueText);
    document.getElementById("readiness-panel-count").textContent = readiness.total ? readiness.complete + " of " + readiness.total + " complete · " + readiness.remaining + " remaining" : "No readiness actions yet";

    var copy = document.getElementById("readiness-panel-copy");
    if (!readiness.total) {
      copy.textContent = "Analyze a job to create a personal, checkable readiness plan.";
    } else if (percentage === 100) {
      copy.textContent = "All current plan actions are marked complete. Review your evidence before applying.";
    } else {
      copy.textContent = "Readiness plan progress based on the actions you have checked.";
    }

    var planPercent = document.getElementById("plan-percent");
    var planProgress = document.getElementById("plan-progress");
    if (planPercent && planProgress) {
      planPercent.textContent = percentage + "%";
      document.getElementById("plan-count").textContent = readiness.total ? readiness.complete + " of " + readiness.total + " complete" : "No actions yet";
      document.getElementById("plan-remaining").textContent = readiness.total ? readiness.remaining + " action" + (readiness.remaining === 1 ? "" : "s") + " remaining" : "No readiness actions yet.";
      planProgress.style.width = percentage + "%";
      planProgress.parentElement.setAttribute("aria-valuenow", percentage);
      planProgress.parentElement.setAttribute("aria-valuetext", valueText);
    }
  }

  function renderDashboard() {
    var applications = state.applications.slice();
    var total = applications.length;
    var inProgress = applications.filter(function (app) { return app.status === "Applied" || app.status === "Screening"; }).length;
    var interviews = applications.filter(function (app) { return app.status === "Interview"; }).length;
    var offers = applications.filter(function (app) { return app.status === "Offer"; }).length;
    var followups = applications.filter(isFollowupDue);

    setMetric("metric-total", total);
    document.getElementById("metric-total-copy").textContent = total ? "Everything in one view" : "Start by adding an opportunity";
    setMetric("metric-progress", inProgress);
    setMetric("metric-interviews", interviews);
    setMetric("metric-offers", offers);
    setMetric("metric-followup", followups.length);
    els.followupBadge.textContent = followups.length;

    var sorted = applications.slice().sort(function (a, b) {
      return String(b.date).localeCompare(String(a.date));
    }).slice(0, 4);

    if (!sorted.length) {
      els.recentApplications.innerHTML = '<p class="empty-mini">No applications yet. Add one to start your tracker.</p>';
    } else {
      els.recentApplications.innerHTML = sorted.map(function (app) {
        return '<div class="compact-item"><div class="compact-item-title"><strong>' + escapeHtml(app.title) + '</strong><span>' + escapeHtml(app.company) + '</span></div><div class="compact-meta"><span class="status-badge ' + statusClass(app.status) + '">' + escapeHtml(app.status) + '</span><time datetime="' + escapeHtml(app.date) + '">' + formatDate(app.date) + '</time></div></div>';
      }).join("");
    }

    if (!followups.length) {
      els.dashboardFollowups.innerHTML = '<p class="empty-mini">No follow-ups are due. Alerts appear only for Applied or Interview applications dated 14 or more days ago.</p>';
    } else {
      els.dashboardFollowups.innerHTML = followups.map(function (app) {
        var days = getDaysSince(app.date);
        return '<div class="followup-entry"><div class="followup-entry-head"><div><strong>' + escapeHtml(app.title) + '</strong><span>' + escapeHtml(app.company) + '</span></div><span class="followup-badge">Follow-up Needed</span></div><p>' + escapeHtml(app.status) + ' status · application date ' + days + ' days ago. Prepare a thoughtful, professional check-in.</p><div class="application-actions"><button class="button button-secondary small-button" type="button" data-action="open-followup" data-id="' + escapeHtml(app.id) + '">Open assistant</button></div></div>';
      }).join("");
    }

    renderNextStep(followups);
    renderDemoStatus();
    updateReadinessDisplays();
  }

  function sortApplications(applications) {
    return applications.slice().sort(function (a, b) {
      var dateOrder = String(a.date).localeCompare(String(b.date));
      return dateOrder || String(a.id).localeCompare(String(b.id));
    });
  }

  function getNextStep(followups) {
    var dueFollowups = sortApplications(followups || state.applications.filter(isFollowupDue));
    if (dueFollowups.length) {
      var followup = dueFollowups[0];
      return { type: "followup", id: followup.id, kicker: "TIME-SENSITIVE", title: "Follow up on an application", text: "You have an application that needs follow-up: " + followup.title + " at " + followup.company + ".", button: "View follow-ups" };
    }
    var interviews = sortApplications(state.applications.filter(function (app) { return app.status === "Interview"; }));
    if (interviews.length) {
      var interview = interviews[0];
      return { type: "interview", id: interview.id, kicker: "PREPARE", title: "Prepare for your interview", text: "You have an interview-stage application to prepare for: " + interview.title + " at " + interview.company + ".", button: "Prepare now" };
    }
    var unanalyzed = sortApplications(state.applications.filter(function (app) { return !isApplicationAnalyzed(app); }));
    if (unanalyzed.length) {
      var application = unanalyzed[0];
      return { type: "analyze", id: application.id, kicker: "UNDERSTAND", title: "Analyze your next application", text: "You have applications that have not been analyzed yet. Start with " + application.title + " at " + application.company + ".", button: "Analyze application" };
    }
    var plan = state.analysis && state.analysis.plan ? state.analysis.plan : [];
    var unfinished = plan.find(function (action) { return !state.readiness[action.id]; });
    if (unfinished) {
      return { type: "readiness", planId: unfinished.id, kicker: "PREPARE", title: "Complete your readiness plan", text: "You have readiness actions waiting for you, including: " + unfinished.title + ".", button: "View readiness plan" };
    }
    return { type: "map", kicker: "DISCOVER", title: "Keep building your career readiness", text: "Explore Career Map or analyze another job to create your next practical preparation plan.", button: "Explore Career Map" };
  }

  function renderNextStep(followups) {
    var step = getNextStep(followups);
    var action = step.type === "followup" ? "next-followup" : step.type === "interview" ? "next-interview" : step.type === "analyze" ? "next-analyze" : step.type === "readiness" ? "next-readiness" : "next-map";
    document.getElementById("next-step-card").innerHTML = '<div class="next-step-icon" aria-hidden="true">' + (step.type === "followup" ? "!" : step.type === "interview" ? "↗" : step.type === "analyze" ? "⌁" : step.type === "readiness" ? "✓" : "→") + '</div><div class="next-step-copy"><p class="small-label">' + escapeHtml(step.kicker) + '</p><h3>Your Next Step</h3><strong>' + escapeHtml(step.title) + '</strong><p>' + escapeHtml(step.text) + '</p></div><button class="button button-primary" type="button" data-action="' + action + '" data-id="' + escapeHtml(step.id || "") + '" data-plan-id="' + escapeHtml(step.planId || "") + '">' + escapeHtml(step.button) + ' <span aria-hidden="true">→</span></button>';
  }

  function renderDemoStatus() {
    var status = document.getElementById("demo-status");
    var demoCount = state.applications.filter(function (app) { return app.isDemo; }).length;
    if (!demoCount) {
      status.hidden = true;
      status.textContent = "";
      return;
    }
    status.hidden = false;
    status.innerHTML = '<strong>Demo Data is active.</strong> ' + demoCount + ' made-up application' + (demoCount === 1 ? " is" : "s are") + ' saved only in this browser. Explore the Applied and Interview follow-up examples, Career Map, and local analysis workflow.';
  }

  function renderApplications() {
    var filtered = state.applications.filter(function (app) {
      return state.activeFilter === "All" || app.status === state.activeFilter;
    }).sort(function (a, b) {
      return String(b.date).localeCompare(String(a.date));
    });

    els.applicationCount.textContent = filtered.length + " " + (filtered.length === 1 ? "application" : "applications") + " shown";

    if (!filtered.length) {
      var hasAny = state.applications.length > 0;
      els.applicationsList.innerHTML = '<div class="empty-state"><h3>' + (hasAny ? "No applications match this status" : "Your tracker is ready when you are") + '</h3><p>' + (hasAny ? "Choose another status or add an application to keep your search organized." : "Add your first application, or load clearly labelled Demo Data to explore the complete CareerFlow journey.") + '</p><button class="button button-primary" type="button" data-action="' + (hasAny ? "open-add" : "load-example") + '">' + (hasAny ? "Add application" : "Load example data") + '</button></div>';
      return;
    }

    els.applicationsList.innerHTML = filtered.map(function (app) {
      var followup = isFollowupDue(app);
      var demo = app.isDemo ? '<span class="demo-chip">Demo Data</span>' : "";
      var analyzedAt = getApplicationAnalysisTimestamp(app);
      var analyzed = isApplicationAnalyzed(app);
      var analysisState = analyzed ? '<span class="analysis-state analyzed">Analyzed ' + escapeHtml(formatDate(analyzedAt.slice(0, 10))) + '</span>' : '<span class="analysis-state not-analyzed">Not analyzed yet</span>';
      var reminder = followup ? '<div class="followup-card-reminder"><span aria-hidden="true">!</span> Follow-up Needed — ' + escapeHtml(app.status) + ' status · application date ' + getDaysSince(app.date) + ' days ago</div>' : "";
      return '<article class="application-card' + (followup ? " has-followup" : "") + '">'
        + '<div class="application-card-top"><div><h3>' + escapeHtml(app.title) + '</h3><p class="company-line">' + escapeHtml(app.company) + '</p></div><span class="status-badge ' + statusClass(app.status) + '">' + escapeHtml(app.status) + '</span></div>'
        + '<div class="application-tags">' + demo + analysisState + '</div>'
        + reminder
        + '<div class="application-meta"><span>Application date</span><time datetime="' + escapeHtml(app.date) + '">' + formatDate(app.date) + '</time></div>'
        + '<div class="application-actions">'
        + '<button class="button button-primary small-button" type="button" data-action="analyze-app" data-id="' + escapeHtml(app.id) + '">' + (analyzed ? "Re-analyze Job" : "Analyze Job") + '</button>'
        + (followup ? '<button class="button button-secondary small-button" type="button" data-action="open-followup" data-id="' + escapeHtml(app.id) + '">Follow-up</button>' : '')
        + '<button class="text-button" type="button" data-action="edit-app" data-id="' + escapeHtml(app.id) + '">Edit</button>'
        + '<button class="text-button danger-button" type="button" data-action="delete-app" data-id="' + escapeHtml(app.id) + '">Delete</button>'
        + '</div></article>';
    }).join("");
  }

  function renderCareerMap() {
    var roles = (window.CAREERFLOW_DEMO_DATA && window.CAREERFLOW_DEMO_DATA.careerRoles) || [];
    els.careerMap.innerHTML = roles.map(function (role) {
      return '<article class="career-card"><div class="career-card-top"><h3>' + escapeHtml(role.title) + '</h3><span class="demo-chip">Demo Data</span></div><p class="career-card-description">' + escapeHtml(role.description) + '</p><p class="role-meta">' + escapeHtml(role.updated) + '</p><ul class="requirements-list">' + role.requirements.map(function (requirement) { return '<li><span>' + escapeHtml(requirement) + '</span><span class="source-badge">Demo Data</span></li>'; }).join("") + '</ul><button class="button button-secondary button-block" type="button" data-action="compare-role" data-role="' + escapeHtml(role.id) + '">Compare with My CV <span aria-hidden="true">→</span></button></article>';
    }).join("");
  }

  function renderFollowupAssistant(application) {
    if (!application || !isFollowupDue(application)) return;
    var existing = document.getElementById("followup-assistant-" + toSafeId(application.id));
    if (existing) {
      existing.remove();
      return;
    }

    document.querySelectorAll(".followup-assistant").forEach(function (element) { element.remove(); });
    var parentCard = Array.prototype.slice.call(document.querySelectorAll('[data-id="' + cssEscape(application.id) + '"]')).map(function (element) {
      return element.closest(".application-card");
    }).find(Boolean);
    var target = parentCard || document.querySelector("#applications .shell");
    var message = createFollowupMessage(application);
    var assistant = document.createElement("section");
    assistant.className = "followup-assistant";
    assistant.id = "followup-assistant-" + toSafeId(application.id);
    assistant.innerHTML = '<div class="followup-assistant-head"><div><p class="small-label">FOLLOW-UP ASSISTANT</p><h3>Professional check-in for ' + escapeHtml(application.company) + '</h3><p>Connected to <strong>' + escapeHtml(application.title) + '</strong>. Edit the message before sending it through your own email or application channel.</p></div><button class="icon-button" type="button" data-action="close-followup" aria-label="Close follow-up assistant">×</button></div><label for="followup-message-' + toSafeId(application.id) + '">Your editable follow-up message</label><textarea id="followup-message-' + toSafeId(application.id) + '" rows="8">' + escapeHtml(message) + '</textarea><div class="followup-actions"><button class="button button-primary" type="button" data-action="copy-followup" data-id="' + escapeHtml(application.id) + '">Copy message</button><span class="copy-status" aria-live="polite"></span></div>';
    target.after(assistant);
    assistant.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
    setTimeout(function () { document.getElementById("followup-message-" + toSafeId(application.id)).focus(); }, 250);
  }

  function createFollowupMessage(application) {
    return "Hello,\n\nI hope you are well. I am writing to follow up on my application for the " + application.title + " position at " + application.company + ". I remain interested in the opportunity and would appreciate any update you are able to share about the next steps.\n\nThank you for your time and consideration.\n\nKind regards,";
  }

  function cssEscape(value) {
    if (window.CSS && window.CSS.escape) return window.CSS.escape(value);
    return String(value).replace(/"/g, "\\\"");
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function openApplicationDialog(application) {
    clearApplicationErrors();
    var editing = Boolean(application);
    els.appForm.reset();
    els.appId.value = editing ? application.id : "";
    els.company.value = editing ? application.company : "";
    els.title.value = editing ? application.title : "";
    els.status.value = editing ? application.status : "Applied";
    els.date.value = editing ? application.date : toDateInputValue(getToday());
    document.getElementById("application-dialog-title").textContent = editing ? "Edit application" : "Add an application";
    document.getElementById("application-save").textContent = editing ? "Save changes" : "Save application";
    if (typeof els.appDialog.showModal === "function") els.appDialog.showModal();
    else els.appDialog.setAttribute("open", "");
    setTimeout(function () { els.company.focus(); }, 80);
  }

  function closeApplicationDialog() {
    if (typeof els.appDialog.close === "function") els.appDialog.close();
    else els.appDialog.removeAttribute("open");
  }

  function clearApplicationErrors() {
    els.formErrors.hidden = true;
    els.formErrors.textContent = "";
    ["company-error", "title-error", "date-error"].forEach(function (id) {
      var element = document.getElementById(id);
      element.hidden = true;
      element.textContent = "";
    });
  }

  function showApplicationError(field, message) {
    var id = field === "company" ? "company-error" : field === "title" ? "title-error" : "date-error";
    var element = document.getElementById(id);
    element.textContent = message;
    element.hidden = false;
  }

  function saveApplication(event) {
    event.preventDefault();
    clearApplicationErrors();
    var company = els.company.value.trim();
    var title = els.title.value.trim();
    var date = els.date.value;
    var errors = [];
    if (!company) { errors.push("Enter a company name."); showApplicationError("company", "Company is required."); }
    if (!title) { errors.push("Enter a job title."); showApplicationError("title", "Job title is required."); }
    if (!date || !dateFromInput(date)) { errors.push("Choose a valid application date."); showApplicationError("date", "Application date is required."); }
    if (date && dateFromInput(date) && dateFromInput(date).getTime() > getToday().getTime()) { errors.push("Choose an application date that is today or earlier."); showApplicationError("date", "The application date cannot be in the future."); }

    if (errors.length) {
      els.formErrors.textContent = errors.join(" ");
      els.formErrors.hidden = false;
      els.formErrors.focus();
      return;
    }

    var id = els.appId.value;
    var existingIndex = state.applications.findIndex(function (app) { return app.id === id; });
    var entry = {
      id: id || createId("application"),
      company: company,
      title: title,
      status: STATUS_VALUES.indexOf(els.status.value) > -1 ? els.status.value : "Applied",
      date: date,
      isDemo: existingIndex > -1 ? Boolean(state.applications[existingIndex].isDemo) : false
    };

    if (existingIndex > -1) state.applications[existingIndex] = entry;
    else state.applications.push(entry);
    saveJson(STORAGE.applications, state.applications);
    renderAll();
    closeApplicationDialog();
    showToast(existingIndex > -1 ? "Application updated. Your dashboard is current." : "Application added. Your dashboard is current.");
  }

  function deleteApplication(id) {
    var application = state.applications.find(function (app) { return app.id === id; });
    if (!application) return;
    if (!window.confirm("Delete the application for " + application.title + " at " + application.company + "? This cannot be undone.")) return;
    state.applications = state.applications.filter(function (app) { return app.id !== id; });
    delete state.analyzedApplications[id];
    saveJson(STORAGE.applications, state.applications);
    saveJson(STORAGE.analyzedApplications, state.analyzedApplications);
    renderAll();
    showToast("Application deleted.");
  }

  function analyzeApplication(id) {
    var app = state.applications.find(function (item) { return item.id === id; });
    if (!app) return;
    state.activeApplicationId = app.id;
    state.applicationContextTemplate = "Job analysis context: " + app.title + " at " + app.company + ".\n\nPaste or review the full job description below to identify the specific requirements.\n\n";
    els.jobDescription.value = state.applicationContextTemplate;
    setAnalysisContext("Application context selected: <strong>" + escapeHtml(app.title) + "</strong> at <strong>" + escapeHtml(app.company) + "</strong>. No full job description is saved for this application, so paste one below before using local analysis.");
    document.getElementById("ai").scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    setTimeout(function () { els.jobDescription.focus(); }, 400);
    showToast("Application context selected. Paste the full job description to continue with local analysis.");
  }

  function clearApplicationAnalysisContext() {
    state.activeApplicationId = null;
    state.applicationContextTemplate = "";
  }

  function getJobTextForAnalysis() {
    var jobText = els.jobDescription.value.trim();
    if (state.activeApplicationId && jobText === state.applicationContextTemplate.trim()) return "";
    return jobText;
  }

  function makeApplicationAnalysisKey(applicationId, jobText, cvText) {
    return String(applicationId) + "|" + String(jobText).toLowerCase().replace(/\s+/g, " ").trim() + "|" + String(cvText).toLowerCase().replace(/\s+/g, " ").trim();
  }

  function resetApplicationAnalysisIfSourceChanged() {
    if (!state.activeApplicationId) return;
    if (els.jobDescription.value.trim() !== state.applicationContextTemplate.trim()) state.applicationContextTemplate = "";
  }

  function resetApplicationAnalysisIfCvChanged() {
    if (!state.activeApplicationId) return;
    state.applicationContextTemplate = "";
  }

  function updateApplicationAnalysisState(applicationId, jobText, cvText) {
    state.analyzedApplications[applicationId] = {
      at: new Date().toISOString(),
      key: makeApplicationAnalysisKey(applicationId, jobText, cvText)
    };
    saveJson(STORAGE.analyzedApplications, state.analyzedApplications);
  }

  function getApplicationAnalysisTimestamp(application) {
    var record = state.analyzedApplications[application.id];
    if (!record) return "";
    return typeof record === "string" ? record : record.at || "";
  }

  function isApplicationAnalyzed(application) {
    var record = state.analyzedApplications[application.id];
    if (!record) return false;
    if (typeof record === "string") return true;
    if (!record.at || !record.key || !state.analysis) return false;
    return record.key === makeApplicationAnalysisKey(application.id, state.analysis.jobText, state.analysis.cvText);
  }

  function normalizeAnalyzedApplicationRecords() {
    var changed = false;
    Object.keys(state.analyzedApplications).forEach(function (id) {
      var record = state.analyzedApplications[id];
      if (typeof record === "string") {
        state.analyzedApplications[id] = { at: record, key: "" };
        changed = true;
      }
    });
    if (changed) saveJson(STORAGE.analyzedApplications, state.analyzedApplications);
  }

  function setAnalysisContext(html) {
    els.analysisContext.innerHTML = html;
    els.analysisContext.hidden = false;
  }

  function setAnalysisContext(html) {
    els.analysisContext.innerHTML = html;
    els.analysisContext.hidden = false;
  }

  function loadExampleData() {
    var hasExisting = state.applications.length > 0 || Boolean(state.analysis);
    if (hasExisting && !window.confirm("Load Demo Data? This will replace the current CareerFlow applications, saved readiness plan, and saved CV text in this browser.")) return;
    if (!window.CAREERFLOW_DEMO_DATA) {
      showToast("Demo Data could not be found. Refresh the page and try again.", true);
      return;
    }
    state.applications = window.CAREERFLOW_DEMO_DATA.applications.map(function (app) { return Object.assign({}, app); });
    state.readiness = {};
    state.analyzedApplications = {};
    state.analysis = null;
    clearApplicationAnalysisContext();
    els.jobDescription.value = "";
    els.cvText.value = "";
    saveJson(STORAGE.applications, state.applications);
    saveJson(STORAGE.readiness, state.readiness);
    saveJson(STORAGE.analyzedApplications, state.analyzedApplications);
    try { localStorage.removeItem(STORAGE.analysis); localStorage.removeItem(STORAGE.cvText); } catch (error) { /* storage may be unavailable */ }
    renderAll();
    showToast("Demo Data loaded successfully. Explore the 16-day follow-up, Career Map, and local-only analysis workflow.");
  }

  function resetAnalysisErrors() {
    els.analysisErrors.hidden = true;
    els.analysisErrors.textContent = "";
  }

  function runAnalysis() {
    resetAnalysisErrors();
    var jobText = getJobTextForAnalysis();
    var cvText = els.cvText.value.trim();
    var errors = [];
    if (!jobText) errors.push("Paste the full job description before running analysis.");
    if (!cvText) errors.push("Add CV or resume text before running analysis.");
    if (errors.length) {
      els.analysisErrors.textContent = errors.join(" ");
      els.analysisErrors.hidden = false;
      els.analysisErrors.focus();
      return;
    }

    els.analyzeButton.disabled = true;
    els.analyzeButton.setAttribute("aria-busy", "true");
    els.analyzeButton.textContent = "Analyzing locally…";
    var analyzedApplicationId = state.activeApplicationId;
    var analysis = analyzeText(jobText, cvText);
    state.analysis = analysis;
    state.readiness = {};
    if (analyzedApplicationId) updateApplicationAnalysisState(analyzedApplicationId, jobText, cvText);
    saveJson(STORAGE.analysis, analysis);
    saveJson(STORAGE.readiness, state.readiness);
    try { localStorage.setItem(STORAGE.cvText, cvText); } catch (error) { /* handled during later saves */ }
    renderAnalysis();
    renderDashboard();
    renderApplications();
    els.analyzeButton.disabled = false;
    els.analyzeButton.removeAttribute("aria-busy");
    els.analyzeButton.innerHTML = 'Analyze job and CV <span aria-hidden="true">→</span>';
    showToast("Local analysis complete. Review each text-based suggestion before acting on it.");
    clearApplicationAnalysisContext();
    setTimeout(function () { document.getElementById("analysis-results").scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" }); }, 80);
  }

  function containsPattern(text, pattern) {
    return pattern.test(text);
  }

  function analyzeText(jobText, cvText) {
    var lowerJob = jobText.toLowerCase();
    var lowerCv = cvText.toLowerCase();
    var categories = {};
    CATEGORY_ORDER.forEach(function (category) { categories[category] = []; });

    var definitions = [
      { category: "Education", label: "Bachelor's degree or equivalent learning evidence", patterns: [/bachelor'?s degree/, /undergraduate degree/, /university degree/, /degree or equivalent/, /diploma/], verify: true, match: [/(bachelor'?s|undergraduate|university|diploma|degree)/] },
      { category: "Education", label: "Master's degree", patterns: [/master'?s degree/, /postgraduate degree/], verify: true, match: [/(master'?s|postgraduate)/] },
      { category: "Technical Skills", label: "Python", patterns: [/\bpython\b/], match: [/\bpython\b/] },
      { category: "Technical Skills", label: "SQL", patterns: [/\bsql\b/], match: [/\bsql\b/] },
      { category: "Technical Skills", label: "Microsoft Excel or spreadsheets", patterns: [/microsoft excel/, /\bexcel\b/, /spreadsheet/], match: [/microsoft excel/, /\bexcel\b/, /spreadsheet/] },
      { category: "Technical Skills", label: "Data analysis", patterns: [/data analys/, /analytics/], match: [/data analys/, /analytics/] },
      { category: "Technical Skills", label: "Prototyping", patterns: [/prototyp/], match: [/prototyp/] },
      { category: "Technical Skills", label: "User research", patterns: [/user research/, /ux research/], match: [/user research/, /ux research/] },
      { category: "Technical Skills", label: "Design tools", patterns: [/figma/, /adobe creative/, /design tool/], match: [/figma/, /adobe creative/, /design tool/] },
      { category: "Technical Skills", label: "Project coordination", patterns: [/project coordinat/, /project management/], match: [/project coordinat/, /project management/] },
      { category: "Technical Skills", label: "Content writing", patterns: [/content writing/, /copywriting/, /writing samples/], match: [/content writing/, /copywriting/, /writing samples/] },
      { category: "Technical Skills", label: "Social media", patterns: [/social media/], match: [/social media/] },
      { category: "Soft Skills", label: "Communication", patterns: [/communicat/], match: [/communicat/] },
      { category: "Soft Skills", label: "Teamwork", patterns: [/teamwork/, /collaborat/, /cross-functional/], match: [/teamwork/, /collaborat/, /cross-functional/] },
      { category: "Soft Skills", label: "Problem solving", patterns: [/problem solv/], match: [/problem solv/] },
      { category: "Soft Skills", label: "Organization", patterns: [/organiz/, /time management/], match: [/organiz/, /time management/] },
      { category: "Soft Skills", label: "Attention to detail", patterns: [/attention to detail/, /detail-oriented/], match: [/attention to detail/, /detail-oriented/] },
      { category: "Soft Skills", label: "Empathy", patterns: [/empathy/, /empathetic/], match: [/empathy/, /empathetic/] },
      { category: "Experience", label: "Relevant experience", patterns: [/experience/, /worked in/, /background in/], verify: true, match: [/(experience|worked|background)/] },
      { category: "Experience", label: "Years of experience", patterns: [/\d+\+?\s*(?:years?|yrs?)/, /one\s+year/, /two\s+years?/], verify: true, match: [/(years?|yrs?)/] },
      { category: "Languages", label: "English communication", patterns: [/english/, /written and spoken english/], match: [/english/] },
      { category: "Languages", label: "Arabic communication", patterns: [/arabic/, /written and spoken arabic/], match: [/arabic/] },
      { category: "Certifications", label: "Professional certification", patterns: [/certification/, /certified/, /certificate/], verify: true, match: [/(certification|certified|certificate)/] },
      { category: "Other Qualifications", label: "Portfolio or work samples", patterns: [/portfolio/, /work samples?/, /writing samples?/], verify: true, match: [/(portfolio|work samples?|writing samples?)/] },
      { category: "Other Qualifications", label: "Deadline management", patterns: [/deadline/, /prioriti[sz]/], verify: true, match: [/(deadline|prioriti[sz])/] },
      { category: "Other Qualifications", label: "Stakeholder communication", patterns: [/stakeholder/], verify: true, match: [/stakeholder/] }
    ];

    var requirements = [];
    definitions.forEach(function (definition) {
      if (definition.patterns.some(function (pattern) { return containsPattern(lowerJob, pattern); })) {
        if (!categories[definition.category].some(function (item) { return item.label === definition.label; })) {
          var cvMatch = definition.match && definition.match.some(function (pattern) { return containsPattern(lowerCv, pattern); });
          var requirement = { label: definition.label, category: definition.category, verify: Boolean(definition.verify), cvMatch: Boolean(cvMatch) };
          categories[definition.category].push(requirement);
          requirements.push(requirement);
        }
      }
    });

    var genericJobSkills = extractGenericSkills(jobText, lowerJob, lowerCv, requirements);
    genericJobSkills.forEach(function (requirement) {
      categories[requirement.category].push(requirement);
      requirements.push(requirement);
    });

    if (!requirements.length) {
      var fallback = { label: "Role-specific requirements need manual review", category: "Other Qualifications", verify: true, cvMatch: false };
      categories["Other Qualifications"].push(fallback);
      requirements.push(fallback);
    }

    var found = requirements.filter(function (item) { return item.cvMatch && !item.verify; });
    var notFound = requirements.filter(function (item) { return !item.cvMatch && !item.verify; });
    var verification = requirements.filter(function (item) { return item.verify; });
    var plan = createReadinessPlan(notFound, verification);
    var questions = createInterviewQuestions(requirements, jobText);

    return {
      analyzedAt: new Date().toISOString(),
      jobText: jobText,
      cvText: cvText,
      categories: categories,
      found: found,
      notFound: notFound,
      verification: verification,
      plan: plan,
      questions: questions
    };
  }

  function extractGenericSkills(jobText, lowerJob, lowerCv, existing) {
    var result = [];
    var lines = jobText.split(/[\n.;]/).map(function (line) { return line.trim(); }).filter(Boolean);
    var keywords = ["skills", "requirements", "qualifications", "must have", "responsibilities"];
    lines.forEach(function (line) {
      var low = line.toLowerCase();
      if (!keywords.some(function (keyword) { return low.indexOf(keyword) > -1; })) return;
      var matches = line.match(/(?:experience with|knowledge of|proficiency in|skills? in|ability to)\s+([a-z][a-z0-9+.#/\- ]{2,45})/ig) || [];
      matches.slice(0, 2).forEach(function (match) {
        var label = match.replace(/^(experience with|knowledge of|proficiency in|skills? in|ability to)\s+/i, "").replace(/[,:].*$/, "").trim();
        label = label.charAt(0).toUpperCase() + label.slice(1);
        if (label.length > 2 && !existing.some(function (item) { return item.label.toLowerCase() === label.toLowerCase(); }) && !result.some(function (item) { return item.label.toLowerCase() === label.toLowerCase(); })) {
          result.push({ label: label, category: "Other Qualifications", verify: false, cvMatch: new RegExp(escapeRegExp(label.toLowerCase()), "i").test(lowerCv) });
        }
      });
    });
    return result;
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function createReadinessPlan(notFound, verification) {
    var items = [];
    notFound.forEach(function (requirement) {
      var action = requirement.category === "Technical Skills"
        ? "Learn the fundamentals, then complete a small portfolio project or practice task you can describe clearly."
        : "Learn the fundamentals and add accurate, demonstrable evidence to your CV when appropriate.";
      items.push({
        id: "gap-" + toSafeId(requirement.label.toLowerCase()),
        title: "Build evidence for " + requirement.label,
        requirement: requirement.label,
        category: requirement.category,
        why: "This was identified in the supplied job description under " + requirement.category + ". It is a local text-based suggestion to review.",
        action: action,
        detail: action
      });
    });
    verification.forEach(function (requirement) {
      var verificationAction = "Review your CV for accurate evidence, then prepare a specific, evidence-based interview example.";
      items.push({
        id: "verify-" + toSafeId(requirement.label.toLowerCase()),
        title: "Verify and prepare evidence for " + requirement.label,
        requirement: requirement.label,
        category: requirement.category,
        why: "This requires verification because simple text matching cannot confirm " + requirement.category.toLowerCase() + " evidence reliably.",
        action: verificationAction,
        detail: verificationAction
      });
    });
    if (!items.length) {
      var fallbackAction = "Prepare a concise example that shows how your explicitly matched skills relate to this role.";
      items.push({
        id: "review-evidence",
        title: "Review your evidence before applying",
        requirement: "Your matched role evidence",
        category: "Preparation",
        why: "Your entered text produced no unverified or missing simple matches, so reviewing concrete evidence is still useful.",
        action: fallbackAction,
        detail: fallbackAction
      });
    }
    return items.slice(0, 8);
  }

  function createInterviewQuestions(requirements, jobText) {
    var specific = requirements.filter(function (item) { return item.category === "Technical Skills"; }).slice(0, 3).map(function (item) {
      return "Tell us about a project or task where you used " + item.label + ". What was your contribution, and what did you learn?";
    });
    var questions = specific.concat([
      "How would you approach learning an unfamiliar requirement in this role while keeping your work reliable?",
      "Describe a time you worked with others to move a task forward. How did you communicate progress and respond to feedback?",
      "What draws you to this role, and how have you prepared to contribute thoughtfully?",
      "Tell us about a time you organized competing priorities or deadlines. What did you do?",
      "How would you make sure your work is accurate and useful to the people relying on it?"
    ]);
    if (/customer|client|community|user/i.test(jobText)) {
      questions.push("How would you listen to the needs of a customer, client, community member, or user before deciding on a solution?");
    }
    return questions.slice(0, 7);
  }

  function renderAnalysis() {
    var analysis = state.analysis;
    if (!analysis) {
      els.analysisResults.hidden = true;
      return;
    }
    els.analysisResults.hidden = false;
    document.getElementById("job-info-summary").textContent = analysis.jobText.length + " characters of job-description text were reviewed locally, with " + getRequirementCount(analysis) + " suggested requirement" + (getRequirementCount(analysis) === 1 ? "" : "s") + " identified.";
    document.getElementById("cv-info-summary").textContent = analysis.cvText.length + " characters of CV text were compared only for explicit wording. No information is sent anywhere.";
    document.getElementById("recommendation-summary").textContent = analysis.plan.length + " practical preparation action" + (analysis.plan.length === 1 ? " was" : "s were") + " created from not-found or verification items.";

    els.requirementsCategories.innerHTML = CATEGORY_ORDER.map(function (category) {
      var items = analysis.categories[category] || [];
      var content = items.length
        ? '<ul>' + items.map(function (item) { return '<li>' + escapeHtml(item.label) + '</li>'; }).join("") + '</ul>'
        : '<p class="category-empty">No category identified from the text provided.</p>';
      return '<article class="category-card"><h4><span>' + escapeHtml(category) + '</span><span class="source-badge">AI Extracted</span></h4>' + content + '</article>';
    }).join("");

    renderMatchList(els.matchesFound, analysis.found, "No explicitly matched requirements were identified.");
    renderMatchList(els.matchesNotFound, analysis.notFound, "No simple text gaps were identified. Review the categories and verification items carefully.");
    renderMatchList(els.matchesVerify, analysis.verification, "No requirements need verification based on the current text.");

    els.readinessActions.innerHTML = analysis.plan.map(function (action) {
      var checked = Boolean(state.readiness[action.id]);
      var requirement = action.requirement || action.title.replace(/^Build evidence for |^Verify and prepare evidence for /, "");
      var why = action.why || "This action is based on the entered job-description and CV text. Review the evidence before acting on it.";
      var practicalAction = action.action || action.detail;
      return '<label class="readiness-action' + (checked ? " done" : "") + '"><input type="checkbox" data-action="toggle-readiness" data-plan-id="' + escapeHtml(action.id) + '"' + (checked ? " checked" : "") + '><span class="readiness-content"><strong class="readiness-title">' + escapeHtml(action.title) + '</strong><span class="readiness-detail"><b>Requirement</b><span>' + escapeHtml(requirement) + '</span></span><span class="readiness-detail"><b>Why it matters</b><span>' + escapeHtml(why) + '</span></span><span class="readiness-detail"><b>Practical action</b><span>' + escapeHtml(practicalAction) + '</span></span></span></label>';
    }).join("");

    els.interviewQuestions.innerHTML = analysis.questions.map(function (question) { return '<li>' + escapeHtml(question) + '</li>'; }).join("");
    updateReadinessDisplays();
  }

  function getRequirementCount(analysis) {
    return CATEGORY_ORDER.reduce(function (sum, category) { return sum + ((analysis.categories[category] || []).length); }, 0);
  }

  function renderMatchList(target, items, emptyText) {
    target.innerHTML = items.length
      ? items.map(function (item) { return '<li>' + escapeHtml(item.label) + '</li>'; }).join("")
      : '<li class="empty-match">' + escapeHtml(emptyText) + '</li>';
  }

  function toggleReadiness(id, checked) {
    state.readiness[id] = checked;
    saveJson(STORAGE.readiness, state.readiness);
    renderAnalysis();
    renderDashboard();
  }

  function compareRole(roleId) {
    var roles = (window.CAREERFLOW_DEMO_DATA && window.CAREERFLOW_DEMO_DATA.careerRoles) || [];
    var role = roles.find(function (item) { return item.id === roleId; });
    if (!role) return;
    clearApplicationAnalysisContext();
    els.jobDescription.value = role.jobDescription;
    var savedCv = "";
    try { savedCv = localStorage.getItem(STORAGE.cvText) || ""; } catch (error) { /* no local storage */ }
    if (!els.cvText.value.trim() && savedCv) els.cvText.value = savedCv;
    setAnalysisContext("<strong>Demo Data loaded:</strong> " + escapeHtml(role.title) + ". This is a generic example role, not a real company requirement. Your existing CV text was kept when available. Run analysis when you are ready.");
    document.getElementById("ai").scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    setTimeout(function () { els.jobDescription.focus(); }, 400);
    showToast("Demo Data role added to CareerFlow AI. Review the text, then run the local analysis.");
  }

  function handleDocumentClick(event) {
    var button = event.target.closest("[data-action]");
    if (!button) return;
    var action = button.getAttribute("data-action");
    var id = button.getAttribute("data-id");

    if (action === "open-add") openApplicationDialog();
    if (action === "close-dialog") closeApplicationDialog();
    if (action === "load-example") loadExampleData();
    if (action === "edit-app") openApplicationDialog(state.applications.find(function (app) { return app.id === id; }));
    if (action === "delete-app") deleteApplication(id);
    if (action === "analyze-app") analyzeApplication(id);
    if (action === "open-followup") {
      var application = state.applications.find(function (app) { return app.id === id; });
      if (application) renderFollowupAssistant(application);
    }
    if (action === "close-followup") button.closest(".followup-assistant").remove();
    if (action === "copy-followup") copyFollowup(id, button);
    if (action === "compare-role") compareRole(button.getAttribute("data-role"));
    if (action === "next-followup") {
      var dueApplication = state.applications.find(function (app) { return app.id === id; });
      if (dueApplication) renderFollowupAssistant(dueApplication);
    }
    if (action === "next-interview" || action === "next-analyze") analyzeApplication(id);
    if (action === "next-readiness") {
      document.getElementById("plan-title").scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
      setTimeout(function () {
        var checkbox = document.querySelector('[data-plan-id="' + cssEscape(button.getAttribute("data-plan-id")) + '"]');
        if (checkbox) checkbox.focus();
      }, 400);
    }
    if (action === "next-map") document.getElementById("career-map").scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  }

  function copyFollowup(id, button) {
    var textarea = document.getElementById("followup-message-" + toSafeId(id));
    var status = button.parentElement.querySelector(".copy-status");
    if (!textarea) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textarea.value).then(function () {
        status.textContent = "Message copied to your clipboard.";
        showToast("Follow-up message copied.");
      }).catch(function () {
        fallbackCopy(textarea, status);
      });
    } else {
      fallbackCopy(textarea, status);
    }
  }

  function fallbackCopy(textarea, status) {
    textarea.focus();
    textarea.select();
    try {
      var didCopy = document.execCommand("copy");
      status.textContent = didCopy ? "Message copied to your clipboard." : "Clipboard access is unavailable. The message is selected—copy it manually.";
      if (didCopy) showToast("Follow-up message copied.");
    } catch (error) {
      status.textContent = "Clipboard access is unavailable. The message is selected—copy it manually.";
    }
  }

  function renderAll() {
    renderDashboard();
    renderApplications();
    renderCareerMap();
    renderAnalysis();
  }

  function init() {
    initializeTheme();
    els.themeToggle.addEventListener("click", toggleTheme);
    try {
      var savedCv = localStorage.getItem(STORAGE.cvText);
      if (savedCv && !els.cvText.value) els.cvText.value = savedCv;
    } catch (error) { /* app remains usable without storage */ }

    els.statusFilter.addEventListener("change", function () {
      state.activeFilter = els.statusFilter.value;
      renderApplications();
    });
    els.appForm.addEventListener("submit", saveApplication);
    els.analyzeButton.addEventListener("click", runAnalysis);
    els.jobDescription.addEventListener("input", resetApplicationAnalysisIfSourceChanged);
    els.cvText.addEventListener("input", resetApplicationAnalysisIfCvChanged);
    els.cvText.addEventListener("change", function () {
      try { localStorage.setItem(STORAGE.cvText, els.cvText.value); } catch (error) { /* save feedback occurs on actions */ }
    });
    normalizeAnalyzedApplicationRecords();
    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("change", function (event) {
      if (event.target.matches('[data-action="toggle-readiness"]')) toggleReadiness(event.target.getAttribute("data-plan-id"), event.target.checked);
    });
    els.appDialog.addEventListener("click", function (event) {
      if (event.target === els.appDialog) closeApplicationDialog();
    });
    renderAll();
  }

  init();
}());
