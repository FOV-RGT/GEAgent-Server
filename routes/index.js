const express = require('express');
const router = express.Router();
const chat = require('./chat');
const user = require('./user');

router.get('/', (req, res) => {
	res.json({congratulation: '后端服务工作正常'});
});

router.use('/chat', chat);

router.use('/user', user);

module.exports = router;
