const express = require('express');
const router = express.Router();
const chat = require('./chat');
const users = require('./users');

router.get('/', (req, res) => {
	res.json({congratulation: '后端服务工作正常'});
});

router.use('/chat', chat);

router.use('/users', users);

module.exports = router;
