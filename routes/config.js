const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const { findConfig } = require('../middleware/config');
const configController = require('../controllers/configController');
const { validateConfig } = require('../middleware/validators');

router.get('/:LLMID', authenticateJWT, findConfig, configController.getConfig);

router.put('/:LLMID', authenticateJWT, validateConfig, findConfig, configController.updateConfig);

module.exports = router;