const { getSignedUrl, uploadFile, client } = require('../services/ali-oss');
const { validationResult } = require('express-validator');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { User } = require('../models');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 1024 * 1024 * 5 // 限制文件大小为5MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('不支持的文件类型'));
        }
    }
}).single('image');

exports.uploadAvatar = async (req, res) => {
    upload(req, res, async (e) => {
        if (e) {
            return res.status(400).json({
                success: false,
                message: '上传文件失败',
                details: e.message
            });
        }
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: '没有文件上传'
            });
        }
        try {
            const user = await User.findByPk(req.user.userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: '用户不存在'
                });
            }
            if (user.avatarId) {
                const oldPath = `users/${user.userId}/${user.avatarId}`;
                await client.delete(oldPath);
            }
            const ext = path.extname(req.file.originalname);
            const fileName = `${uuidv4()}${ext}`;
            const userDir = req.user ? `users/${req.user.userId}` : 'public';
            const fileContent = fs.readFileSync(req.file.path);
            const result = await uploadFile(fileContent, fileName, userDir);
            fs.unlinkSync(req.file.path);
            const signedUrl = await getSignedUrl(result.path, 86400);
            if (req.user) {
                await User.update({ avatarId: fileName }, {
                    where: { userId: req.user.userId }
                });
            }
            return res.json({
                success: true,
                url: signedUrl
            });
        } catch (e) {
            return res.status(500).json({
                success: false,
                message: '上传文件失败',
                details: e.message || '未知错误'
            });
        }
    })
}

exports.getAvatarUrl = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }
        if (!user.avatarId) {
            return res.status(404).json({
                success: false,
                message: '尚未上传头像'
            });
        }
        const path = `users/${user.userId}/${user.avatarId}`;
        console.log(path);
        const signedUrl = await getSignedUrl(path, 86400);
        res.json({
            success: true,
            url: signedUrl
        })
    } catch (e) {
        return res.status(500).json({
            success: false,
            message: '获取头像URL失败',
            details: e.message || '未知错误'
        });
    }
}