document.addEventListener('DOMContentLoaded', function () {
  var listEl = document.getElementById('inquiry-list');
  var tabs = document.querySelectorAll('.inquiry-tabs .tab');
  var allInquiries = [];
  var currentFilter = 'all';

  function formatDate(dateStr) {
    var d = new Date(dateStr);
    if (isNaN(d)) return 'N/A';
    return d.toISOString().slice(0, 10);
  }

  function updateTabCounts() {
    var counts = { all: allInquiries.length, resolved: 0, unresolved: 0 };
    allInquiries.forEach(function (inq) {
      if (inq.isAnswered) counts.resolved++;
      else counts.unresolved++;
    });

    tabs.forEach(function (tab) {
      var filter = tab.getAttribute('data-filter');
      var span = tab.querySelector('span');
      if (span && counts[filter] !== undefined) span.textContent = counts[filter];
    });
  }

  function renderInquiries() {
    var filtered = allInquiries.filter(function (inq) {
      if (currentFilter === 'resolved') return inq.isAnswered;
      if (currentFilter === 'unresolved') return !inq.isAnswered;
      return true;
    });

    listEl.innerHTML = '';

    if (!filtered.length) {
      listEl.innerHTML = '<p class="no-inquiries">No inquiries found.</p>';
      updateTabCounts();
      return;
    }

    filtered.forEach(function (inq) {
      var statusClass = inq.isAnswered ? 'resolved' : 'unresolved';
      var statusLabel = inq.isAnswered ? 'Resolved' : 'Unresolved';

      var row = document.createElement('div');
      row.className = 'inquiry-container';

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
        '  <a href="/inquiry-full.html?id=' + inq._id + '" class="manage-btn">Manage</a>' +
        '</div>';

      listEl.appendChild(row);
    });

    updateTabCounts();
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

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      currentFilter = tab.getAttribute('data-filter');
      renderInquiries();
    });
  });

  fetchInquiries();
});