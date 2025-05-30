const express = require('express');
const { createSupportTicket, getSupportTicket, updateSupportTicket } = require('../controllers/mongoController');

const router = express.Router();

// Create a new support ticket
router.post('/tickets', createSupportTicket);

// Get a ticket by ID
router.get('/tickets/:id', getSupportTicket);

// Update a ticket
router.put('/tickets/:id', updateSupportTicket);

module.exports = router;