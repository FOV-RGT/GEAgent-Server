const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const searchController = require('../controllers/searchController');

router.get('/tools', authenticateJWT, searchController.getMCPToolslist);

module.exports = router;