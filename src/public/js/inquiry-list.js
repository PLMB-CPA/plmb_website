const container = document.getElementById("inquiries-container");

async function fetchInquiries() {
  try {
    const res = await fetch("/api/inquiries");
    const data = await res.json();

    if (res.ok) {
      renderInquiries(data.inquiries);
    } else {
      container.textContent = data.error || "Could not load inquiries.";
    }
  } catch (err) {
    container.textContent = "Could not reach the server.";
  }
}

function renderInquiries(inquiries) {
  container.innerHTML = "";

  if (!inquiries.length) {
    container.textContent = "No inquiries found.";
    return;
  }

  inquiries.forEach((inquiry) => {
    const card = document.createElement("div");
    card.className = "inquiry-container";
    card.dataset.id = inquiry._id;

    card.innerHTML = `
      <p class="ticket">${inquiry.ticketNumber}</p>
      <p class="category">${inquiry.category}</p>
      <p class="industry">${inquiry.industrySector}</p>
      <p class="title">${inquiry.subject}</p>
      <p class="content">${inquiry.message}</p>
      <div class="inquiry-actions">
        <button class="mark-btn" data-field="isRead" ${inquiry.isRead ? "disabled" : ""}>
          ${inquiry.isRead ? "Read" : "Mark as Read"}
        </button>
        <button class="mark-btn" data-field="isAnswered" ${inquiry.isAnswered ? "disabled" : ""}>
          ${inquiry.isAnswered ? "Answered" : "Mark as Answered"}
        </button>
        <button class="mark-btn" data-field="isArchived">
          ${inquiry.isArchived ? "Unarchive" : "Archive"}
        </button>
      </div>
    `;

    container.appendChild(card);
  });
}

container.addEventListener("click", async function (e) {
  const card = e.target.closest(".inquiry-container");
  if (!card) return;

  const id = card.dataset.id;

  if (e.target.classList.contains("mark-btn")) {
    const field = e.target.dataset.field;
    const newValue =
      field === "isArchived" ? e.target.textContent.trim() === "Archive" : true;

    try {
      const res = await fetch(`/api/inquiries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: newValue })
      });

      const data = await res.json();

      if (res.ok) {
        fetchInquiries();
      } else {
        alert(data.error || "Update failed.");
      }
    } catch (err) {
      alert("Could not reach the server.");
    }
    return;
  }

  window.location.href = `/inquiry-full.html?id=${id}`;
});

fetchInquiries();