const express = require('express');
const { handleSupportRequest } = require('../controllers/supportController');

const router = express.Router();

// Support endpoints
router.post('/', handleSupportRequest);
router.get('/', (req, res) => {
  // Convert query parameters to body format for the controller
  req.body = req.query;
  // Forward to the controller
  handleSupportRequest(req, res);
});

module.exports = router;
