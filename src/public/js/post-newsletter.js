document.addEventListener('DOMContentLoaded', function () {
  var subjectEl = document.getElementById('news-subject');
  var contentEl = document.getElementById('news-content');
  var imageEl = document.getElementById('news-image');
  var toggleImageEl = document.getElementById('toggle-image');
  var submitEl = document.getElementById('news-submit');
  var statusEl = document.getElementById('news-status');
  var toolbarEl = document.getElementById('news-toolbar');
  var blockSelect = document.getElementById('tb-block');
  var sizeSelect = document.getElementById('tb-size');
  var linkBtn = document.getElementById('tb-link');
  var clearBtn = document.getElementById('tb-clear');
  var backBtn = document.getElementById('news-back');

  var editId = new URLSearchParams(window.location.search).get('id');

  // Baseline for the unsaved-changes check on the back button. Reset once an
  // existing newsletter finishes loading, so opening an edit and leaving it
  // untouched does not count as a change.
  var savedTitle = '';
  var savedContent = '';
  var savedImage = '';

  function hasUnsavedChanges() {
    return subjectEl.value.trim() !== savedTitle ||
           contentEl.innerHTML.trim() !== savedContent ||
           imageEl.value.trim() !== savedImage;
  }

  function setStatus(message, isError) {
    statusEl.textContent = message;
    statusEl.className = 'news-status' + (isError ? ' error' : '');
  }

  // TEXT EDITOR
  //
  // The content box is a contenteditable div driven by document.execCommand.
  // execCommand is formally deprecated but still works everywhere and needs no
  // library.

  // Ask the browser for <b>/<i>/<u> tags rather than inline style spans, which
  // keeps the saved markup small and easy for the sanitizer to allow.
  try {
    document.execCommand('styleWithCSS', false, false);
  } catch (e) {
    // Not supported in this browser; tags below still work.
  }

  // Toolbar clicks would otherwise move focus out of the editor and collapse the
  // selection
  var savedRange = null;

  function rememberSelection() {
    var selection = window.getSelection();
    if (!selection.rangeCount) return;
    var range = selection.getRangeAt(0);
    // Clone it: the live range from getRangeAt is collapsed by the
    // removeAllRanges() in restoreSelection, which would lose the highlight.
    if (contentEl.contains(range.commonAncestorContainer)) savedRange = range.cloneRange();
  }

  function restoreSelection() {
    if (!savedRange) {
      contentEl.focus();
      return;
    }
    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(savedRange);
    contentEl.focus();
  }

  // Turning paragraphs into a list leaves the <ul> inside the <p> it came from,
  // which is invalid HTML. The browser tolerates it live but re-parses it
  // differently when the newsletter is loaded back, so the list the editor shows
  // and the list that was saved disagree. That mismatch is what makes backspace
  // inside a list behave unpredictably. Lift the list back out.
  function normalizeLists() {
    var nested = contentEl.querySelectorAll('p > ul, p > ol');
    Array.prototype.forEach.call(nested, function (list) {
      var paragraph = list.parentNode;
      paragraph.parentNode.insertBefore(list, paragraph);
      if (!paragraph.textContent.trim() && !paragraph.querySelector('img, br')) {
        paragraph.remove();
      }
    });
  }

  // The <li> the caret currently sits in, or null when outside a list.
  function currentListItem() {
    var selection = window.getSelection();
    if (!selection.rangeCount) return null;
    var node = selection.getRangeAt(0).startContainer;
    var element = node.nodeType === 1 ? node : node.parentElement;
    var item = element && element.closest ? element.closest('li') : null;
    return item && contentEl.contains(item) ? item : null;
  }

  function run(command, value) {
    restoreSelection();
    document.execCommand(command, false, value || null);
    normalizeLists();
    rememberSelection();
    refreshToolbar();
  }

  contentEl.addEventListener('keyup', rememberSelection);
  contentEl.addEventListener('mouseup', rememberSelection);
  contentEl.addEventListener('focus', rememberSelection);

  // Keep the caret where it is when a toolbar button is pressed.
  toolbarEl.addEventListener('mousedown', function (event) {
    if (event.target.classList.contains('tb-btn')) event.preventDefault();
  });

  toolbarEl.addEventListener('click', function (event) {
    var button = event.target.closest('.tb-btn');
    if (!button || !button.dataset.command) return;
    run(button.dataset.command);
  });

  blockSelect.addEventListener('change', function () {
    run('formatBlock', '<' + blockSelect.value + '>');
  });

  sizeSelect.addEventListener('change', function () {
    if (!sizeSelect.value) return;
    run('fontSize', sizeSelect.value);
    sizeSelect.value = '';
  });

  // Clear formatting.
  //
  // execCommand('removeFormat') only undoes inline formatting - bold, italic,
  // underline, font size. Headings, lists and alignment survive it untouched,
  // which made the button look like it did nothing. Undo those separately.
  clearBtn.addEventListener('click', function () {
    restoreSelection();

    document.execCommand('removeFormat');

    // Toggle off whichever list the caret is sitting in.
    if (document.queryCommandState('insertUnorderedList')) {
      document.execCommand('insertUnorderedList');
    }
    if (document.queryCommandState('insertOrderedList')) {
      document.execCommand('insertOrderedList');
    }

    // Headings and blockquotes back to ordinary paragraphs.
    document.execCommand('formatBlock', false, '<p>');
    document.execCommand('justifyLeft');

    // The commands above leave behind style="" or a redundant left alignment.
    Array.prototype.forEach.call(contentEl.querySelectorAll('[style]'), function (node) {
      var value = node.getAttribute('style').replace(/\s/g, '');
      if (value === '' || value === 'text-align:left;' || value === 'text-align:left') {
        node.removeAttribute('style');
      }
    });

    normalizeLists();
    rememberSelection();
    refreshToolbar();
  });

  linkBtn.addEventListener('click', function () {
    rememberSelection();
    var url = window.prompt('Link address:', 'https://');
    if (!url) return;
    run('createLink', url);
  });

  // Show which of bold/italic/underline apply at the caret.
  function refreshToolbar() {
    ['bold', 'italic', 'underline'].forEach(function (command) {
      var button = toolbarEl.querySelector('[data-command="' + command + '"]');
      if (!button) return;
      var active = false;
      try {
        active = document.queryCommandState(command);
      } catch (e) {
        active = false;
      }
      button.classList.toggle('active', active);
    });
  }

  // selectionchange is the authoritative signal that the caret moved: mouseup
  // and keyup can both fire before the browser has finished updating the
  // selection, which left savedRange one interaction behind. A toolbar click
  // then restored the previous position, so formatting landed on the word
  // before the one the caret was actually in, and the lit buttons described
  // that stale position too.
  document.addEventListener('selectionchange', function () {
    if (document.activeElement !== contentEl) return;
    rememberSelection();
    refreshToolbar();
  });

  // Shift+Enter inserts a line break instead of ending the block.
  //
  // Inside a list, plain Enter starts the next item, which is usually right but
  // gives no way to run a long item onto a second line without numbering it. In
  // a paragraph it likewise starts a new one. Browsers differ on whether they do
  // this by default inside contenteditable, so handle it explicitly.
  // True when no text in this list item comes before the caret.
  //
  // Splitting an item with Enter can leave the new one starting with a <br>
  // carried over from the split. That is an artifact, not content, so a leading
  // <br> must not stop the merge. Text is the only thing that counts: with
  // "abc<br>sdsdd", a caret before "sdsdd" still has "abc" ahead of it and is
  // correctly not treated as the start.
  function caretAtStartOfItem(item) {
    var selection = window.getSelection();
    if (!selection.rangeCount) return false;
    var range = selection.getRangeAt(0);
    var probe = document.createRange();
    probe.selectNodeContents(item);
    try {
      probe.setEnd(range.startContainer, range.startOffset);
    } catch (e) {
      return false;
    }
    return probe.toString().trim().length === 0;
  }

  // Backspace at the start of a list item joins it to the item above, the way a
  // word processor does. Left to the browser this instead shunts the number onto
  // the next line and leaves the list in a mess.
  contentEl.addEventListener('keydown', function (event) {
    if (event.key !== 'Backspace') return;

    var selection = window.getSelection();
    if (!selection.isCollapsed) return;      // deleting a highlighted range is normal

    var item = currentListItem();
    if (!item || !caretAtStartOfItem(item)) return;

    var previous = item.previousElementSibling;

    // First item in the list: step out of the list rather than merge upwards.
    if (!previous || previous.tagName !== 'LI') {
      event.preventDefault();
      document.execCommand('outdent');
      normalizeLists();
      rememberSelection();
      refreshToolbar();
      return;
    }

    event.preventDefault();

    // Remember the join point so the caret can sit exactly where the two met.
    var joinAfter = previous.lastChild;
    while (item.firstChild) previous.appendChild(item.firstChild);
    item.remove();

    var range = document.createRange();
    if (!joinAfter) {
      range.setStart(previous, 0);
    } else if (joinAfter.nodeType === 3) {
      range.setStart(joinAfter, joinAfter.textContent.length);
    } else {
      range.setStartAfter(joinAfter);
    }
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    normalizeLists();
    rememberSelection();
    refreshToolbar();
  });

  // Tab indents, Shift+Tab outdents.
  //
  // In a list this nests the bullet. In a paragraph the browser wraps the block
  // in a <blockquote> and puts the indent in an inline style, which the
  // sanitizer strips on save. The toolbar has no blockquote button, so every
  // blockquote here comes from indenting: drop the inline style and let the
  // stylesheet do the indenting, which survives saving.
  contentEl.addEventListener('keydown', function (event) {
    if (event.key !== 'Tab') return;
    event.preventDefault();
    document.execCommand(event.shiftKey ? 'outdent' : 'indent');
    Array.prototype.forEach.call(contentEl.querySelectorAll('blockquote[style]'), function (quote) {
      quote.removeAttribute('style');
    });
    normalizeLists();
    rememberSelection();
    refreshToolbar();
  });

  contentEl.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter') return;

    if (event.shiftKey) {
      event.preventDefault();
      if (!document.execCommand('insertLineBreak')) {
        document.execCommand('insertHTML', false, '<br>');
      }
      rememberSelection();
      return;
    }

    // Enter on an empty bullet leaves the list, which is how every other editor
    // behaves. Without it the only way out is backspacing into the item above,
    // and that is what was corrupting the list.
    var item = currentListItem();
    if (item && !item.textContent.trim()) {
      event.preventDefault();
      document.execCommand('outdent');
      normalizeLists();
      rememberSelection();
      refreshToolbar();
    }
  });

  // Paste as plain text. Copying out of Word or a browser drags in a large amount
  // of markup that the sanitizer would strip anyway
  contentEl.addEventListener('paste', function (event) {
    event.preventDefault();
    var text = (event.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, text);
  });

  // BACK BUTTON
  //
  // The only other ways off this page are submitting or a sidebar link, both of
  // which discard a half-written newsletter without warning. Ask first.
  backBtn.addEventListener('click', function () {
    if (hasUnsavedChanges() &&
        !window.confirm('You have unsaved changes. Leave without saving?')) {
      return;
    }
    window.location.href = '/admin_newsletter.html';
  });

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
        contentEl.innerHTML = data.newsletter.content || '';

        if (data.newsletter.image) {
          imageEl.value = data.newsletter.image;
          imageEl.hidden = false;
          toggleImageEl.textContent = 'Hide image';
        }

        // Treat the freshly loaded newsletter as the unmodified baseline.
        savedTitle = subjectEl.value.trim();
        savedContent = contentEl.innerHTML.trim();
        savedImage = imageEl.value.trim();
      })
      .catch(function () {
        setStatus('Could not load this newsletter.', true);
      });
  }

  function save() {
    var title = subjectEl.value.trim();
    var content = contentEl.innerHTML.trim();

    // An "empty" contenteditable still holds <br>
    var hasText = contentEl.textContent.trim().length > 0;

    if (!title) {
      setStatus('Please add a subject.', true);
      subjectEl.focus();
      return;
    }

    if (!hasText) {
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
