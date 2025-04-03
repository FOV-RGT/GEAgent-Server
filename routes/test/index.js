const express = require('express');
const router = express.Router();
const chat = require('./chat');

router.use('/chat', chat);

router.get('/', (req, res) => {
    res.json({ message: 'test API工作正常' });
});

module.exports = router;