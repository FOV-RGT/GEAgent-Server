const express = require('express');
const router = express.Router();
const serverController = require('../controllers/serverController');
const{ authenticateJWT, authorizeRole } = require('../middleware/auth');

router.get('/info', authenticateJWT, authorizeRole('admin'), serverController.getSystemStatus);

router.get('/clientConfigs', authenticateJWT, authorizeRole('admin'), serverController.getClientConfigs);

router.post('/reloadClientConfigs', authenticateJWT, authorizeRole('admin'), serverController.reloadClientConfigs);

router.post('/updateClientConfigs', authenticateJWT, authorizeRole('admin'), serverController.updateClientConfigs);





module.exports = router;