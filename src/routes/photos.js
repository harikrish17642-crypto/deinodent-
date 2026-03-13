const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const supabase = require('../supabaseClient');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// Setup Multer for memory storage (direct upload to Supabase)
const storage = multer.memoryStorage();
const upload = multer({ storage });

const BUCKET_NAME = 'dental-photos';

// Upload a photo
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const { visitId, type } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No photo uploaded' });
    }

    // Generate a unique filename
    const ext = path.extname(req.file.originalname) || '.jpg';
    const fileName = `${visitId}/${crypto.randomUUID()}${ext}`;

    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload to storage' });
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    // Save metadata to database
    const photo = await prisma.photo.create({
      data: {
        visitId,
        url: urlData.publicUrl,
        type: type || 'progress'
      }
    });

    res.status(201).json(photo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

// Delete a photo
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const photo = await prisma.photo.findUnique({ where: { id } });
    if (!photo) return res.status(404).json({ error: 'Photo not found' });

    // Extract the file path from the URL to delete from Supabase
    try {
      const url = new URL(photo.url);
      const storagePath = url.pathname.split(`/object/public/${BUCKET_NAME}/`)[1];
      if (storagePath) {
        await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
      }
    } catch (e) {
      console.warn('Could not delete from storage:', e.message);
    }

    await prisma.photo.delete({ where: { id } });

    res.status(200).json({ message: 'Photo deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

module.exports = router;
