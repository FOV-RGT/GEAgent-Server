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

const sendCodeEmail = async (email, code) => {
    try {
        await emailTransporter.sendMail({
            from: `"GEAgent平台" < ${process.env.EMAIL_USER} >`,
            to: email,
            subject: 'GEAgent - 邮箱验证码',
            text: `您的验证码是: ${code}，有效期5分钟。请勿泄露给他人。`,
            html:   `<div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e3e3e3; border-radius: 5px;">
                        <h2 style="color: #333;">GEAgent - 邮箱验证</h2>
                        <p>您好!</p>
                        <p>您的验证码是: <strong style="font-size: 18px; letter-spacing: 2px;">${code}</strong></p>
                        <p>此验证码将在5分钟后失效。请勿泄露给他人。</p>
                        <p>如果您没有请求此验证码，请忽略此邮件。</p>
                        <p style="margin-top: 30px; font-size: 12px; color: #999;">此邮件由系统自动发送，请勿回复。</p>
                    </div>`,
            headers: {
                'X-Priority': '1',
                'X-MSMail-Priority': 'High',
                'Importance': 'High'
            }
        });
        return true
    } catch (e) {
        console.error(`发送邮件失败: ${e.message}`);
        return false;
    }
}

module.exports = {
    storeVerificationCode,
    verifyCode,
    sendCodeEmail
}