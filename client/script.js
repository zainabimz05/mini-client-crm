/* ==========================================================================
   Mini Client CRM — Application Logic
   Frontend-only. All data lives in JS arrays (no backend, no localStorage).
   Structured so each function maps cleanly to a future Express/SQLite route:
     GET/POST/PUT/DELETE /api/clients   and   /api/followups
   ========================================================================== */

(function () {
  "use strict";

  /* ---------------------------------------------------------------------
     1. IN-MEMORY DATA STORE
  --------------------------------------------------------------------- */

  const LEAD_STATUSES = ["New", "Contacted", "Qualified", "Proposal Sent", "Won", "Lost"];
  const FOLLOWUP_STATUSES = ["Pending", "Completed", "Cancelled"];

  let clients = [
    { id: 1, name: "Maryam Yousaf", company: "Torchify", email: "meowryam@torchify.com", phone: "0301-2345678", status: "Qualified", notes: "Interested in the annual plan. Needs a demo for his ops team." },
    { id: 2, name: "Taha Sohail", company: "Studify", email: "tahasohail@studify.it", phone: "0333-1122334", status: "Proposal Sent", notes: "Proposal sent 12 Jul. Waiting on budget approval." },
    { id: 3, name: "Abiha Jibbran", company: "Wren & Rose", email: "Abiha@wren.pk", phone: "0321-9988776", status: "Contacted", notes: "Second call scheduled. Compare pricing vs current tool." },
    { id: 4, name: "Hassaan Ahmed", company: "Some fictional company", email: "Hassaan@fictional.com", phone: "0345-6677889", status: "Won", notes: "Signed the annual contract. Onboarding kicked off." },
    { id: 5, name: "Zainab Mazhar", company: "Mz & Co.", email: "zainab@mz.pk", phone: "0312-4455667", status: "New", notes: "Filled the contact form after the trade expo." },
    { id: 6, name: "Ammar Ahmed", company: "CODOC IT", email: "ammar@codoc.it", phone: "0300-7788990", status: "Lost", notes: "Went with a competitor due to pricing." },
    { id: 7, name: "Fazal Zaman", company: "CODOC Consulting", email: "fazal@codoc.com", phone: "0334-5566778", status: "Qualified", notes: "Wants a multi-seat plan for 8 users." },
    { id: 8, name: "Abdullah Malik", company: "CODOC Solutions", email: "abdullah@codoc.pk", phone: "0322-3344556", status: "New", notes: "Referred by Ahmed Raza." },
  ];

  let followups = [
    { id: 1, clientId: 1, date: "2026-07-20", time: "10:00", purpose: "Discovery Call", status: "Pending", remarks: "Bring pricing sheet." },
    { id: 2, clientId: 2, date: "2026-07-16", time: "14:30", purpose: "CRM Demo", status: "Pending", remarks: "Screen-share the reporting module." },
    { id: 3, clientId: 3, date: "2026-07-15", time: "11:15", purpose: "Follow-up Call", status: "Pending", remarks: "Confirm if legal has reviewed the contract." },
    { id: 4, clientId: 4, date: "2026-07-10", time: "09:00", purpose: "Onboarding Kickoff", status: "Completed", remarks: "Walked through account setup." },
    { id: 5, clientId: 7, date: "2026-07-18", time: "16:00", purpose: "Proposal Walkthrough", status: "Pending", remarks: "" },
    { id: 6, clientId: 6, date: "2026-07-08", time: "13:00", purpose: "Retention Call", status: "Cancelled", remarks: "Client confirmed they signed with a competitor." },
  ];

  const recentActivity = [
    { text: "Client Ahmed Raza marked as Won", time: "Today, 9:12 AM" },
    { text: "Proposal sent to Hamza Malik", time: "Yesterday, 4:40 PM" },
    { text: "Follow-up completed with Sara Ahmed", time: "Yesterday, 11:05 AM" },
    { text: "New lead added: Usman Tariq", time: "2 days ago" },
    { text: "Client Bilal Chaudhry marked as Lost", time: "3 days ago" },
  ];

  let nextClientId = clients.length + 1;
  let nextFollowupId = followups.length + 1;

  /* ---------------------------------------------------------------------
     2. HELPERS
  --------------------------------------------------------------------- */

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  function slugify(status) {
    return status.toLowerCase().replace(/\s+/g, "-");
  }

  function badge(status) {
    return `<span class="badge badge-${slugify(status)}">${status}</span>`;
  }

  function initials(name) {
    return name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  function formatDate(isoDate) {
    const d = new Date(isoDate + "T00:00:00");
    if (isNaN(d)) return isoDate;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  function formatTime(time24) {
    const [h, m] = time24.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, "0")} ${period}`;
  }

  function getClientById(id) {
    return clients.find((c) => c.id === id);
  }

  let toastTimer = null;
  function showToast(message, type = "success") {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.remove("error");
    if (type === "error") toast.classList.add("error");
    toast.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 2800);
  }

  function openModal(id) {
    $("#" + id).classList.add("visible");
  }

  function closeModal(id) {
    $("#" + id).classList.remove("visible");
  }

  function clearFieldErrors(formEl) {
    formEl.querySelectorAll(".field-error").forEach((el) => (el.textContent = ""));
    formEl.querySelectorAll(".invalid").forEach((el) => el.classList.remove("invalid"));
  }

  function setFieldError(inputId, message) {
    const input = $("#" + inputId);
    const errorEl = $("#err-" + inputId);
    if (input) input.classList.add("invalid");
    if (errorEl) errorEl.textContent = message;
  }

  /* ---------------------------------------------------------------------
     3. NAVIGATION
  --------------------------------------------------------------------- */

  function switchScreen(screenName) {
    $$(".screen").forEach((s) => s.classList.remove("active"));
    $("#screen-" + screenName).classList.add("active");

    $$(".nav-item").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.screen === screenName);
    });

    // Refresh data relevant to the screen we just entered
    if (screenName === "dashboard") renderDashboard();
    if (screenName === "clients") renderClientTable();
    if (screenName === "followups") renderFollowupTable();
    if (screenName === "reports") renderReports();

    closeMobileNav();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function initNav() {
    $$(".nav-item").forEach((btn) => {
      btn.addEventListener("click", () => switchScreen(btn.dataset.screen));
    });
    $$("[data-screen-link]").forEach((btn) => {
      btn.addEventListener("click", () => switchScreen(btn.dataset.screenLink));
    });
  }

  function openMobileNav() {
    $("#sidebar").classList.add("open");
    $("#navOverlay").classList.add("visible");
  }
  function closeMobileNav() {
    $("#sidebar").classList.remove("open");
    $("#navOverlay").classList.remove("visible");
  }

  function initMobileNav() {
    $("#hamburgerBtn").addEventListener("click", openMobileNav);
    $("#navOverlay").addEventListener("click", closeMobileNav);
  }

  /* ---------------------------------------------------------------------
     4. DASHBOARD RENDERING
  --------------------------------------------------------------------- */

  function renderDashboard() {
    // KPI cards
    $("#kpi-total-clients").textContent = clients.length;
    $("#kpi-new-leads").textContent = clients.filter((c) => c.status === "New").length;

    const todayIso = new Date().toISOString().slice(0, 10);
    $("#kpi-followups-today").textContent = followups.filter((f) => f.date === todayIso).length;
    $("#kpi-won-deals").textContent = clients.filter((c) => c.status === "Won").length;

    // Pipeline
    const pipelineGrid = $("#pipelineGrid");
    pipelineGrid.innerHTML = LEAD_STATUSES.map((status) => {
      const count = clients.filter((c) => c.status === status).length;
      return `
        <div class="pipeline-stage">
          <div class="pipeline-count">${count}</div>
          <div class="pipeline-name">${status}</div>
        </div>`;
    }).join("");

    // Upcoming follow-ups (pending, sorted by date/time, top 4)
    const upcoming = followups
      .filter((f) => f.status === "Pending")
      .slice()
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
      .slice(0, 4);

    const upcomingList = $("#upcomingList");
    if (upcoming.length === 0) {
      upcomingList.innerHTML = `<li class="empty-text">No upcoming follow-ups. Everyone's caught up.</li>`;
    } else {
      upcomingList.innerHTML = upcoming
        .map((f) => {
          const client = getClientById(f.clientId);
          const name = client ? client.name : "Unknown Client";
          return `
            <li class="upcoming-item">
              <div class="upcoming-avatar">${initials(name)}</div>
              <div>
                <div class="upcoming-name">${name}</div>
                <div class="upcoming-purpose">${f.purpose}</div>
                <div class="upcoming-time">${formatDate(f.date)} &middot; ${formatTime(f.time)}</div>
              </div>
            </li>`;
        })
        .join("");
    }

    // Recent activity
    const activityFeed = $("#activityFeed");
    activityFeed.innerHTML = recentActivity
      .map((a) => `<li class="activity-item">${a.text}<span class="activity-time">${a.time}</span></li>`)
      .join("");
  }

  /* ---------------------------------------------------------------------
     5. CLIENT TABLE + FILTERING
  --------------------------------------------------------------------- */

  function getFilteredClients() {
    const query = $("#clientSearch").value.trim().toLowerCase();
    const statusFilter = $("#clientStatusFilter").value;

    return clients.filter((c) => {
      const matchesQuery =
        !query || c.name.toLowerCase().includes(query) || c.company.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }

  function renderClientTable() {
    const tbody = $("#clientTableBody");
    const emptyState = $("#clientEmptyState");
    const filtered = getFilteredClients();

    if (filtered.length === 0) {
      tbody.innerHTML = "";
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    tbody.innerHTML = filtered
      .map(
        (c) => `
        <tr>
          <td class="cell-name">${c.name}</td>
          <td>${c.company}</td>
          <td class="cell-muted">${c.email}</td>
          <td class="cell-muted">${c.phone}</td>
          <td>${badge(c.status)}</td>
          <td class="actions-cell">
            <button class="btn-icon" data-edit-client="${c.id}" title="Edit client">Edit</button>
            <button class="btn-icon danger" data-delete-client="${c.id}" title="Delete client">Delete</button>
          </td>
        </tr>`
      )
      .join("");

    tbody.querySelectorAll("[data-edit-client]").forEach((btn) => {
      btn.addEventListener("click", () => openEditClientModal(Number(btn.dataset.editClient)));
    });
    tbody.querySelectorAll("[data-delete-client]").forEach((btn) => {
      btn.addEventListener("click", () => openDeleteClientModal(Number(btn.dataset.deleteClient)));
    });
  }

  function initClientToolbar() {
    $("#clientSearch").addEventListener("input", renderClientTable);
    $("#clientStatusFilter").addEventListener("change", renderClientTable);
  }

  /* ---- Add / Edit Client Modal ---- */

  function resetClientForm() {
    $("#clientForm").reset();
    $("#clientId").value = "";
    clearFieldErrors($("#clientForm"));
  }

  function openAddClientModal() {
    resetClientForm();
    $("#clientModalTitle").textContent = "Add Client";
    $("#clientSubmitBtn").textContent = "Save Client";
    openModal("clientModalBackdrop");
    $("#clientName").focus();
  }

  function openEditClientModal(id) {
    const client = getClientById(id);
    if (!client) return;
    resetClientForm();
    $("#clientModalTitle").textContent = "Edit Client";
    $("#clientSubmitBtn").textContent = "Update Client";
    $("#clientId").value = client.id;
    $("#clientName").value = client.name;
    $("#clientCompany").value = client.company;
    $("#clientEmail").value = client.email;
    $("#clientPhone").value = client.phone;
    $("#clientStatus").value = client.status;
    $("#clientNotes").value = client.notes || "";
    openModal("clientModalBackdrop");
  }

  function validateClientForm() {
    clearFieldErrors($("#clientForm"));
    let valid = true;

    const name = $("#clientName").value.trim();
    const company = $("#clientCompany").value.trim();
    const email = $("#clientEmail").value.trim();
    const phone = $("#clientPhone").value.trim();

    if (!name) {
      setFieldError("clientName", "Full name is required.");
      valid = false;
    }
    if (!company) {
      setFieldError("clientCompany", "Company is required.");
      valid = false;
    }
    if (!email) {
      setFieldError("clientEmail", "Email is required.");
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldError("clientEmail", "Enter a valid email address.");
      valid = false;
    }
    if (!phone) {
      setFieldError("clientPhone", "Phone number is required.");
      valid = false;
    } else if (!/^[0-9+\-\s]{7,15}$/.test(phone)) {
      setFieldError("clientPhone", "Enter a valid phone number.");
      valid = false;
    }

    return valid;
  }

  function handleClientFormSubmit(e) {
    e.preventDefault();
    if (!validateClientForm()) return;

    const id = $("#clientId").value;
    const payload = {
      name: $("#clientName").value.trim(),
      company: $("#clientCompany").value.trim(),
      email: $("#clientEmail").value.trim(),
      phone: $("#clientPhone").value.trim(),
      status: $("#clientStatus").value,
      notes: $("#clientNotes").value.trim(),
    };

    if (id) {
      const client = getClientById(Number(id));
      Object.assign(client, payload);
      showToast(`${client.name} was updated.`);
    } else {
      const newClient = { id: nextClientId++, ...payload };
      clients.unshift(newClient);
      showToast(`${newClient.name} was added as a new client.`);
    }

    closeModal("clientModalBackdrop");
    renderClientTable();
    renderDashboard();
    populateFollowupClientOptions();
  }

  /* ---- Delete Client Modal ---- */

  let clientPendingDeleteId = null;

  function openDeleteClientModal(id) {
    const client = getClientById(id);
    if (!client) return;
    clientPendingDeleteId = id;
    $("#deleteClientName").textContent = client.name;
    openModal("deleteClientModalBackdrop");
  }

  function confirmDeleteClient() {
    if (clientPendingDeleteId == null) return;
    const client = getClientById(clientPendingDeleteId);
    clients = clients.filter((c) => c.id !== clientPendingDeleteId);
    followups = followups.filter((f) => f.clientId !== clientPendingDeleteId);
    showToast(`${client ? client.name : "Client"} was deleted.`);
    clientPendingDeleteId = null;
    closeModal("deleteClientModalBackdrop");
    renderClientTable();
    renderFollowupTable();
    renderDashboard();
    populateFollowupClientOptions();
  }

  /* ---------------------------------------------------------------------
     6. FOLLOW-UP TABLE
  --------------------------------------------------------------------- */

  function renderFollowupTable() {
    const tbody = $("#followupTableBody");
    const emptyState = $("#followupEmptyState");

    const sorted = followups.slice().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

    if (sorted.length === 0) {
      tbody.innerHTML = "";
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    tbody.innerHTML = sorted
      .map((f) => {
        const client = getClientById(f.clientId);
        const name = client ? client.name : "Unknown Client";
        return `
        <tr>
          <td class="cell-name">${name}</td>
          <td>${formatDate(f.date)}</td>
          <td>${formatTime(f.time)}</td>
          <td>${f.purpose}</td>
          <td>${badge(f.status)}</td>
          <td class="actions-cell">
            <button class="btn-icon" data-edit-followup="${f.id}" title="Edit follow-up">Edit</button>
            <button class="btn-icon danger" data-delete-followup="${f.id}" title="Delete follow-up">Delete</button>
          </td>
        </tr>`;
      })
      .join("");

    tbody.querySelectorAll("[data-edit-followup]").forEach((btn) => {
      btn.addEventListener("click", () => openEditFollowupModal(Number(btn.dataset.editFollowup)));
    });
    tbody.querySelectorAll("[data-delete-followup]").forEach((btn) => {
      btn.addEventListener("click", () => openDeleteFollowupModal(Number(btn.dataset.deleteFollowup)));
    });
  }

  function populateFollowupClientOptions() {
    const select = $("#followupClient");
    const current = select.value;
    select.innerHTML =
      `<option value="">Select a client...</option>` +
      clients.map((c) => `<option value="${c.id}">${c.name} — ${c.company}</option>`).join("");
    if (current) select.value = current;
  }

  /* ---- Add / Edit Follow-Up Modal ---- */

  function resetFollowupForm() {
    $("#followupForm").reset();
    $("#followupId").value = "";
    clearFieldErrors($("#followupForm"));
  }

  function openAddFollowupModal() {
    resetFollowupForm();
    populateFollowupClientOptions();
    $("#followupModalTitle").textContent = "Add Follow-Up";
    $("#followupSubmitBtn").textContent = "Save Follow-Up";
    openModal("followupModalBackdrop");
  }

  function openEditFollowupModal(id) {
    const f = followups.find((x) => x.id === id);
    if (!f) return;
    resetFollowupForm();
    populateFollowupClientOptions();
    $("#followupModalTitle").textContent = "Edit Follow-Up";
    $("#followupSubmitBtn").textContent = "Update Follow-Up";
    $("#followupId").value = f.id;
    $("#followupClient").value = f.clientId;
    $("#followupDate").value = f.date;
    $("#followupTime").value = f.time;
    $("#followupPurpose").value = f.purpose;
    $("#followupStatus").value = f.status;
    $("#followupRemarks").value = f.remarks || "";
    openModal("followupModalBackdrop");
  }

  function validateFollowupForm() {
    clearFieldErrors($("#followupForm"));
    let valid = true;

    if (!$("#followupClient").value) {
      setFieldError("followupClient", "Please select a client.");
      valid = false;
    }
    if (!$("#followupDate").value) {
      setFieldError("followupDate", "Date is required.");
      valid = false;
    }
    if (!$("#followupTime").value) {
      setFieldError("followupTime", "Time is required.");
      valid = false;
    }
    if (!$("#followupPurpose").value.trim()) {
      setFieldError("followupPurpose", "Purpose is required.");
      valid = false;
    }

    return valid;
  }

  function handleFollowupFormSubmit(e) {
    e.preventDefault();
    if (!validateFollowupForm()) return;

    const id = $("#followupId").value;
    const payload = {
      clientId: Number($("#followupClient").value),
      date: $("#followupDate").value,
      time: $("#followupTime").value,
      purpose: $("#followupPurpose").value.trim(),
      status: $("#followupStatus").value,
      remarks: $("#followupRemarks").value.trim(),
    };

    if (id) {
      const followup = followups.find((f) => f.id === Number(id));
      Object.assign(followup, payload);
      showToast("Follow-up was updated.");
    } else {
      followups.unshift({ id: nextFollowupId++, ...payload });
      showToast("Follow-up was scheduled.");
    }

    closeModal("followupModalBackdrop");
    renderFollowupTable();
    renderDashboard();
  }

  /* ---- Delete Follow-Up Modal ---- */

  let followupPendingDeleteId = null;

  function openDeleteFollowupModal(id) {
    const f = followups.find((x) => x.id === id);
    if (!f) return;
    followupPendingDeleteId = id;
    const client = getClientById(f.clientId);
    $("#deleteFollowupName").textContent = client ? client.name : "this client";
    openModal("deleteFollowupModalBackdrop");
  }

  function confirmDeleteFollowup() {
    if (followupPendingDeleteId == null) return;
    followups = followups.filter((f) => f.id !== followupPendingDeleteId);
    followupPendingDeleteId = null;
    showToast("Follow-up was deleted.");
    closeModal("deleteFollowupModalBackdrop");
    renderFollowupTable();
    renderDashboard();
  }

  /* ---------------------------------------------------------------------
     7. REPORTS
  --------------------------------------------------------------------- */

  function renderReports() {
    const statusSummary = $("#statusSummary");
    statusSummary.innerHTML = LEAD_STATUSES.map((status) => {
      const count = clients.filter((c) => c.status === status).length;
      return `<div class="summary-row"><span>${status}</span><span class="summary-count">${count}</span></div>`;
    }).join("");

    const followupSummary = $("#followupSummary");
    followupSummary.innerHTML = FOLLOWUP_STATUSES.map((status) => {
      const count = followups.filter((f) => f.status === status).length;
      return `<div class="summary-row"><span>${status}</span><span class="summary-count">${count}</span></div>`;
    }).join("");

    // Quick insights — generated from live data
    const insights = [];

    const statusCounts = LEAD_STATUSES.map((status) => ({
      status,
      count: clients.filter((c) => c.status === status).length,
    })).filter((s) => s.count > 0);

    if (statusCounts.length) {
      const top = statusCounts.reduce((a, b) => (b.count > a.count ? b : a));
      insights.push(`Most leads are currently in the <strong>${top.status}</strong> stage (${top.count} client${top.count === 1 ? "" : "s"}).`);
    }

    const pendingCount = followups.filter((f) => f.status === "Pending").length;
    insights.push(`${pendingCount} follow-up${pendingCount === 1 ? " is" : "s are"} currently pending.`);

    const wonCount = clients.filter((c) => c.status === "Won").length;
    const totalCount = clients.length || 1;
    const winRate = Math.round((wonCount / totalCount) * 100);
    insights.push(`Win rate stands at <strong>${winRate}%</strong> across all clients in the system.`);

    const lostCount = clients.filter((c) => c.status === "Lost").length;
    if (lostCount > 0) {
      insights.push(`${lostCount} client${lostCount === 1 ? "" : "s"} marked as Lost — worth a follow-up on what could improve.`);
    }

    $("#insightList").innerHTML = insights.map((i) => `<li>${i}</li>`).join("");
  }

  /* ---------------------------------------------------------------------
     8. MODAL CLOSE WIRING (shared)
  --------------------------------------------------------------------- */

  function initModalDismiss() {
    $$("[data-close-modal]").forEach((btn) => {
      btn.addEventListener("click", () => closeModal(btn.dataset.closeModal));
    });
    $$(".modal-backdrop").forEach((backdrop) => {
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) backdrop.classList.remove("visible");
      });
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        $$(".modal-backdrop.visible").forEach((m) => m.classList.remove("visible"));
      }
    });
  }

  /* ---------------------------------------------------------------------
     9. INIT
  --------------------------------------------------------------------- */

  function init() {
    initNav();
    initMobileNav();
    initModalDismiss();
    initClientToolbar();

    $("#openAddClientBtn").addEventListener("click", openAddClientModal);
    $("#clientForm").addEventListener("submit", handleClientFormSubmit);
    $("#confirmDeleteClientBtn").addEventListener("click", confirmDeleteClient);

    $("#openAddFollowupBtn").addEventListener("click", openAddFollowupModal);
    $("#followupForm").addEventListener("submit", handleFollowupFormSubmit);
    $("#confirmDeleteFollowupBtn").addEventListener("click", confirmDeleteFollowup);

    populateFollowupClientOptions();
    renderDashboard();
    renderClientTable();
    renderFollowupTable();
    renderReports();
  }

  document.addEventListener("DOMContentLoaded", init);
})();