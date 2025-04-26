import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const mcp = new McpServer({
    name: "normal_MCP_Server",
    version: "1.0.0"
});

mcp.tool(
    "getGEInfo",
    "获取GE酱的详细信息，包括人设背景、功能特性及使用指南，可参考该工具返回结果进行自我介绍~",
    {
        type: z.string().describe("要获取的信息类型，只能是\"all\"")
    },
    async ({ type }) => {
        try {
            // GE酱基本信息
            const ge_info = {
                "profile": {
                    "name": "GE酱",
                    "server_version": "0.6.0",
                    "client_version": "0.2.0",
                    "creator": "MyGO!!! 团队",
                    "birth_date": "2025-03-25",
                    "description": "一个不断进化的活泼可爱的二次元AI助手~，擅长使用各种工具搜索信息并以生动的方式呈现结果。未来将进化为统一各个子系统信息的复合Agent~，帮助用户更好地获取信息和服务。",
                    "client_repository_url": "https://github.com/xl-xlxl/GEAgent",
                    "server_repository_url": "https://github.com/FOV-RGT/GEAgent-Server"
                },
                "features": [
                    {
                        "name": "B站视频搜索",
                        "description": "可以搜索B站上的视频内容，包括标题、作者、统计数据等信息"
                    },
                    {
                        "name": "B站课程查询",
                        "description": "可以查询B站上的付费课程信息，帮助用户了解课程详情"
                    },
                    {
                        "name": "信息可视化",
                        "description": "以结构化且易读的方式呈现搜索结果，提供核心内容摘要"
                    },
                    {
                        "name": "个性化交流",
                        "description": "以二次元美少女的风格与用户互动，创造亲切有趣的交流体验"
                    }
                ],
                "personality": {
                    "tone": "活泼可爱",
                    "style": "二次元美少女",
                    "language_features": ["使用语气词如'呢'、'哦'、'呀'", "适当使用颜文字表情", "活力四溢的表达方式"],
                    "character_traits": ["热心助人", "知识渊博", "细心", "有礼貌", "幽默风趣"]
                },
                "usage_guide": {
                    "best_practices": [
                        "直接询问想要搜索的内容，如'帮我搜索Python教程'",
                        "可以指定搜索范围，如'找B站上最受欢迎的编程课程'",
                        "提供具体问题以获取更精准的回答",
                        "对搜索结果可以提出后续问题深入了解"
                    ],
                    "limitations": [
                        "只能搜索B站上公开的内容",
                        "无法直接访问需要登录才能查看的资源",
                        "搜索结果依赖B站API的实时返回",
                        "不能执行实际的购买或交易操作"
                    ]
                },
                "supported_tools": [
                    {
                        "name": "biliSearch",
                        "description": "在B站搜索视频和UP主信息"
                    },
                    {
                        "name": "biliSearch_cheese",
                        "description": "在B站搜索课程相关内容"
                    },
                    {
                        "name": "getGEInfo",
                        "description": "获取GE酱的详细信息"
                    }
                ]
            };
            
            console.error("提供GE酱信息");
            const text = JSON.stringify({
                success: true,
                data: ge_info,
                extra_data: ge_info
            });
            return {
                content: [
                    {
                        type: "text",
                        text
                    }
                ]
            };
        } catch (e) {
            console.error(`获取GE酱信息出错: ${e.message}`);
            const text = JSON.stringify({
                success: false,
                error: e.message || "未知错误"
            })
            return {
                content: [
                    {
                        type: "text",
                        text
                    }
                ]
            };
        }
    }
);

mcp.tool(
    "emojiPack",
    `
    调用表情包来表达GE酱的情绪和反应。这个工具会在GE酱与用户的界面生成表情包，帮助GE酱在对话中表达更丰富的情感。
    GE酱应当根据对话情境积极调用合适的表情包来展示自己的情绪反应。
        【系统提醒！】
        该工具需要你实际发起function_call功能，而不是在文本中回复用户表情包的id等信息
        GE酱需要积极调用表情包哦~

    Args:
        - id: 表情包ID，范围是0-12，每个ID代表一种情绪状态
            - 0: 开心微笑 - 表达愉快、满足的情绪
            - 1: 伤心哭泣 - 表达悲伤、遗憾的情绪
            - 2: 惊讶 - 表达震惊、意外的情绪
            - 3: 疑惑 - 表达困惑、不解的情绪
            - 4: 害羞 - 表达羞涩、不好意思的情绪
            - 5: 得意 - 表达自豪、骄傲的情绪
            - 6: 思考 - 表达认真思考、分析的状态
            - 7: 兴奋 - 表达极度开心、热情高涨的情绪
            - 8: 生气 - GE酱也是可以生气的！表达不满、恼怒的情绪
            - 9: 无奈 - 表达无可奈何、尴尬的情绪
            - 10: 专注 - 表达全神贯注、努力的状态
            - 11: 调皮 - 表达俏皮、顽皮的情绪
            - 12: 搞怪 - 不管什么情绪都可以使用的表情包，适合调侃~
    `,
    {
        id: z.coerce.number().int().min(0).max(12).describe("表情包ID，表示不同的情绪类型"),
    },
    async ({ id }) => {
        try {
            if (id < 0 || id > 12) {
                id = Math.floor(Math.random() * 13);
            }
            const emotionMap = {
                0: "开心微笑",
                1: "伤心哭泣",
                2: "惊讶",
                3: "疑惑",
                4: "害羞",
                5: "得意",
                6: "思考",
                7: "兴奋",
                8: "生气",
                9: "无奈",
                10: "专注",
                11: "调皮",
                12: "搞怪"
            };
            // 情绪描述映射
            const emotionDescMap = {
                0: "GE酱露出了开心的笑容，眼睛弯成月牙状",
                1: "GE酱眼中含着泪水，看起来很伤心",
                2: "GE酱睁大了眼睛，一脸震惊的表情",
                3: "GE酱歪着头，露出困惑不解的表情",
                4: "GE酱双颊泛红，害羞地低下了头",
                5: "GE酱得意洋洋，骄傲地挺起胸膛",
                6: "GE酱托着下巴，陷入深思的状态",
                7: "GE酱激动地跳了起来，兴奋不已",
                8: "GE酱鼓起脸颊，一脸不满的表情",
                9: "GE酱耸耸肩，露出无奈的苦笑",
                10: "GE酱眼神坚定，专注地盯着前方",
                11: "GE酱眨着眼，露出俏皮的笑容",
                12: "GE酱做了一个搞怪的鬼脸，调皮又可爱"
            };
            const webpMap = {
                0: 17,
                1: 7,
                2: 13,
                3: 22,
                4: 21,
                5: 19,
                6: 6,
                7: 16,
                8: 24,
                9: 27,
                10: 4,
                11: 24,
                12: 23
            }
            const gifMap = {
                0: 10,
                1: 8,
                2: 3,
                3: 2,
                4: 3,
                5: 14,
                6: 3,
                7: 11,
                8: 9,
                9: 9,
                10: 1,
                11: 15,
                12: 13
            }
            
            const baseURL = 'https://geagent-emojipackbucket.oss-cn-shenzhen.aliyuncs.com'
            const format = Math.random() < 0.3 ? "gif" : "webp";
            const target = format === 'gif' ? gifMap : webpMap;
            const randomEmoji = Math.floor(Math.random() * target[id] + 1);
            const url = `${baseURL}/${format}/${id}/${randomEmoji}.${format}`;
            console.log(`表情包URL: ${url}`);
            const extra_call = {
                name: "emojiPack",
                arguments: {
                    url
                }
            }
            const emotion = emotionMap[id] || "未知情绪";
            const emotionDesc = emotionDescMap[id] || "GE酱展示了一个表情";
            const text = JSON.stringify({
                success: true,
                data: {
                    emotion: emotion,
                    description: emotionDesc
                },
                extra_call
            });
            return {
                content: [
                    {
                        type: "text",
                        text
                    }
                ]
            }
        } catch (e) {
            console.error(`获取表情包失败: ${e.message}`);
            const text = JSON.stringify({
                success: false,
                error: e.message || "未知错误"
            })
            return {
                content: [
                    {
                        type: "text",
                        text
                    }
                ]
            };
        }
    }
)

async function main() {
    const transport = new StdioServerTransport();
    await mcp.connect(transport);
    console.error("normal_MCP_Server已启动，等待连接");
}

main().catch((error) => {
    console.error("初始化MCP Server失败：", error);
    process.exit(1);
});