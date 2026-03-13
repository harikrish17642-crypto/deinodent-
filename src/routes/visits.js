const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

// Create a new visit for a patient
router.post('/', async (req, res) => {
  try {
    const { patientId, treatmentNotes, dentistNotes, date } = req.body;
    const visit = await prisma.visit.create({
      data: {
        patientId,
        treatmentNotes,
        dentistNotes,
        date: date ? new Date(date) : undefined
      }
    });
    res.status(201).json(visit);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create visit' });
  }
});

// Get visits for a specific patient
router.get('/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const visits = await prisma.visit.findMany({
      where: { patientId },
      include: {
        photos: true
      },
      orderBy: { date: 'desc' }
    });
    res.status(200).json(visits);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch visits' });
  }
});

module.exports = router;
