document.addEventListener('DOMContentLoaded', async function() {
  try {
    const res = await fetch('/api/admin/username');
    const jsonInfo = await res.json();
    const nameElement = document.querySelector('.admin-info h3');
    const headNameElement = document.querySelector('.head-admin-name');
    
    if (headNameElement) {
      headNameElement.textContent = jsonInfo.username;
    }
    
    if (nameElement) {
      nameElement.textContent = jsonInfo.username;
    }
  } 
  catch (error) {
    console.log('Could not get admin name');
  }
});