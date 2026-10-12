import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import AdminHeader from './AdminHeader';
import './PostNewsletter.css';

// Replaces src/views/post-newsletter.html + public/js/post-newsletter.js
//
//   /admin/newsletters/new        -> write a new newsletter (saved as pending)
//   /admin/newsletters/:id/edit   -> edit an existing one   (old: post-newsletter.html?id=...)
//
// About the editor: the body is a contentEditable <div> driven by
// document.execCommand, exactly like the old page. React must NOT manage that
// div's contents through state, because re-rendering it would reset the caret
// on every keystroke. So the editor is wired up the old way, through a ref and
// event listeners added in useEffect; React only renders the surrounding form.

// A toolbar button that runs one execCommand on the editor.
// onMouseDown preventDefault keeps the caret in the editor while clicking.
function Cmd({ command, active, onRun, className = '', title, children }) {
    return (
        <button type="button" title={title}
            className={`tb-btn ${className} ${active ? 'active' : ''}`}
            onMouseDown={e => e.preventDefault()} onClick={() => onRun(command)}>
            {children}
        </button>
    );
}

function PostNewsletter() {
    const { id: editId } = useParams();
    const { username } = useOutletContext();
    const navigate = useNavigate();

    const [title, setTitle] = useState('');
    const [image, setImage] = useState('');
    const [showImage, setShowImage] = useState(false);
    const [status, setStatus] = useState({ message: '', isError: false });
    const [saving, setSaving] = useState(false);
    const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false, underline: false });

    const contentRef = useRef(null);   // the contentEditable div
    const savedRange = useRef(null);   // caret/selection to restore after a toolbar click
    // Baseline for the unsaved-changes check on the back button
    const saved = useRef({ title: '', content: '', image: '' });

    // ===== SELECTION HELPERS =====

    // Toolbar clicks would otherwise move focus out of the editor and lose the selection
    const rememberSelection = useCallback(() => {
        const editor = contentRef.current;
        const selection = window.getSelection();
        if (!editor || !selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        // Clone it: the live range is collapsed by removeAllRanges() in restoreSelection
        if (editor.contains(range.commonAncestorContainer)) savedRange.current = range.cloneRange();
    }, []);

    const restoreSelection = useCallback(() => {
        const editor = contentRef.current;
        if (!savedRange.current) {
            editor.focus();
            return;
        }
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(savedRange.current);
        editor.focus();
    }, []);

    // Light up B / I / U when they apply at the caret
    const refreshToolbar = useCallback(() => {
        const state = {};
        ['bold', 'italic', 'underline'].forEach(command => {
            try { state[command] = document.queryCommandState(command); }
            catch { state[command] = false; }
        });
        setActiveFormats(state);
    }, []);

    // Turning paragraphs into a list leaves the <ul> inside its <p>, which is invalid
    // HTML; the browser re-parses it differently when the newsletter is loaded back,
    // which is what made backspace inside lists misbehave. Lift the list back out.
    const normalizeLists = useCallback(() => {
        const editor = contentRef.current;
        editor.querySelectorAll('p > ul, p > ol').forEach(list => {
            const paragraph = list.parentNode;
            paragraph.parentNode.insertBefore(list, paragraph);
            if (!paragraph.textContent.trim() && !paragraph.querySelector('img, br')) {
                paragraph.remove();
            }
        });
    }, []);

    const afterEdit = useCallback(() => {
        normalizeLists();
        rememberSelection();
        refreshToolbar();
    }, [normalizeLists, rememberSelection, refreshToolbar]);

    const run = useCallback((command, value) => {
        restoreSelection();
        document.execCommand(command, false, value || null);
        afterEdit();
    }, [restoreSelection, afterEdit]);

    // ===== KEYBOARD / PASTE BEHAVIOUR (same rules as the old editor) =====

    useEffect(() => {
        const editor = contentRef.current;

        // Ask for <b>/<i>/<u> tags instead of inline style spans: smaller markup
        // that the server's sanitizer allows
        try { document.execCommand('styleWithCSS', false, false); } catch { /* not supported */ }

        // The <li> the caret is in, or null when outside a list
        function currentListItem() {
            const selection = window.getSelection();
            if (!selection.rangeCount) return null;
            const node = selection.getRangeAt(0).startContainer;
            const element = node.nodeType === 1 ? node : node.parentElement;
            const item = element && element.closest ? element.closest('li') : null;
            return item && editor.contains(item) ? item : null;
        }

        // True when no text in this list item comes before the caret.
        // (A leading <br> left over from splitting an item doesn't count as text.)
        function caretAtStartOfItem(item) {
            const selection = window.getSelection();
            if (!selection.rangeCount) return false;
            const range = selection.getRangeAt(0);
            const probe = document.createRange();
            probe.selectNodeContents(item);
            try { probe.setEnd(range.startContainer, range.startOffset); }
            catch { return false; }
            return probe.toString().trim().length === 0;
        }

        function onKeyDown(event) {
            // Backspace at the start of a list item joins it to the item above,
            // like a word processor (the browser's default mangles the list)
            if (event.key === 'Backspace') {
                const selection = window.getSelection();
                if (!selection.isCollapsed) return;
                const item = currentListItem();
                if (!item || !caretAtStartOfItem(item)) return;

                const previous = item.previousElementSibling;
                event.preventDefault();

                // First item: step out of the list instead of merging upwards
                if (!previous || previous.tagName !== 'LI') {
                    document.execCommand('outdent');
                    afterEdit();
                    return;
                }

                const joinAfter = previous.lastChild;
                while (item.firstChild) previous.appendChild(item.firstChild);
                item.remove();

                const range = document.createRange();
                if (!joinAfter) range.setStart(previous, 0);
                else if (joinAfter.nodeType === 3) range.setStart(joinAfter, joinAfter.textContent.length);
                else range.setStartAfter(joinAfter);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
                afterEdit();
                return;
            }

            // Tab indents, Shift+Tab outdents. Outside lists the browser wraps the
            // block in a <blockquote> with an inline style the sanitizer strips, so
            // drop the style and let the stylesheet do the indenting.
            if (event.key === 'Tab') {
                event.preventDefault();
                document.execCommand(event.shiftKey ? 'outdent' : 'indent');
                editor.querySelectorAll('blockquote[style]').forEach(q => q.removeAttribute('style'));
                afterEdit();
                return;
            }

            if (event.key === 'Enter') {
                // Shift+Enter: line break instead of a new paragraph / list item
                if (event.shiftKey) {
                    event.preventDefault();
                    if (!document.execCommand('insertLineBreak')) {
                        document.execCommand('insertHTML', false, '<br>');
                    }
                    rememberSelection();
                    return;
                }
                // Enter on an empty bullet leaves the list
                const item = currentListItem();
                if (item && !item.textContent.trim()) {
                    event.preventDefault();
                    document.execCommand('outdent');
                    afterEdit();
                }
            }
        }

        // Paste as plain text (Word/browser markup would be stripped anyway)
        function onPaste(event) {
            event.preventDefault();
            const text = (event.clipboardData || window.clipboardData).getData('text/plain');
            document.execCommand('insertText', false, text);
        }

        // selectionchange is the reliable "caret moved" signal (keyup/mouseup can
        // fire before the selection updates, which left savedRange one step behind)
        function onSelectionChange() {
            if (document.activeElement !== editor) return;
            rememberSelection();
            refreshToolbar();
        }

        editor.addEventListener('keydown', onKeyDown);
        editor.addEventListener('paste', onPaste);
        editor.addEventListener('keyup', rememberSelection);
        editor.addEventListener('mouseup', rememberSelection);
        editor.addEventListener('focus', rememberSelection);
        document.addEventListener('selectionchange', onSelectionChange);

        return () => {
            editor.removeEventListener('keydown', onKeyDown);
            editor.removeEventListener('paste', onPaste);
            editor.removeEventListener('keyup', rememberSelection);
            editor.removeEventListener('mouseup', rememberSelection);
            editor.removeEventListener('focus', rememberSelection);
            document.removeEventListener('selectionchange', onSelectionChange);
        };
    }, [afterEdit, rememberSelection, refreshToolbar]);

    // ===== EDIT MODE: load the existing newsletter =====

    useEffect(() => {
        if (!editId) return;
        fetch(`/api/announcements/${editId}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    setStatus({ message: data.error, isError: true });
                    return;
                }
                const n = data.newsletter;
                setTitle(n.title || '');
                contentRef.current.innerHTML = n.content || '';
                setImage(n.image || '');
                setShowImage(Boolean(n.image));
                // The freshly loaded newsletter is the "unchanged" baseline
                saved.current = {
                    title: (n.title || '').trim(),
                    content: contentRef.current.innerHTML.trim(),
                    image: (n.image || '').trim(),
                };
            })
            .catch(() => setStatus({ message: 'Could not load this newsletter.', isError: true }));
    }, [editId]);

    // ===== TOOLBAR ACTIONS =====

    // Clear formatting. removeFormat alone leaves headings, lists and alignment,
    // which made the button look broken, so undo those too.
    function clearFormatting() {
        restoreSelection();
        document.execCommand('removeFormat');
        if (document.queryCommandState('insertUnorderedList')) document.execCommand('insertUnorderedList');
        if (document.queryCommandState('insertOrderedList')) document.execCommand('insertOrderedList');
        document.execCommand('formatBlock', false, '<p>');
        document.execCommand('justifyLeft');
        // Tidy the leftover style="" / redundant left alignment
        contentRef.current.querySelectorAll('[style]').forEach(node => {
            const value = node.getAttribute('style').replace(/\s/g, '');
            if (value === '' || value === 'text-align:left;' || value === 'text-align:left') {
                node.removeAttribute('style');
            }
        });
        afterEdit();
    }

    function insertLink() {
        rememberSelection();
        const url = window.prompt('Link address:', 'https://');
        if (url) run('createLink', url);
    }

    // Keeps the caret in the editor when a toolbar button is pressed
    const keepFocus = event => event.preventDefault();

    // ===== BACK / SAVE =====

    function hasUnsavedChanges() {
        return title.trim() !== saved.current.title
            || contentRef.current.innerHTML.trim() !== saved.current.content
            || image.trim() !== saved.current.image;
    }

    function goBack() {
        if (hasUnsavedChanges() && !window.confirm('You have unsaved changes. Leave without saving?')) return;
        navigate('/admin/newsletters');
    }

    async function save() {
        const editor = contentRef.current;
        const trimmedTitle = title.trim();

        if (!trimmedTitle) {
            setStatus({ message: 'Please add a subject.', isError: true });
            return;
        }
        // An "empty" contentEditable can still hold a <br>
        if (!editor.textContent.trim()) {
            setStatus({ message: 'Please add some content.', isError: true });
            editor.focus();
            return;
        }

        const body = { title: trimmedTitle, content: editor.innerHTML.trim(), image: image.trim() };
        if (!editId) {
            // New newsletters start unpublished so they land in Pending for review
            body.author = username || '';
            body.isPublished = false;
        }

        setSaving(true);
        setStatus({ message: 'Saving...', isError: false });

        try {
            const res = await fetch(editId ? `/api/announcements/${editId}` : '/api/announcements', {
                method: editId ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.error) {
                setStatus({ message: data.error, isError: true });
                setSaving(false);
                return;
            }
            navigate('/admin/newsletters');
        } catch {
            setStatus({ message: 'Could not reach the server.', isError: true });
            setSaving(false);
        }
    }

    return (
        <div className="post-newsletter-page">
            <AdminHeader />

            <div className="newsletter-container">
                <button type="button" className="news-back" onClick={goBack}>&#8592; Back to newsletters</button>

                <input type="text" className="news-subject" placeholder="Subject"
                    value={title} onChange={e => setTitle(e.target.value)} />

                <div className="news-toolbar">
                    <select className="tb-select" title="Paragraph style" defaultValue="p"
                        onChange={e => run('formatBlock', `<${e.target.value}>`)}>
                        <option value="p">Normal text</option>
                        <option value="h2">Heading</option>
                        <option value="h3">Subheading</option>
                    </select>

                    <select className="tb-select" title="Font size" value=""
                        onChange={e => { if (e.target.value) run('fontSize', e.target.value); }}>
                        <option value="">Size</option>
                        <option value="2">Small</option>
                        <option value="3">Normal</option>
                        <option value="5">Large</option>
                        <option value="6">Extra large</option>
                    </select>

                    <span className="tb-divider"></span>

                    <Cmd command="bold" active={activeFormats.bold} onRun={run} className="tb-bold" title="Bold">B</Cmd>
                    <Cmd command="italic" active={activeFormats.italic} onRun={run} className="tb-italic" title="Italic">I</Cmd>
                    <Cmd command="underline" active={activeFormats.underline} onRun={run} className="tb-underline" title="Underline">U</Cmd>

                    <span className="tb-divider"></span>

                    <Cmd command="insertUnorderedList" onRun={run} title="Bulleted list">&bull; List</Cmd>
                    <Cmd command="insertOrderedList" onRun={run} title="Numbered list">1. List</Cmd>
                    <button type="button" className="tb-btn" title="Remove formatting from the selected text"
                        onMouseDown={keepFocus} onClick={clearFormatting}>Clear</button>

                    <span className="tb-divider"></span>

                    <Cmd command="justifyLeft" onRun={run} title="Align left">&#8676;</Cmd>
                    <Cmd command="justifyCenter" onRun={run} title="Align center">&#8596;</Cmd>
                    <Cmd command="justifyRight" onRun={run} title="Align right">&#8677;</Cmd>

                    <span className="tb-divider"></span>

                    <button type="button" className="tb-btn" title="Insert link"
                        onMouseDown={keepFocus} onClick={insertLink}>Link</button>
                </div>

                {/* Filled and read through contentRef, never through React state (see top of file) */}
                <div ref={contentRef} className="news-content" contentEditable
                    suppressContentEditableWarning data-placeholder="Type your text here..." />

                {/* No file upload endpoint yet, so the image is a URL */}
                {showImage && (
                    <input type="url" className="news-image" placeholder="Image URL (https://...)" autoFocus
                        value={image} onChange={e => setImage(e.target.value)} />
                )}
                <button type="button" className="upload-img" onClick={() => setShowImage(!showImage)}>
                    {showImage ? 'Hide image' : 'Add image'}
                </button>

                <p className={`news-status${status.isError ? ' error' : ''}`}>{status.message}</p>

                <input type="submit" className="news-submit" disabled={saving} onClick={save}
                    value={editId ? 'Save Changes' : 'Submit for Review'} />
            </div>
        </div>
    );
}

export default PostNewsletter;
