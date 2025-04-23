const express = require('express');
const router = express.Router();
const serverController = require('../controllers/serverController');
const{ authenticateJWT } = require('../middleware/auth');

router.get('/', authenticateJWT, serverController.getDockerStatus);

module.exports = router;