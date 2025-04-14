import sys
import re
import platform

sys.stderr.write(f'Python版本: {sys.version}\n')
sys.stderr.write(f'Python实现: {platform.python_implementation()}\n')
sys.stderr.write(f'Python编译器: {platform.python_compiler()}\n')
sys.stderr.write(f'操作系统: {platform.system()} {platform.release()}\n')

from mcp.server.fastmcp import FastMCP
from mcp.server.fastmcp.prompts import base
from bilibili_api import search, sync, select_client, request_settings



select_client('curl_cffi')
request_settings.set("impersonate", "chrome131")
mcp = FastMCP('BiliSearch')

@mcp.tool()
def bili_search(keyword: str) -> dict:
    """
    在B站（一个大型视频信息聚合网站）以关键词检索信息

    Args:
        keyword: 要进行搜索的关键词，可以是视频标题、UP主名称等
    
    Returns:
        一个包含搜索结果的文本内容
    """
    sys.stderr.write(f"正在搜索: {keyword}\n")
    try:
        raw_result = sync(search.search(keyword))
        sys.stderr.write(f"搜索结果: {raw_result}\n\n\n\n")
        # 使用格式化函数处理结果
        return extract_up_user_info(raw_result)
    except Exception as e:
        sys.stderr.write(f"搜索出错: {str(e)}\n")
        return {"error": str(e), "success": False}

def clean_html_tags(text):
    """移除文本中的HTML标签"""
    if text is None:
        return ""
    # 移除所有HTML标签
    return re.sub(r'<[^>]+>', '', text)

def extract_up_user_info(raw_result: dict) -> dict:
    """
    从B站搜索结果中提取UP主信息和视频信息
    
    Args:
        raw_result: B站原始搜索结果
        
    Returns:
        包含UP主信息和视频列表的字典
    """
    data = {
        "up_user": {},
        "representative_works": [],
        "videos": []
    }
    extra_data = {
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
                            "duration": work.get("duration", "")
                        }
                        extra_data["representative_works"].append(extra_video)
                        data["representative_works"].append(video)
                sys.stderr.write(f"UP主信息: {extra_data}\n")
                # 只处理第一个UP主
                break
        
        # 处理视频信息 - 新增部分
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
                        "tags": video_data.get("tag", "").split(",") if video_data.get("tag") else []
                    }
                    extra_data["videos"].append(extra_video)
                    data["videos"].append(video)
                
                # 视频信息提取完成后记录日志
                if extra_data["videos"]:
                    sys.stderr.write(f"提取了 {len(extra_data['videos'])} 个视频信息\n")
                
                # 只处理第一个视频结果组
                break
    return { "extra_data": extra_data, "data": data }

@mcp.resource("config://app")
def get_config() -> str:
    """Static configuration data"""
    return "App configuration here"

@mcp.prompt()
def baseprompt(msg: str) -> list[base.Message]:
    return [
        base.UserMessage(msg)
    ]

if __name__ == '__main__':
    mcp.run(transport='stdio')
