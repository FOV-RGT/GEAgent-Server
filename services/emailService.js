const { setWithExpiry, get, del } = require('./redis');
const emailer = require('nodemailer');

const createKey = (purpose, email) => {
    return `email_${purpose}_${email}`;
}

const generateCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString().substring(0, 6);
}

const storeVerificationCode = async (purpose, email, expiry) => {
    const code = generateCode();
    const key = createKey(purpose, email);
    console.log(`存储验证码: ${key} - ${code}`);
    const success = await setWithExpiry(key, code, expiry);
    return success ? code : null;
}

const verifyCode = async (purpose, email, code) => {
    const key = createKey(purpose, email);
    const storedCode = await get(key);
    if (storedCode === code) {
        await del(key)
        return true
    } else {
        return false
    }
}

const emailTransporter = emailer.createTransport({
    host: 'smtp.163.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    pool: true,
    maxConnections: 5,
    rateDelta: 1000,
    rateLimit: 5
});

module.exports = {
    storeVerificationCode,
    verifyCode,
    emailTransporter
}