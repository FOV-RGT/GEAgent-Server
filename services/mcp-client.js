const { Client } = require('@modelcontextprotocol/sdk/client');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio');

let mcpClient = null;
let initPromise = null;

async function initMcpClient() {
    if (!initPromise) {
        initPromise = (async () => {
            const transport = new StdioClientTransport({
                command: 'node',
                args: ['./mcp-server'], // 替换为您的MCP服务器路径
            });
            mcpClient = new Client({
                name: 'my-express-client',
                version: '1.0.0',
            });
            await mcpClient.connect(transport);
            return mcpClient;
        })();
    }
    return initPromise;
}

module.exports = {
    getMcpClient: initMcpClient,
};