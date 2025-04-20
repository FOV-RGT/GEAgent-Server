import sys
import re
import platform

sys.stderr.write(f'Python版本: {sys.version}\n')
sys.stderr.write(f'Python实现: {platform.python_implementation()}\n')
sys.stderr.write(f'Python编译器: {platform.python_compiler()}\n')
sys.stderr.write(f'操作系统: {platform.system()} {platform.release()}\n')

from mcp.server.fastmcp import FastMCP
from mcp.server.fastmcp.prompts import base
from bilibili_api import search, select_client, request_settings, hot, rank, sync



select_client('curl_cffi')
request_settings.set("impersonate", "chrome131")
mcp = FastMCP('BiliSearch')

@mcp.tool()
async def biliSearch_get_extra_keywords(keyword: str) -> dict:
    """
    该工具可获取搜索词的推荐关键词
    能获取更广泛，但精准度会下降的关键词
    该工具会返回一个包含推荐关键词的列表，供后续搜索使用
    
    Args:
        keyword: 要获取推荐关键词的关键词
        
    Returns:
        一个包含推荐关键词的文本内容
        attr:
            suggest_keywords: 推荐关键词列表
    """
    try:
        sys.stderr.write(f"正在获取推荐关键词: {keyword}\n")
        suggest_keywords = await search.get_suggest_keywords(keyword)
        sys.stderr.write(f"推荐关键词: {suggest_keywords}\n")
        return { "success": True, "data": suggest_keywords, "extra_data": suggest_keywords }
    except Exception as e:
        sys.stderr.write(f"获取推荐关键词出错: {str(e)}\n")
        return {"error": str(e), "success": False}


@mcp.tool()
async def biliSearch(keyword: str, quantity: int = 10, page: int = 1) -> dict:
    """
    在B站（一个大型视频信息聚合网站）以关键词检索信息，获取网络上的综合信息，一般不包含需付费的资源
    可以先进行推荐词的获取再调用此工具进行搜索
    注意，搜索的结果不一定代表热度最高的内容，如需要，可进行多次调用，或扩大单次获取的结果数量
    
    Args:
        keyword: 要进行搜索的关键词，可以是视频标题、UP主名称等
        quantity: 要获取的搜索结果数量，默认为10
        page: 搜索结果的页码，默认为1
    
    Returns:
        一个包含搜索结果的文本内容
        attr:
            up_user:首页推荐UP主，与keyword关联度高
                name:UP主名称
                fans_count:粉丝数
                videos_count:视频数
                is_power_up:是否是“百大”UP主。“百大”是极高的荣誉
            representative_works:该首页up主的推荐作品
                view:播放数
                danmaku:弹幕数
                coin:硬币数
                favorite:收藏数
                comment:评论数
                like:点赞数
                description:视频简介
                tags:视频标签
                url:视频链接
                bvid:视频BV号
    """
    sys.stderr.write(f"正在搜索: {keyword}\n")
    try:
        raw_result = await search.search(keyword, page)
        # 使用格式化函数处理结果
        return extract_up_user_info(raw_result, quantity, page)
    except Exception as e:
        sys.stderr.write(f"搜索出错: {str(e)}\n")
        return {"error": str(e), "success": False}

def clean_html_tags(text):
    """移除文本中的HTML标签"""
    if text is None:
        return ""
    # 移除所有HTML标签
    return re.sub(r'<[^>]+>', '', text)

def extract_up_user_info(raw_result, quantity, page) -> dict:
    """
    从B站搜索结果中提取UP主信息和视频信息
    
    Args:
        raw_result: B站原始搜索结果
        
    Returns:
        包含UP主信息和视频列表的字典
    """
    data = {
        "quantity": quantity,
        "page": page,
        "up_user": {},
        "representative_works": [],
        "videos": []
    }
    extra_data = {
        "quantity": quantity,
        "page": page,
        "up_user": {},
        "representative_works": [],
        "videos": []
    }
    
    # 遍历搜索结果寻找bili_user类型
    if "result" in raw_result and isinstance(raw_result["result"], list):
        # 先处理UP主信息
        for item in raw_result["result"]:
            if item.get("result_type") == "bili_user" and item.get("data"):
                user_data = item["data"][0]  # 通常只有一个用户
                
                # 提取UP主基本信息
                extra_data["up_user"] = {
                    "mid": user_data.get("mid"),
                    "name": user_data.get("uname", ""),
                    "signature": user_data.get("usign", ""),
                    "fans_count": user_data.get("fans", 0),
                    "videos_count": user_data.get("videos", 0),
                    "profile_pic": "https:" + user_data.get("upic", "") if user_data.get("upic") else "",
                    "level": user_data.get("level"),
                    "gender": "男" if user_data.get("gender") == 1 else "女" if user_data.get("gender") == 2 else "未知",
                    "is_live": bool(user_data.get("is_live")),
                    "room_id": user_data.get("room_id"),
                    "official_verify": {
                        "type": user_data.get("official_verify", {}).get("type"),
                        "description": user_data.get("official_verify", {}).get("desc", "")
                    },
                    "is_senior_member": bool(user_data.get("is_senior_member")),
                    "is_power_up": user_data.get("expand", {}).get("is_power_up", False)
                }
                
                data["up_user"] = {
                    "name": user_data.get("uname", ""),
                    "fans_count": user_data.get("fans", 0),
                    "videos_count": user_data.get("videos", 0),
                    "official_verify": {
                        "description": user_data.get("official_verify", {}).get("desc", "")
                    },
                    "is_senior_member": bool(user_data.get("is_senior_member")),
                    "is_power_up": user_data.get("expand", {}).get("is_power_up", False)
                }
                
                # 提取UP主代表作品
                if "res" in user_data and isinstance(user_data["res"], list):
                    extra_data["representative_works"] = []
                    data["representative_works"] = []
                    for work in user_data["res"]:
                        title = clean_html_tags(work.get("title", ""))
                        extra_video = {
                            "avid": work.get("aid"),
                            "bvid": work.get("bvid", ""),
                            "title": title,
                            "publish_date": work.get("pubdate", 0),
                            "url": work.get("arcurl", ""),
                            "cover": "https:" + work.get("pic", "") if work.get("pic") else "",
                            "stats": {
                                "view": int(work.get("play", 0)) if work.get("play") else 0,
                                "danmaku": work.get("dm", 0),
                                "coin": work.get("coin", 0),
                                "favorite": work.get("fav", 0)
                            },
                            "description": work.get("desc", ""),
                            "duration": work.get("duration", "")
                        }
                        video = {
                            "title": title,
                            "stats": {
                                "view": int(work.get("play", 0)) if work.get("play") else 0,
                                "danmaku": work.get("dm", 0),
                                "coin": work.get("coin", 0),
                                "favorite": work.get("fav", 0)
                            },
                            "description": work.get("desc", ""),
                            "duration": work.get("duration", ""),
                            "url": work.get("arcurl", ""),
                            "bvid": work.get("bvid", "")
                        }
                        extra_data["representative_works"].append(extra_video)
                        data["representative_works"].append(video)
                sys.stderr.write(f"UP主信息: {extra_data}\n")
                # 只处理第一个UP主
                break
        
        # 处理视频信息 - 新增部分
        video_count = 0
        for item in raw_result["result"]:
            if item.get("result_type") == "video" and item.get("data"):
                for video_data in item["data"]:
                    title = clean_html_tags(video_data.get("title", ""))
                    # 构建视频信息
                    extra_video = {
                        "id": video_data.get("id") or video_data.get("aid"),
                        "avid": video_data.get("aid"),
                        "bvid": video_data.get("bvid", ""),
                        "title": title,
                        "author": video_data.get("author", ""),
                        "mid": video_data.get("mid"),
                        "type": video_data.get("typename", ""),
                        "url": video_data.get("arcurl", ""),
                        "cover": "https:" + video_data.get("pic", "") if video_data.get("pic") else "",
                        "publish_date": video_data.get("pubdate", 0),
                        "stats": {
                            "view": video_data.get("play", 0),
                            "danmaku": video_data.get("video_review", 0) or video_data.get("danmaku", 0),
                            "comment": video_data.get("review", 0),
                            "favorite": video_data.get("favorites", 0),
                            "like": video_data.get("like", 0)
                        },
                        "description": video_data.get("description", ""),
                        "duration": video_data.get("duration", ""),
                        "tags": video_data.get("tag", "").split(",") if video_data.get("tag") else []
                    }
                    video = {
                        "title": title,
                        "author": video_data.get("author", ""),
                        "type": video_data.get("typename", ""),
                        "stats": {
                            "view": video_data.get("play", 0),
                            "danmaku": video_data.get("video_review", 0) or video_data.get("danmaku", 0),
                            "comment": video_data.get("review", 0),
                            "favorite": video_data.get("favorites", 0),
                            "like": video_data.get("like", 0)
                        },
                        "description": video_data.get("description", ""),
                        "duration": video_data.get("duration", ""),
                        "url": video_data.get("arcurl", ""),
                        "bvid": video_data.get("bvid", ""),
                        "tags": video_data.get("tag", "").split(",") if video_data.get("tag") else []
                    }
                    extra_data["videos"].append(extra_video)
                    data["videos"].append(video)
                    video_count += 1
                    if video_count >= quantity:
                        break
                
                # 视频信息提取完成后记录日志
                if extra_data["videos"]:
                    sys.stderr.write(f"提取了 {len(data['videos'])} 个视频信息\n")
                
                # 只处理第一个视频结果组
                break
    return { "success": True, "extra_data": extra_data, "data": data }

@mcp.tool()
async def biliSearch_cheese(keyword) -> dict:
    """
    在B站搜索网络上的课程（cheese）相关内容，大部分课程需要付费，少部分免费，但专一性强
    可以先进行推荐词的获取再调用此工具进行搜索

    Args:
        keyword: 要搜索的课程关键词
        
    Returns:
        一个包含搜索结果的文本内容
        attr:
            cheeses: 课程列表
                title: 课程标题
                ep_count: 课程集数
                first_ep_title: 第一集标题
                price_format: 价格
                coupon_price_format: 优惠价格
                hot_rank_message: 热门排名信息
                subtitle: 副标题
                up_name: UP主名称
    """
    data = {
        "cheeses": []
    }
    extra_data = {
        "cheeses": []
    }
    try:
        sys.stderr.write(f"正在搜索: {keyword}\n")
        raw_result = await search.search_cheese(keyword, 1, 10)
        sys.stderr.write(f"搜索结果: {raw_result}\n")
        for item in raw_result['items']:
            title = clean_html_tags(item.get("title", ""))
            cheese = {
                "ep_count": item.get("ep_count", ""),
                "first_ep_title": item.get("first_ep_title", ""),
                "price_format": item.get("price_format", ""),
                "coupon_price_format": item.get("coupon_price_format", ""),
                "hot_rank_message": item.get("hot_rank_message", ""),
                "subtitle": item.get("subtitle", ""),
                "title": title,
                "up_name": item.get("up_name", "")
            }
            extra_cheese = {
                **cheese,
                "cover": item.get("cover", ""),
                "link": item.get("link", "")
            }
            data["cheeses"].append(cheese)
            extra_data["cheeses"].append(extra_cheese)
        sys.stderr.write(f"提取了 {len(data['cheeses'])} 个课程信息\n")
        return { "extra_data": extra_data, "data": data }
    except Exception as e:
        sys.stderr.write(f"搜索出错: {str(e)}\n")
        return {"error": str(e), "success": False}


@mcp.resource("config://app", description="应用配置")
def get_config() -> str:
    """Static configuration data"""

@mcp.prompt()
def baseprompt(msg: str) -> list[base.Message]:
    return [
        base.UserMessage(msg)
    ]

if __name__ == '__main__':
    mcp.run(transport='stdio')
