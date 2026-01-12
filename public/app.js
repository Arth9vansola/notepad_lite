// DOM Elements
const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const rawViewBtn = document.getElementById('rawViewBtn');
const markdownViewBtn = document.getElementById('markdownViewBtn');
const newNoteBtn = document.getElementById('newNoteBtn');
const shareBtn = document.getElementById('shareBtn');
const deleteBtn = document.getElementById('deleteBtn');
const statusText = document.getElementById('statusText');
const shareModal = document.getElementById('shareModal');
const shareLinkInput = document.getElementById('shareLinkInput');
const copyLinkBtn = document.getElementById('copyLinkBtn');
const closeModalBtn = document.getElementById('closeModalBtn');

// State
let currentNoteId = null;
let saveTimeout = null;
let currentView = 'raw';

// Initialize
async function init() {
    // Check if there's a note ID in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const noteId = urlParams.get('note');
    
    if (noteId) {
        await loadNote(noteId);
    } else {
        await createNewNote();
    }
    
    setupEventListeners();
}

// Setup Event Listeners
function setupEventListeners() {
    editor.addEventListener('input', handleEditorInput);
    rawViewBtn.addEventListener('click', () => switchView('raw'));
    markdownViewBtn.addEventListener('click', () => switchView('markdown'));
    newNoteBtn.addEventListener('click', handleNewNote);
    shareBtn.addEventListener('click', handleShare);
    deleteBtn.addEventListener('click', handleDelete);
    copyLinkBtn.addEventListener('click', handleCopyLink);
    closeModalBtn.addEventListener('click', () => shareModal.classList.add('hidden'));
    shareModal.addEventListener('click', (e) => {
        if (e.target === shareModal) {
            shareModal.classList.add('hidden');
        }
    });
}

// Handle editor input
function handleEditorInput() {
    updateStatus('Saving...');
    
    // Clear existing timeout
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }
    
    // Update markdown preview if in markdown view
    if (currentView === 'markdown') {
        updateMarkdownPreview();
    }
    
    // Save after 1 second of inactivity
    saveTimeout = setTimeout(async () => {
        await saveNote();
    }, 1000);
}

// Switch between raw and markdown view
function switchView(view) {
    currentView = view;
    
    if (view === 'raw') {
        rawViewBtn.classList.add('active');
        markdownViewBtn.classList.remove('active');
        editor.classList.remove('hidden');
        preview.classList.add('hidden');
    } else {
        rawViewBtn.classList.remove('active');
        markdownViewBtn.classList.add('active');
        editor.classList.add('hidden');
        preview.classList.remove('hidden');
        updateMarkdownPreview();
    }
}

// Update markdown preview
function updateMarkdownPreview() {
    const content = editor.value;
    preview.innerHTML = marked.parse(content);
}

// Create a new note
async function createNewNote() {
    try {
        updateStatus('Creating new note...');
        
        const response = await fetch('/api/notes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: '' })
        });
        
        if (!response.ok) {
            throw new Error('Failed to create note');
        }
        
        const note = await response.json();
        currentNoteId = note.id;
        editor.value = '';
        
        // Update URL without reloading
        const url = new URL(window.location);
        url.searchParams.set('note', currentNoteId);
        window.history.pushState({}, '', url);
        
        updateStatus('New note created');
    } catch (error) {
        console.error('Error creating note:', error);
        updateStatus('Error creating note');
    }
}

// Load a note
async function loadNote(noteId) {
    try {
        updateStatus('Loading note...');
        
        const response = await fetch(`/api/notes/${noteId}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                updateStatus('Note not found, creating new note...');
                await createNewNote();
                return;
            }
            throw new Error('Failed to load note');
        }
        
        const note = await response.json();
        currentNoteId = note.id;
        editor.value = note.content;
        
        updateStatus('Note loaded');
    } catch (error) {
        console.error('Error loading note:', error);
        updateStatus('Error loading note');
        await createNewNote();
    }
}

// Save a note
async function saveNote() {
    if (!currentNoteId) {
        return;
    }
    
    try {
        const content = editor.value;
        
        const response = await fetch(`/api/notes/${currentNoteId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });
        
        if (!response.ok) {
            throw new Error('Failed to save note');
        }
        
        updateStatus('Saved');
    } catch (error) {
        console.error('Error saving note:', error);
        updateStatus('Error saving');
    }
}

// Handle new note button
async function handleNewNote() {
    if (confirm('Create a new note? Your current note is already saved.')) {
        await createNewNote();
        switchView('raw');
    }
}

// Handle share button
function handleShare() {
    const shareUrl = `${window.location.origin}?note=${currentNoteId}`;
    shareLinkInput.value = shareUrl;
    shareModal.classList.remove('hidden');
}

// Handle copy link button
function handleCopyLink() {
    shareLinkInput.select();
    document.execCommand('copy');
    
    copyLinkBtn.textContent = 'Copied!';
    setTimeout(() => {
        copyLinkBtn.textContent = 'Copy';
    }, 2000);
}

// Handle delete button
async function handleDelete() {
    if (!confirm('Are you sure you want to delete this note? This cannot be undone.')) {
        return;
    }
    
    try {
        updateStatus('Deleting note...');
        
        const response = await fetch(`/api/notes/${currentNoteId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete note');
        }
        
        updateStatus('Note deleted');
        
        // Create a new note after deletion
        setTimeout(async () => {
            await createNewNote();
            switchView('raw');
        }, 500);
        
    } catch (error) {
        console.error('Error deleting note:', error);
        updateStatus('Error deleting note');
    }
}

// Update status text
function updateStatus(text) {
    statusText.textContent = text;
    
    // Clear status after 3 seconds
    if (text !== 'Ready' && text !== 'Saving...') {
        setTimeout(() => {
            statusText.textContent = 'Ready';
        }, 3000);
    }
}

// Initialize the app
init();
