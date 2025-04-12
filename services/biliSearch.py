from mcp.server.fastmcp import FastMCP
from bilibili_api import search, sync

MCPServer = FastMCP('BiliBiliSearch')

print('BiliBili Search MCP Server started...')


@MCPServer.tool()
def bili_search(keyword) -> dict:
    """
    Search for a keyword on Bilibili.
    
    Args:
        keyword: The keyword to search for.
    321
    Returns:
        A dictionary containing the search results.
    """
    return sync(search.search(keyword))

if __name__ == '__main__':
    print('BiliBili Search MCP Server is running...')
    MCPServer.run(transport='stdio')
