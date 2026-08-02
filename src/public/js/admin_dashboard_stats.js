document.addEventListener('DOMContentLoaded', async function() {
  try {
    const response = await fetch('/api/admin/stats');
    const stats = await response.json();
    document.querySelectorAll('.card-body h2')[1].textContent = stats.totalAdmins;
  } 
  catch (error) {
    console.log('Could not load admin count');
  }
});