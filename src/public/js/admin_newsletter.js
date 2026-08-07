document.addEventListener('DOMContentLoaded', function () {
  var pendingList = document.getElementById('pending-list');
  var publishedList = document.getElementById('published-list');
  var allNewsletters = [];

  function formatDate(dateStr) {
    var d = new Date(dateStr);
    if (isNaN(d)) return 'N/A';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text == null ? '' : text;
    return div.innerHTML;
  }

  // Bodies are stored as HTML from the editor, so take the words out before
  // trimming: slicing the markup would leave a half-written tag on screen.
  // DOMParser neither runs scripts nor fetches anything while parsing.
  function toPlainText(html) {
    if (!html) return '';
    // Closing block tags imply a space, otherwise textContent runs the last word
    // of a heading straight into the paragraph after it.
    var spaced = html.replace(/<\/(p|div|h[1-6]|li|ul|ol|blockquote)>|<br\s*\/?>/gi, ' ');
    var parsed = new DOMParser().parseFromString(spaced, 'text/html');
    return (parsed.body.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function preview(content) {
    var text = toPlainText(content);
    if (text.length > 120) text = text.slice(0, 120) + '...';
    return escapeHtml(text);
  }

  function pendingRow(news) {
    var row = document.createElement('div');
    row.className = 'newsletter-row';
    row.setAttribute('data-id', news._id);
    row.setAttribute('data-search', ((news.title || '') + ' ' + toPlainText(news.content)).toLowerCase());

    row.innerHTML = '' +
      '<div class="newsletter-info">' +
      '  <h3>' + escapeHtml(news.title) + '</h3>' +
      '  <p>' + preview(news.content) + '</p>' +
      '</div>' +
      '<div class="user-stat">' +
      '  <h3>' + escapeHtml(news.author || 'N/A') + '</h3>' +
      '  <p>Author</p>' +
      '</div>' +
      '<div class="user-stat">' +
      '  <h3>' + formatDate(news.date) + '</h3>' +
      '  <p>Date Created</p>' +
      '</div>' +
      '<div class="review-actions">' +
      '  <button class="action-circle approve" data-action="approve" data-id="' + news._id + '" title="Publish">' +
      '    <i class="fa-solid fa-check"></i>' +
      '  </button>' +
      '  <button class="action-circle reject" data-action="delete" data-id="' + news._id + '" title="Delete">' +
      '    <i class="fa-solid fa-xmark"></i>' +
      '  </button>' +
      '</div>';

    return row;
  }

  function publishedRow(news) {
    var row = document.createElement('div');
    row.className = 'newsletter-row';
    row.setAttribute('data-id', news._id);
    row.setAttribute('data-search', ((news.title || '') + ' ' + toPlainText(news.content)).toLowerCase());

    row.innerHTML = '' +
      '<div class="newsletter-info">' +
      '  <h3>' + escapeHtml(news.title) + '</h3>' +
      '  <p>' + preview(news.content) + '</p>' +
      '</div>' +
      '<div class="user-stat">' +
      '  <h3>' + escapeHtml(news.author || 'N/A') + '</h3>' +
      '  <p>Author</p>' +
      '</div>' +
      '<div class="user-stat">' +
      '  <h3>' + formatDate(news.date) + '</h3>' +
      '  <p>Date Published</p>' +
      '</div>' +
      '<div class="dropdown-btn">' +
      '  <button class="more-btn">&#8942;</button>' +
      '  <div class="dropdown-content">' +
      '    <button data-action="edit" data-id="' + news._id + '">Edit</button>' +
      '    <button data-action="unpublish" data-id="' + news._id + '">Unpublish</button>' +
      '    <button data-action="delete" data-id="' + news._id + '">Delete</button>' +
      '  </div>' +
      '</div>';

    return row;
  }

  function render() {
    var pending = allNewsletters.filter(function (n) { return !n.isPublished; });
    var published = allNewsletters.filter(function (n) { return n.isPublished; });

    pendingList.innerHTML = '';
    publishedList.innerHTML = '';

    if (!pending.length) {
      pendingList.innerHTML = '<p class="empty-list">No pending newsletters.</p>';
    } else {
      pending.forEach(function (n) { pendingList.appendChild(pendingRow(n)); });
    }

    if (!published.length) {
      publishedList.innerHTML = '<p class="empty-list">No published newsletters yet.</p>';
    } else {
      published.forEach(function (n) { publishedList.appendChild(publishedRow(n)); });
    }

    applySearch(document.getElementById('pending-search'));
    applySearch(document.getElementById('published-search'));
  }

  function fetchNewsletters() {
    fetch('/api/announcements/all')
      .then(function (res) {
        if (res.status === 401) {
          window.location.href = '/admin_login.html?error=Unauthorized';
          return null;
        }
        return res.json();
      })
      .then(function (data) {
        if (!data) return;
        allNewsletters = data.newsletters || [];
        render();
      })
      .catch(function () {
        pendingList.innerHTML = '<p class="empty-list">Could not reach the server.</p>';
        publishedList.innerHTML = '';
      });
  }

  function patchNewsletter(id, body) {
    return fetch('/api/announcements/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (res) { return res.json(); });
  }

  // SEARCH
  function applySearch(input) {
    if (!input) return;
    var term = input.value.trim().toLowerCase();
    var list = document.getElementById(input.getAttribute('data-target'));
    if (!list) return;

    list.querySelectorAll('.newsletter-row').forEach(function (row) {
      var haystack = row.getAttribute('data-search') || '';
      row.style.display = haystack.indexOf(term) !== -1 ? '' : 'none';
    });
  }

  document.querySelectorAll('.manage-search input').forEach(function (input) {
    input.addEventListener('input', function () { applySearch(input); });
  });

  // ROW ACTIONS
  document.body.addEventListener('click', function (event) {
    var moreButton = event.target.closest('.more-btn');
    if (moreButton) {
      var dropdown = moreButton.parentElement.querySelector('.dropdown-content');
      document.querySelectorAll('.dropdown-content.show').forEach(function (open) {
        if (open !== dropdown) open.classList.remove('show');
      });
      if (dropdown) dropdown.classList.toggle('show');
      return;
    }

    var actionButton = event.target.closest('[data-action]');
    if (!actionButton) {
      document.querySelectorAll('.dropdown-content.show').forEach(function (open) {
        open.classList.remove('show');
      });
      return;
    }

    var action = actionButton.getAttribute('data-action');
    var id = actionButton.getAttribute('data-id');

    if (action === 'edit') {
      window.location.href = '/post-newsletter.html?id=' + id;
      return;
    }

    if (action === 'approve') {
      patchNewsletter(id, { isPublished: true, date: new Date().toISOString() })
        .then(function (data) {
          if (data.error) alert(data.error);
          else fetchNewsletters();
        })
        .catch(function () { alert('Failed to publish newsletter.'); });
      return;
    }

    if (action === 'unpublish') {
      patchNewsletter(id, { isPublished: false })
        .then(function (data) {
          if (data.error) alert(data.error);
          else fetchNewsletters();
        })
        .catch(function () { alert('Failed to unpublish newsletter.'); });
      return;
    }

    if (action === 'delete') {
      if (!confirm('Are you sure you want to delete this newsletter?')) return;

      fetch('/api/announcements/' + id, { method: 'DELETE' })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data.error) alert(data.error);
          else fetchNewsletters();
        })
        .catch(function () { alert('Failed to delete newsletter.'); });
    }
  });

  fetchNewsletters();
});
