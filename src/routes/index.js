// src/routes/index.js

const express = require('express');
const router = express.Router();
const geminiService=require('../services/ai/gemini.service')

const {authRouter}=require('./auth.routes')
const {aiRouter}=require('./ai.routes')
router.use('/auth', authRouter);

router.use('/ai', aiRouter);


module.exports = router;