/* ==========================================================================
   Mini Client CRM — Application Logic (Connected to Express API)
   ========================================================================== */

(function () {
  "use strict";

 const API_BASE = "https://mini-client-crm-production.up.railway.app/api";

  const LEAD_STATUSES = ["New", "Contacted", "Qualified", "Proposal Sent", "Won", "Lost"];
  const FOLLOWUP_STATUSES = ["Pending", "Completed", "Cancelled"];

  let clients = [];
  let followups = [];

  /* ---------------------------------------------------------------------
     1. API FETCH HELPER
  --------------------------------------------------------------------- */

  async function apiFetch(endpoint, options = {}) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          "Content-Type": "application/json",
        },
        ...options,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || errorData.error || "API request failed");
      }
      return await response.json();
    } catch (err) {
      showToast(err.message, "error");
      throw err;
    }
  }

  async function loadData() {
    try {
      clients = await apiFetch("/clients");
      followups = await apiFetch("/followups");
    } catch (err) {
      console.error("Failed to load data from API:", err);
    }
  }

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
    if (!isoDate) return "";
    const d = new Date(isoDate + "T00:00:00");
    if (isNaN(d)) return isoDate;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  function formatTime(time24) {
    if (!time24) return "";
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

  async function switchScreen(screenName) {
    $$(".screen").forEach((s) => s.classList.remove("active"));
    $("#screen-" + screenName).classList.add("active");

    $$(".nav-item").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.screen === screenName);
    });

    // Refresh data from database
    await loadData();

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

  async function renderDashboard() {
    try {
      // Fetch dynamic stats from dashboard API
      const data = await apiFetch("/dashboard/stats");
      const stats = data.stats;
      const reminders = data.reminders;

      $("#kpi-total-clients").textContent = stats.totalClients;
      $("#kpi-new-leads").textContent = stats.clientStages["New"] || 0;
      $("#kpi-followups-today").textContent = stats.totalPendingFollowups;
      $("#kpi-won-deals").textContent = stats.clientStages["Won"] || 0;

      // Pipeline
      const pipelineGrid = $("#pipelineGrid");
      pipelineGrid.innerHTML = LEAD_STATUSES.map((status) => {
        const count = stats.clientStages[status] || 0;
        return `
          <div class="pipeline-stage">
            <div class="pipeline-count">${count}</div>
            <div class="pipeline-name">${status}</div>
          </div>`;
      }).join("");

      // Upcoming followups (reminders)
      const upcomingList = $("#upcomingList");
      if (reminders.length === 0) {
        upcomingList.innerHTML = `<li class="empty-text">No upcoming follow-ups. Everyone's caught up.</li>`;
      } else {
        upcomingList.innerHTML = reminders
          .map((f) => {
            const name = f.client_name || "Unknown Client";
            return `
              <li class="upcoming-item">
                <div class="upcoming-avatar">${initials(name)}</div>
                <div>
                  <div class="upcoming-name">${name}</div>
                  <div class="upcoming-purpose">${f.purpose}</div>
                  <div class="upcoming-time">${formatDate(f.followup_date)} &middot; ${formatTime(f.followup_time)}</div>
                </div>
              </li>`;
          })
          .join("");
      }

      // Hardcoded activities for UI completeness
      const hardcodedActivities = [
        { text: "Client Maryam Yousaf marked as Won", time: "Today, 9:12 AM" },
        { text: "Proposal sent to Taha Sohail", time: "Yesterday, 4:40 PM" },
        { text: "Follow-up completed with Abdullah Malik", time: "Yesterday, 11:05 AM" },
        { text: "New lead added: Fazal Zaman", time: "2 days ago" }
      ];
      const activityFeed = $("#activityFeed");
      activityFeed.innerHTML = hardcodedActivities
        .map((a) => `<li class="activity-item">${a.text}<span class="activity-time">${a.time}</span></li>`)
        .join("");

    } catch (err) {
      console.error(err);
    }
  }

  /* ---------------------------------------------------------------------
     5. CLIENT TABLE + FILTERING
  --------------------------------------------------------------------- */

  async function renderClientTable() {
    const searchQuery = $("#clientSearch").value.trim();
    const statusFilter = $("#clientStatusFilter").value;

    let endpoint = "/clients";
    const params = [];
    if (searchQuery) params.push(`search=${encodeURIComponent(searchQuery)}`);
    if (statusFilter !== "all") params.push(`status=${encodeURIComponent(statusFilter)}`);
    if (params.length > 0) endpoint += "?" + params.join("&");

    try {
      const filtered = await apiFetch(endpoint);
      const tbody = $("#clientTableBody");
      const emptyState = $("#clientEmptyState");

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
            <td class="cell-name">${c.full_name}</td>
            <td>${c.company}</td>
            <td class="cell-muted">${c.email}</td>
            <td class="cell-muted">${c.phone || ""}</td>
            <td>${badge(c.lead_status)}</td>
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
    } catch (err) {
      console.error(err);
    }
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

  async function openEditClientModal(id) {
    try {
      const client = await apiFetch(`/clients/${id}`);
      if (!client) return;
      resetClientForm();
      $("#clientModalTitle").textContent = "Edit Client";
      $("#clientSubmitBtn").textContent = "Update Client";
      $("#clientId").value = client.id;
      $("#clientName").value = client.full_name;
      $("#clientCompany").value = client.company;
      $("#clientEmail").value = client.email;
      $("#clientPhone").value = client.phone || "";
      $("#clientStatus").value = client.lead_status;
      $("#clientNotes").value = client.notes || "";
      openModal("clientModalBackdrop");
    } catch (err) {
      console.error(err);
    }
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
    if (phone) {
      if (!/^[0-9+\-\s()]{7,15}$/.test(phone)) {
        setFieldError("clientPhone", "Enter a valid phone number.");
        valid = false;
      }
    }

    return valid;
  }

  async function handleClientFormSubmit(e) {
    e.preventDefault();
    if (!validateClientForm()) return;

    const id = $("#clientId").value;
    const payload = {
      full_name: $("#clientName").value.trim(),
      company: $("#clientCompany").value.trim(),
      email: $("#clientEmail").value.trim(),
      phone: $("#clientPhone").value.trim() || null,
      lead_status: $("#clientStatus").value,
      notes: $("#clientNotes").value.trim() || null,
    };

    try {
      if (id) {
        await apiFetch(`/clients/${id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        showToast(`${payload.full_name} was updated.`);
      } else {
        const newClient = await apiFetch("/clients", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        showToast(`${newClient.full_name} was added as a new client.`);
      }

      closeModal("clientModalBackdrop");
      await loadData();
      renderClientTable();
      renderDashboard();
      populateFollowupClientOptions();
    } catch (err) {
      console.error(err);
    }
  }

  /* ---- Delete Client Modal ---- */

  let clientPendingDeleteId = null;

  async function openDeleteClientModal(id) {
    try {
      const client = await apiFetch(`/clients/${id}`);
      if (!client) return;
      clientPendingDeleteId = id;
      $("#deleteClientName").textContent = client.full_name;
      openModal("deleteClientModalBackdrop");
    } catch (err) {
      console.error(err);
    }
  }

  async function confirmDeleteClient() {
    if (clientPendingDeleteId == null) return;
    try {
      await apiFetch(`/clients/${clientPendingDeleteId}`, {
        method: "DELETE",
      });
      showToast("Client and associated followups deleted.");
      clientPendingDeleteId = null;
      closeModal("deleteClientModalBackdrop");
      await loadData();
      renderClientTable();
      renderFollowupTable();
      renderDashboard();
      populateFollowupClientOptions();
    } catch (err) {
      console.error(err);
    }
  }

  /* ---------------------------------------------------------------------
     6. FOLLOW-UP TABLE
  --------------------------------------------------------------------- */

  async function renderFollowupTable() {
    try {
      const sorted = await apiFetch("/followups");
      const tbody = $("#followupTableBody");
      const emptyState = $("#followupEmptyState");

      if (sorted.length === 0) {
        tbody.innerHTML = "";
        emptyState.hidden = false;
        return;
      }
      emptyState.hidden = true;

      tbody.innerHTML = sorted
        .map((f) => {
          const client = getClientById(f.client_id);
          const name = client ? client.full_name : "Unknown Client";
          return `
          <tr>
            <td class="cell-name">${name}</td>
            <td>${formatDate(f.followup_date)}</td>
            <td>${formatTime(f.followup_time)}</td>
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
    } catch (err) {
      console.error(err);
    }
  }

  function populateFollowupClientOptions() {
    const select = $("#followupClient");
    const current = select.value;
    select.innerHTML =
      `<option value="">Select a client...</option>` +
      clients.map((c) => `<option value="${c.id}">${c.full_name} — ${c.company}</option>`).join("");
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

  async function openEditFollowupModal(id) {
    try {
      const f = await apiFetch(`/followups/${id}`);
      if (!f) return;
      resetFollowupForm();
      populateFollowupClientOptions();
      $("#followupModalTitle").textContent = "Edit Follow-Up";
      $("#followupSubmitBtn").textContent = "Update Follow-Up";
      $("#followupId").value = f.id;
      $("#followupClient").value = f.client_id;
      $("#followupDate").value = f.followup_date;
      $("#followupTime").value = f.followup_time || "";
      $("#followupPurpose").value = f.purpose;
      $("#followupStatus").value = f.status;
      $("#followupRemarks").value = f.remarks || "";
      openModal("followupModalBackdrop");
    } catch (err) {
      console.error(err);
    }
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
    if (!$("#followupPurpose").value.trim()) {
      setFieldError("followupPurpose", "Purpose is required.");
      valid = false;
    }

    return valid;
  }

  async function handleFollowupFormSubmit(e) {
    e.preventDefault();
    if (!validateFollowupForm()) return;

    const id = $("#followupId").value;
    const payload = {
      client_id: Number($("#followupClient").value),
      followup_date: $("#followupDate").value,
      followup_time: $("#followupTime").value || null,
      purpose: $("#followupPurpose").value.trim(),
      status: $("#followupStatus").value,
      remarks: $("#followupRemarks").value.trim() || null,
    };

    try {
      if (id) {
        await apiFetch(`/followups/${id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        showToast("Follow-up was updated.");
      } else {
        await apiFetch("/followups", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        showToast("Follow-up was scheduled.");
      }

      closeModal("followupModalBackdrop");
      await loadData();
      renderFollowupTable();
      renderDashboard();
    } catch (err) {
      console.error(err);
    }
  }

  /* ---- Delete Follow-Up Modal ---- */

  let followupPendingDeleteId = null;

  async function openDeleteFollowupModal(id) {
    try {
      const f = await apiFetch(`/followups/${id}`);
      if (!f) return;
      followupPendingDeleteId = id;
      const client = getClientById(f.client_id);
      $("#deleteFollowupName").textContent = client ? client.full_name : "this client";
      openModal("deleteFollowupModalBackdrop");
    } catch (err) {
      console.error(err);
    }
  }

  async function confirmDeleteFollowup() {
    if (followupPendingDeleteId == null) return;
    try {
      await apiFetch(`/followups/${followupPendingDeleteId}`, {
        method: "DELETE",
      });
      followupPendingDeleteId = null;
      showToast("Follow-up was deleted.");
      closeModal("deleteFollowupModalBackdrop");
      await loadData();
      renderFollowupTable();
      renderDashboard();
    } catch (err) {
      console.error(err);
    }
  }

  /* ---------------------------------------------------------------------
     7. REPORTS
  --------------------------------------------------------------------- */

  function renderReports() {
    const statusSummary = $("#statusSummary");
    statusSummary.innerHTML = LEAD_STATUSES.map((status) => {
      const count = clients.filter((c) => c.lead_status === status).length;
      return `<div class="summary-row"><span>${status}</span><span class="summary-count">${count}</span></div>`;
    }).join("");

    const followupSummary = $("#followupSummary");
    followupSummary.innerHTML = FOLLOWUP_STATUSES.map((status) => {
      const count = followups.filter((f) => f.status === status).length;
      return `<div class="summary-row"><span>${status}</span><span class="summary-count">${count}</span></div>`;
    }).join("");

    const insights = [];

    const statusCounts = LEAD_STATUSES.map((status) => ({
      status,
      count: clients.filter((c) => c.lead_status === status).length,
    })).filter((s) => s.count > 0);

    if (statusCounts.length) {
      const top = statusCounts.reduce((a, b) => (b.count > a.count ? b : a));
      insights.push(`Most leads are currently in the <strong>${top.status}</strong> stage (${top.count} client${top.count === 1 ? "" : "s"}).`);
    }

    const pendingCount = followups.filter((f) => f.status === "Pending").length;
    insights.push(`${pendingCount} follow-up${pendingCount === 1 ? " is" : "s are"} currently pending.`);

    const wonCount = clients.filter((c) => c.lead_status === "Won").length;
    const totalCount = clients.length || 1;
    const winRate = Math.round((wonCount / totalCount) * 100);
    insights.push(`Win rate stands at <strong>${winRate}%</strong> across all clients in the system.`);

    const lostCount = clients.filter((c) => c.lead_status === "Lost").length;
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

  async function init() {
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

    // Initial data fetch from server
    await loadData();

    populateFollowupClientOptions();
    renderDashboard();
    renderClientTable();
    renderFollowupTable();
    renderReports();
  }

  document.addEventListener("DOMContentLoaded", init);
})();