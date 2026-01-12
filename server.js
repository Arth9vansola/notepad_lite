const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;
const NOTES_DIR = path.join(__dirname, 'notes');

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Ensure notes directory exists
async function ensureNotesDir() {
  try {
    await fs.access(NOTES_DIR);
  } catch {
    await fs.mkdir(NOTES_DIR, { recursive: true });
  }
}

// Get a note by ID
app.get('/api/notes/:id', async (req, res) => {
  try {
    const noteId = req.params.id;
    const notePath = path.join(NOTES_DIR, `${noteId}.json`);
    
    const data = await fs.readFile(notePath, 'utf-8');
    const note = JSON.parse(data);
    
    res.json(note);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'Note not found' });
    } else {
      res.status(500).json({ error: 'Failed to read note' });
    }
  }
});

// Create a new note
app.post('/api/notes', async (req, res) => {
  try {
    const noteId = uuidv4();
    const note = {
      id: noteId,
      content: req.body.content || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const notePath = path.join(NOTES_DIR, `${noteId}.json`);
    await fs.writeFile(notePath, JSON.stringify(note, null, 2));
    
    res.json(note);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// Update a note
app.put('/api/notes/:id', async (req, res) => {
  try {
    const noteId = req.params.id;
    const notePath = path.join(NOTES_DIR, `${noteId}.json`);
    
    // Check if note exists
    let existingNote;
    try {
      const data = await fs.readFile(notePath, 'utf-8');
      existingNote = JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({ error: 'Note not found' });
      }
      throw error;
    }
    
    // Update note
    const updatedNote = {
      ...existingNote,
      content: req.body.content,
      updatedAt: new Date().toISOString()
    };
    
    await fs.writeFile(notePath, JSON.stringify(updatedNote, null, 2));
    
    res.json(updatedNote);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// Delete a note
app.delete('/api/notes/:id', async (req, res) => {
  try {
    const noteId = req.params.id;
    const notePath = path.join(NOTES_DIR, `${noteId}.json`);
    
    await fs.unlink(notePath);
    
    res.json({ success: true, message: 'Note deleted' });
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'Note not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete note' });
    }
  }
});

// Start server
app.listen(PORT, async () => {
  await ensureNotesDir();
  console.log(`Notepad Lite server running on http://localhost:${PORT}`);
});
