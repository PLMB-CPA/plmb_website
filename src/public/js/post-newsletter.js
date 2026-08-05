document.addEventListener('DOMContentLoaded', function () {
  var subjectEl = document.getElementById('news-subject');
  var contentEl = document.getElementById('news-content');
  var imageEl = document.getElementById('news-image');
  var toggleImageEl = document.getElementById('toggle-image');
  var submitEl = document.getElementById('news-submit');
  var statusEl = document.getElementById('news-status');

  var editId = new URLSearchParams(window.location.search).get('id');

  function setStatus(message, isError) {
    statusEl.textContent = message;
    statusEl.className = 'news-status' + (isError ? ' error' : '');
  }

  // IMAGE FIELD (no file upload endpoint yet, so this takes a URL)
  toggleImageEl.addEventListener('click', function () {
    imageEl.hidden = !imageEl.hidden;
    toggleImageEl.textContent = imageEl.hidden ? 'Add image' : 'Hide image';
    if (!imageEl.hidden) imageEl.focus();
  });

  // EDIT MODE: load the existing newsletter into the form
  if (editId) {
    submitEl.value = 'Save Changes';

    fetch('/api/announcements/' + editId)
      .then(function (res) {
        if (res.status === 401) {
          window.location.href = '/admin_login.html?error=Unauthorized';
          return null;
        }
        return res.json();
      })
      .then(function (data) {
        if (!data) return;
        if (data.error) {
          setStatus(data.error, true);
          return;
        }

        subjectEl.value = data.newsletter.title || '';
        contentEl.value = data.newsletter.content || '';

        if (data.newsletter.image) {
          imageEl.value = data.newsletter.image;
          imageEl.hidden = false;
          toggleImageEl.textContent = 'Hide image';
        }
      })
      .catch(function () {
        setStatus('Could not load this newsletter.', true);
      });
  }

  function save() {
    var title = subjectEl.value.trim();
    var content = contentEl.value.trim();

    if (!title) {
      setStatus('Please add a subject.', true);
      subjectEl.focus();
      return;
    }

    if (!content) {
      setStatus('Please add some content.', true);
      contentEl.focus();
      return;
    }

    var body = { title: title, content: content, image: imageEl.value.trim() };

    submitEl.disabled = true;
    setStatus('Saving...', false);

    // New newsletters are created unpublished so they land in the Pending list
    // on admin_newsletter.html, where an admin approves or rejects them.
    var request = editId
      ? fetch('/api/announcements/' + editId, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
      : fetch('/api/admin/username')
          .then(function (res) { return res.json(); })
          .then(function (info) {
            body.author = info.username || '';
            body.isPublished = false;
            return fetch('/api/announcements', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body)
            });
          });

    request
      .then(function (res) {
        if (res.status === 401) {
          window.location.href = '/admin_login.html?error=Unauthorized';
          return null;
        }
        return res.json();
      })
      .then(function (data) {
        if (!data) return;

        if (data.error) {
          setStatus(data.error, true);
          submitEl.disabled = false;
          return;
        }

        window.location.href = '/admin_newsletter.html';
      })
      .catch(function () {
        setStatus('Could not reach the server.', true);
        submitEl.disabled = false;
      });
  }

  submitEl.addEventListener('click', save);
});
