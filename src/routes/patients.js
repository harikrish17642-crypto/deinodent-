const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

// Get all patients
router.get('/', async (req, res) => {
  try {
    const patients = await prisma.patient.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(patients);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

// Get single patient
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        visits: {
          orderBy: { date: 'desc' },
          include: { photos: true }
        }
      }
    });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    
    res.status(200).json(patient);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch patient details' });
  }
});

// Create new patient
router.post('/', async (req, res) => {
  try {
    const { name, age, parentName, phoneNumber, notes } = req.body;
    const patient = await prisma.patient.create({
      data: {
        name,
        age: parseInt(age),
        parentName,
        phoneNumber,
        notes
      }
    });
    res.status(201).json(patient);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create patient' });
  }
});

// Update patient
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, age, parentName, phoneNumber, notes } = req.body;
    
    const patient = await prisma.patient.update({
      where: { id },
      data: {
        name,
        age: age ? parseInt(age) : undefined,
        parentName,
        phoneNumber,
        notes
      }
    });
    res.status(200).json(patient);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update patient' });
  }
});

// Delete patient
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Fetch all visits to find and delete photos first (manual cascade)
    const visits = await prisma.visit.findMany({ where: { patientId: id } });
    for (const visit of visits) {
      await prisma.photo.deleteMany({ where: { visitId: visit.id } });
    }
    
    // Delete visits
    await prisma.visit.deleteMany({ where: { patientId: id } });
    
    // Delete patient
    await prisma.patient.delete({ where: { id } });
    
    res.status(200).json({ message: 'Patient deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete patient' });
  }
});

module.exports = router;
