const params = new URLSearchParams(window.location.search);
const inquiryId = params.get("id");

const titleEl = document.querySelector(".title");
const categoryEl = document.querySelector(".category");
const industryEl = document.querySelector(".industry");
const contentEl = document.querySelector(".content");
const contactEl = document.querySelector(".contact");
const solvedBtn = document.querySelector(".solved-button");

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

    if (inquiry.isAnswered) {
      solvedBtn.value = "Solved";
      solvedBtn.disabled = true;
    }
  } catch (err) {
    contentEl.textContent = "Could not reach the server.";
  }
}

solvedBtn.addEventListener("click", async function (e) {
  e.preventDefault();

  try {
    const res = await fetch(`/api/inquiries/${inquiryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAnswered: true })
    });

    const data = await res.json();

    if (res.ok) {
      solvedBtn.value = "Solved";
      solvedBtn.disabled = true;
    } else {
      alert(data.error || "Could not update inquiry.");
    }
  } catch (err) {
    alert("Could not reach the server.");
  }
});

loadInquiry();