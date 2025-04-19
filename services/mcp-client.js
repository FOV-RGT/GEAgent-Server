

class createMCPManager {
    constructor() {
        this.NewClient = null;
        this.NewStdioClientTransport = null;
        this.clients = new Map();
        this.toolsMap = new Map();
        this.toolsList = [];
    }
    async init() {
        const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
        this.NewClient = Client;
        const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');
        this.NewStdioClientTransport = StdioClientTransport;
        const clientConfigs = [
            {
                name: 'biliSearch',
                version: '1.0.0',
                transport: {
                    command: "python",
                    args: ["services/biliSearch.py"]
                }
            },
            {
                name: 'normal',
                version: '1.0.0',
                transport: {
                    command: 'node',
                    args: ['services/normalServer.mjs']
                }
            }
        ];
        await Promise.allSettled(clientConfigs.map(async (config) => {
            try {
                const client = new Client({
                    name: config.name,
                    version: config.version
                });
                const transport = new StdioClientTransport(config.transport);
                await client.connect(transport);
                this.clients.set(config.name, client);
                console.log(`客户端 ${config.name} 初始化成功`);
            } catch (err) {
                console.error(`客户端 ${config.name} 初始化失败:`, err);
            }
        }));
        
        // 直接构建工具映射
        await this.buildToolsMap();
        console.log(`工具映射完成，共 ${this.toolsMap.size} 个工具`);
    }
    getAllClients(callback) {
        let tasks = []
        for (const [clientName, client] of this.clients.entries()) {
            const task = callback(clientName, client).then((res) => {
                return Promise.resolve({ clientName, res });
            }).catch((err) => {
                return Promise.reject({ clientName, error: err });
            });
            tasks.push(task);
        }
        return tasks;
    }
    async buildToolsMap() {
        const callback = async (clientName, client) => {
            const res = await client.listTools();
            for (const tool of res.tools) {
                this.toolsMap.set(tool.name, clientName);
            }
        }
        const tasks = this.getAllClients(callback)
        const results = await Promise.allSettled(tasks);
        for (const result of results) {
            if (result.status === 'rejected') {
                console.error(`MCP Client ${result.reason.clientName}: tools - client键值对建立失败`);
                console.error(result.reason.error);
            } else {
                console.log(`MCP Client ${result.value.clientName}: tools - client键值对建立成功`);
            }
        }
    }
    async listTools() {
        if (this.toolsList.length > 0) {
            return this.toolsList
        }
        const callback = async (clientName, client) => {
            let toolsList = [];
            const res = await client.listTools();
            for (const tool of res.tools) {
                toolsList.push({
                    type: 'function',
                    function: {
                        name: tool.name,
                        description: tool.description,
                        parameters: tool.inputSchema
                    }
                });
            }
            return toolsList
        }
        const tasks = this.getAllClients(callback);
        const results = await Promise.allSettled(tasks);
        for (const result of results) {
            if (result.status === 'rejected') {
                console.error(`MCP Client ${result.reason.clientName} 工具列表获取失败`);
                throw new Error({
                    success: false,
                    name: result.reason.clientName,
                    error: result.reason.error
                })
            } else {
                console.log(`MCP Client ${result.value.clientName} 工具列表获取成功`);
                this.toolsList.push(...result.value.res)
            }
        }
        return this.toolsList
    }
    async callTool(toolName, args) {
        const clientName = this.toolsMap.get(toolName);
        const client = this.clients.get(clientName);
        if (!client) {
            throw new Error(`工具 ${toolName} 不存在`);
        }
        const result = await client.callTool({
            name: toolName,
            arguments: args
        });
        return result;
    }
}

module.exports = {
    createMCPManager
};