const successModal = document.getElementById("success-modal");
const modalTicket = document.getElementById("modal-ticket");
const modalClose = document.getElementById("modal-close");

modalClose.addEventListener("click", function () {
  successModal.style.display = "none";
});

document.getElementById("inquiry-form").addEventListener("submit", async function (e) {
  e.preventDefault();

  const statusEl = document.getElementById("form-status");

  const payload = {
    firstName: document.getElementById("first-name-field").value,
    lastName: document.getElementById("last-name-field").value,
    businessName: document.getElementById("business-name-field").value,
    industrySector: document.getElementById("industry-sector-field").value,
    category: document.getElementById("category-field").value,
    subject: document.getElementById("subject-field").value,
    message: document.getElementById("message-field").value,
    email: document.getElementById("inquiry-email").value
  };

  try {
    const res = await fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (res.ok) {
      statusEl.textContent = "";
      modalTicket.textContent = data.inquiry.ticketNumber;
      successModal.style.display = "flex";
      e.target.reset();
    } else {
      statusEl.textContent = data.error || "Something went wrong.";
      statusEl.style.color = "red";
    }
  } catch (err) {
    statusEl.textContent = "Could not reach the server. Please try again later.";
    statusEl.style.color = "red";
  }
});