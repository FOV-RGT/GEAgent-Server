let mcpClient = null;
let initPromise = null;

async function initMCPClient() {
    if (!initPromise) {
        initPromise = (async () => {
            const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
            const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');
            console.log('初始化MCP Client');
            mcpClient = new Client({
                name: 'my-express-client',
                version: '1.0.0',
            });
            // const jsTransport = new StdioClientTransport({
            //     command: 'node',
            //     args: ['services/mcp-server.mjs'],
            // });
            // await mcpClient.connect(jsTransport);
            const biliTransport = new StdioClientTransport({
                command: "python",
                args: ["services/biliSearch.py"],
            });
            await mcpClient.connect(biliTransport);
            return mcpClient;
        })();
    }
    return initPromise;
}

module.exports = {
    getMCPClient: initMCPClient,
};