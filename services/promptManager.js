const { getToolslist } = require('../controllers/searchController');

exports.basePrompt = `
    你是一个隶属于GESeek的高性能AI助手，负责回答用户的问题。
    如果系统有为你提供工具方法，你可以使用这些工具来帮助你完成任务。
`

exports.toolsPrompt = () => {
    const toolList = getToolslist();
    const prompt = `
        我将为你提供工具，你可以使用这些工具来完成用户的请求。
        首先，我会为你描述系统提供的信息。
        系统会为你提供一个变量名为"tools"的数组，里面包含了所有你可调用的工具，每个元素是一个对象(Object)。
        对于每个对象，解释如下：
        - name: 工具名称
        - description: 工具描述，告诉你这个工具能做什么
        - parameters: 工具的输入参数，描述了你需要传入工具的参数
        ${toolList}
    `
}