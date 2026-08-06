const params = new URLSearchParams(window.location.search);
const inquiryId = params.get("id");

const titleEl = document.querySelector(".title");
const categoryEl = document.querySelector(".category");
const industryEl = document.querySelector(".industry");
const contentEl = document.querySelector(".content");
const contactEl = document.querySelector(".contact");

const readBadge = document.querySelector(".read-badge");
const answeredBadge = document.querySelector(".answered-badge");
const archivedBadge = document.querySelector(".archived-badge");

const readBtn = document.querySelector(".read-btn");
const answeredBtn = document.querySelector(".answered-btn");
const archiveBtn = document.querySelector(".archive-btn");
const deleteBtn = document.querySelector(".delete-button");

function applyStatus(inquiry) {
  readBadge.textContent = inquiry.isRead ? "Read" : "Unread";
  readBadge.className = "status-badge read-badge " + (inquiry.isRead ? "read" : "unread");
  readBtn.textContent = inquiry.isRead ? "Read" : "Mark as Read";
  readBtn.disabled = inquiry.isRead;

  answeredBadge.textContent = inquiry.isAnswered ? "Answered" : "Unanswered";
  answeredBadge.className = "status-badge answered-badge " + (inquiry.isAnswered ? "answered" : "unanswered");
  answeredBtn.textContent = inquiry.isAnswered ? "Answered" : "Mark as Answered";
  answeredBtn.disabled = inquiry.isAnswered;

  archivedBadge.style.display = inquiry.isArchived ? "inline-flex" : "none";
  archiveBtn.textContent = inquiry.isArchived ? "Unarchive" : "Archive";
}

async function updateInquiry(payload) {
  try {
    const res = await fetch(`/api/inquiries/${inquiryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (res.ok) {
      applyStatus(data.inquiry);
    } else {
      alert(data.error || "Could not update inquiry.");
    }
  } catch (err) {
    alert("Could not reach the server.");
  }
}

async function loadInquiry() {
  if (!inquiryId) {
    contentEl.textContent = "No inquiry selected.";
    return;
  }

  try {
    const res = await fetch(`/api/inquiries/${inquiryId}`);
    const data = await res.json();

    if (!res.ok) {
      contentEl.textContent = data.error || "Could not load inquiry.";
      return;
    }

    const inquiry = data.inquiry;
    titleEl.textContent = inquiry.subject;
    categoryEl.textContent = inquiry.category;
    industryEl.textContent = inquiry.industrySector;
    contentEl.textContent = inquiry.message;
    contactEl.textContent = inquiry.email;

    applyStatus(inquiry);

    if (!inquiry.isRead) {
      updateInquiry({ isRead: true });
    }
  } catch (err) {
    contentEl.textContent = "Could not reach the server.";
  }
}

readBtn.addEventListener("click", function () {
  updateInquiry({ isRead: true });
});

answeredBtn.addEventListener("click", function () {
  updateInquiry({ isAnswered: true });
});

archiveBtn.addEventListener("click", function () {
  updateInquiry({ isArchived: archiveBtn.textContent === "Archive" });
});

deleteBtn.addEventListener("click", async function () {
  const confirmed = confirm("Delete this inquiry? This cannot be undone.");
  if (!confirmed) return;

  try {
    const res = await fetch(`/api/inquiries/${inquiryId}`, { method: "DELETE" });
    const data = await res.json();

    if (res.ok) {
      window.location.href = "/admin_inquiry_management.html";
    } else {
      alert(data.error || "Could not delete inquiry.");
    }
  } catch (err) {
    alert("Could not reach the server.");
  }
});

loadInquiry();