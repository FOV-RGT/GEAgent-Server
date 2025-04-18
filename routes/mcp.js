const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const searchController = require('../controllers/searchController');

router.get('/tools', authenticateJWT, searchController.getMCPToolslist);

router.post('/callTool', authenticateJWT, searchController.MCPCallTool);

router.get('/ping', authenticateJWT, searchController.ping);

router.get('/prompts', authenticateJWT, searchController.routerGetPrompt);

router.get('/resources', authenticateJWT, searchController.routerGetResourcesList);

module.exports = router;