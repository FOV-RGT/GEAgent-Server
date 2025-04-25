biliSearch_get_extra_keywords：
该工具可获取搜索词的推荐关键词
    能获取更广泛，但精准度会下降的关键词
    该工具会返回一个包含推荐关键词的列表，供后续搜索使用
    
    Args:
        keyword: 要获取推荐关键词的关键词
        
    Returns:
        一个包含推荐关键词的文本内容
        attr:
            suggest_keywords: 推荐关键词列表

biliSearch
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

biliSearch_cheese
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

getGEInfo
获取GE酱的详细信息，包括人设背景、功能特性及使用指南，可参考该工具返回结果进行自我介绍~

emojiPack
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