const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

require('dotenv').config();
const cors = require('cors');

const indexRouter = require('./routes/index');
const testRouter = require('./routes/test/index');
const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

app.use('/api', indexRouter);
app.use('/api/test', testRouter);

app.get('/admin*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});


module.exports = app;
