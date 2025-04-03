const express = require('express');
const router = express.Router();

router.get('/', function (req, res, next) {
    res.json({congratulation: '响应成功'});
});

module.exports = router;
