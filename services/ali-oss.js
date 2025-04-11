const OSS = require('ali-oss');
const path = require('path');

const client = new OSS({
    accessKeyId: process.env.OSS_ACCESS_KEY_ID,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
    region: process.env.OSS_REGION,
    authorizationV4: true,
    bucket: process.env.OSS_BUCKET_NAME,
    secure: true,
    timeout: 60000
});

const getSignedUrl = async (objectName, expires = 3600) => {
    try {
        const result = await client.signatureUrlV4('GET', expires, {
            headers: {}
        }, objectName);
        return result;
    } catch (e) {
        console.error('获取签名失败:', e);
        throw e;
    }
};

const uploadFile = async (file, fileName, directory = 'uploads') => {
    const objectName = directory ? `${directory}/${fileName}` : fileName;
    try {
        const result = await client.put(objectName, file);
        return {
            name: fileName,
            url: result.url,
            path: objectName
        }
    } catch (e) {
        console.error('上传文件失败:', e);
        throw e;
    }
};

module.exports = {
    client,
    getSignedUrl,
    uploadFile
}