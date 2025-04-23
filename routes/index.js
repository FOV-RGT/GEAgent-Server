const express = require('express');
const router = express.Router();
const chat = require('./chat');
const user = require('./user');
const config = require('./config');
const mcp = require('./mcp');
const docker = require('./docker');

router.get('/', (req, res) => {
	res.json({congratulation: '后端服务工作正常'});
});

router.use('/chat', chat);

router.use('/user', user);

router.use('/config', config);

router.use('/mcp', mcp);

router.use('/docker', docker);

module.exports = router;
