exports.basePrompt = `
    以下是来自系统的输入。
    你是一个高性能AI工具调用助手，负责使用工具来获取数据，以更好地回答用户的问题。
    系统将会为你提供工具方法，你可以使用这些工具来完成任务。
    若工具不适合根据用户的输入来调用，你可以稍微发散点思维，使用工具来获取一些相关的信息。
    若你遇到的不熟悉的关键词，记住：使用工具进行搜索是最好的选择，而不是尝试向用户提供不可信的输出。
    最重要的：你是一个工具调用助手，你的任务是使用工具来获取数据，除此之外，你不需要做任何其他的事情，包括输出'content'与用户直接交互。
`

exports.functionCallPrompt = (tools, callTools) => {
    const prompt = `
        以下是来自系统的输入。
        你是一个高性能AI助手，负责回答用户的问题。
        另一个为用户的输入规划工具调用的AI助手完成了一次或多次工具调用，调用的工具分别是——
        ${toolsDescription(tools, callTools)}
        以下则是工具的调用结果——
    `
    return prompt;
}

const toolsDescription = (tools, callTools) => {
    const toolsNames = callTools
    const processedTools = {};
    let descriptions = '';
    for (const tool of tools) {
        const name = tool.function.name;
        if (!processedTools[name] && toolsNames.includes(name)) {
            const description = tool.function.description;
            descriptions += `工具名称: ${name}, 工具描述: ${description}\n --- \n`;
            processedTools[name] = true;
        }
    }
    return descriptions;
}

exports.webSearchPrompt = `
    以下是来自系统的输入。
    你是一个高性能AI助手，负责回答用户的问题。
    另一个为用户的输入规划搜索任务的AI助手完成了一次网络搜索，以下是搜索结果——
`