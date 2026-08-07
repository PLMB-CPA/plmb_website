document.addEventListener('DOMContentLoaded', function () {
  var listEl = document.getElementById('inquiry-list');
  var searchInput = document.getElementById('ticket-search');
  var filterToggle = document.getElementById('filter-toggle');
  var filterMenu = document.getElementById('filter-menu');
  var answeredRadios = document.querySelectorAll('input[name="answeredFilter"]');
  var readRadios = document.querySelectorAll('input[name="readFilter"]');
  var archiveRadios = document.querySelectorAll('input[name="archiveFilter"]');
  var resetFiltersBtn = document.getElementById('reset-filters');

  var allInquiries = [];
  var currentAnsweredFilter = 'all';
  var currentReadFilter = 'all';
  var currentArchiveFilter = 'all';
  var currentSearchTerm = '';

  function formatDate(dateStr) {
    var d = new Date(dateStr);
    if (isNaN(d)) return 'N/A';
    return d.toISOString().slice(0, 10);
  }

  function renderInquiries() {
    var filtered = allInquiries.filter(function (inq) {
      if (currentAnsweredFilter === 'answered' && !inq.isAnswered) return false;
      if (currentAnsweredFilter === 'unanswered' && inq.isAnswered) return false;
      if (currentReadFilter === 'read' && !inq.isRead) return false;
      if (currentReadFilter === 'unread' && inq.isRead) return false;
      if (currentArchiveFilter === 'archived' && !inq.isArchived) return false;
      if (currentArchiveFilter === 'unarchived' && inq.isArchived) return false;
      if (currentSearchTerm && (inq.ticketNumber || '').toLowerCase().indexOf(currentSearchTerm) === -1) return false;
      return true;
    });

    listEl.innerHTML = '';

    if (!filtered.length) {
      listEl.innerHTML = '<p class="no-inquiries">No inquiries found.</p>';
      return;
    }

    filtered.forEach(function (inq) {
      var statusClass = inq.isAnswered ? 'resolved' : 'unresolved';
      var statusLabel = inq.isAnswered ? 'Resolved' : 'Unresolved';

      var row = document.createElement('div');
      row.className = 'inquiry-container';
      row.setAttribute('data-id', inq._id);

      row.innerHTML = '' +
        '<p class="inquiry-ticket-id">' + (inq.ticketNumber || '') + '</p>' +
        '<div class="inquiry-labels">' +
        '  <p class="inquiry-category-bubble">' + inq.category + '</p>' +
        '  <p class="inquiry-subcat-bubble">' + inq.industrySector + '</p>' +
        '</div>' +
        '<div class="divider" id="divider-left"></div>' +
        '<div class="text-content">' +
        '  <div class="inquiry-top-text">' +
        '    <p class="inquiry-business">' + inq.businessName + '</p>' +
        '    <p class="dash-divider">-</p>' +
        '    <p class="inquiry-title">' + inq.subject + '</p>' +
        '  </div>' +
        '  <div class="inquiry-bottom-text">' +
        '    <p class="inquiry-content">' + inq.message + '</p>' +
        '  </div>' +
        '</div>' +
        '<div class="divider"></div>' +
        '<div class="inquiry-right-side">' +
        '  <p class="inquiry-date">' + formatDate(inq.date) + '</p>' +
        '  <p class="inquiry-status ' + statusClass + '">' + statusLabel + '</p>' +
        '  <div class="inquiry-buttons">' +
        '    <button type="button" class="delete-btn" data-id="' + inq._id + '"><i class="fa-solid fa-trash"></i></button>' +
        '  </div>' +
        '</div>';

      listEl.appendChild(row);
    });
  }

  function fetchInquiries() {
    fetch('/api/inquiries')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        allInquiries = data.inquiries || [];
        renderInquiries();
      })
      .catch(function () {
        listEl.innerHTML = '<p class="no-inquiries">Could not reach the server.</p>';
      });
  }

  filterToggle.addEventListener('click', function (e) {
    e.stopPropagation();
    filterMenu.classList.toggle('show');
  });

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.filter-dropdown')) {
      filterMenu.classList.remove('show');
    }
  });

  answeredRadios.forEach(function (radio) {
    radio.addEventListener('change', function () {
      currentAnsweredFilter = radio.value;
      renderInquiries();
    });
  });

  readRadios.forEach(function (radio) {
    radio.addEventListener('change', function () {
      currentReadFilter = radio.value;
      renderInquiries();
    });
  });

  archiveRadios.forEach(function (radio) {
    radio.addEventListener('change', function () {
      currentArchiveFilter = radio.value;
      renderInquiries();
    });
  });

  listEl.addEventListener('click', function (e) {
    var delBtn = e.target.closest('.delete-btn');
    if (delBtn) {
      var id = delBtn.getAttribute('data-id');
      var confirmed = confirm('Delete this inquiry? This cannot be undone.');
      if (!confirmed) return;

      fetch('/api/inquiries/' + id, { method: 'DELETE' })
          .then(function (res) { return res.json(); })
          .then(function (data) {
          if (data.error) {
              alert(data.error);
              return;
          }
          allInquiries = allInquiries.filter(function (inq) { return inq._id !== id; });
          renderInquiries();
          })
          .catch(function () {
          alert('Could not reach the server.');
          });
      return;
    }

    var row = e.target.closest('.inquiry-container');
    if (row) {
      var rowId = row.getAttribute('data-id');
      if (rowId) window.location.href = '/inquiry-full.html?id=' + rowId;
    }
  });

  resetFiltersBtn.addEventListener('click', function () {
    currentAnsweredFilter = 'all';
    currentReadFilter = 'all';
    currentArchiveFilter = 'all';

    document.querySelector('input[name="answeredFilter"][value="all"]').checked = true;
    document.querySelector('input[name="readFilter"][value="all"]').checked = true;
    document.querySelector('input[name="archiveFilter"][value="all"]').checked = true;

    renderInquiries();
  });

  fetchInquiries();
});