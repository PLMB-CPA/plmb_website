const params = new URLSearchParams(window.location.search);
const inquiryId = params.get("id");

const titleEl = document.querySelector(".title");
const categoryEl = document.querySelector(".category");
const industryEl = document.querySelector(".industry");
const contentEl = document.querySelector(".content");
const contactEl = document.querySelector(".contact");
const deleteBtn = document.querySelector(".delete-button");

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
  } catch (err) {
    contentEl.textContent = "Could not reach the server.";
  }
}

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