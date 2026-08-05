document.addEventListener('DOMContentLoaded', async function() {
  try {
    const response = await fetch('/api/admin/stats');

    if (response.status === 401) {
      window.location.href = '/admin_login.html?error=Unauthorized';
      return;
    }

    const stats = await response.json();

    const cards = {
      'total-admins': stats.totalAdmins,
      'published-newsletters': stats.publishedNewsletters,
      'pending-newsletters': stats.pendingNewsletters,
      'pending-inquiries': stats.pendingInquiries
    };

    for (const id in cards) {
      const element = document.getElementById(id);
      if (element) element.textContent = cards[id] === undefined ? '—' : cards[id];
    }
  }
  catch (error) {
    console.log('Could not load dashboard stats');
    document.querySelectorAll('.card-body h2').forEach(function(el) { el.textContent = '—'; });
  }
});
