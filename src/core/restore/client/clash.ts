import type { ClashType, VpsMap } from '../../../types';
import { PsUtil } from '../../../shared/ps';

export class ClashClient {
    private confuseConfig: ClashType;

    constructor(confuseConfig: ClashType) {
        this.confuseConfig = confuseConfig;
    }

    public getOriginConfig(vpsMap: VpsMap): ClashType {
        try {
            this.confuseConfig.proxies = this.restoreProxies(this.confuseConfig.proxies, vpsMap);
            this.confuseConfig['proxy-groups'] = this.confuseConfig?.['proxy-groups']?.map(group => {
                if (group.proxies) {
                    group.proxies = this.updateProxiesGroups(group.proxies);
                    // 智能处理 DIRECT：对于地区节点组，如果有实际节点则移除 DIRECT
                    group.proxies = this.smartHandleDirect({ ...group, proxies: group.proxies });
                }
                return group;
            });

            return this.confuseConfig;
        } catch (error: any) {
            throw new Error(`Get origin config failed: ${error.message || error}, function trace: ${error.stack}`);
        }
    }

    private restoreProxies(proxies: Array<Record<string, string>> | null, vpsMap: VpsMap): Array<Record<string, string>> {
        const result: Array<Record<string, string>> = [];
        if (!proxies) {
            return result;
        }
        for (const proxy of proxies) {
            try {
                // 跳过特殊代理名称的处理，直接保留
                const specialProxies = ['DIRECT', 'REJECT', 'PROXY', 'PROXIES', 'FALLBACK'];
                if (specialProxies.includes(proxy.name.toUpperCase())) {
                    result.push(proxy);
                    continue;
                }
                
                const [originPs, confusePs] = PsUtil.getPs(proxy.name);
                if (vpsMap.has(confusePs)) {
                    const vps = vpsMap.get(confusePs);
                    vps?.restoreClash(proxy, originPs);
                    result.push(proxy);
                }
            } catch (error: any) {
                console.warn(`Restore proxies failed: ${error.message || error}, function trace: ${error.stack}`);
                continue;
            }
        }

        return result;
    }

    private updateProxiesGroups(proxies: string[]): string[] {
        try {
            const result = proxies.map(proxy => {
                // 跳过特殊代理名称的处理
                const specialProxies = ['DIRECT', 'REJECT', 'PROXY', 'PROXIES', 'FALLBACK'];
                if (specialProxies.includes(proxy.toUpperCase())) {
                    return proxy;
                }
                
                const [originPs] = PsUtil.getPs(proxy);
                return originPs;
            });
            
            // 调试信息 - 检查DIRECT是否被保留
            if (proxies.includes('DIRECT') && !result.includes('DIRECT')) {
                console.warn(`DIRECT was removed from proxies: ${proxies.join(', ')} -> ${result.join(', ')}`);
            }
            
            return result;
        } catch (error: any) {
            throw new Error(`Update proxies groups failed: ${error.message || error}, function trace: ${error.stack}`);
        }
    }

    private smartHandleDirect(group: { name: string; proxies: string[]; [key: string]: any }): string[] {
        try {
            const { name, proxies } = group;
            
            // 检查是否为地区节点组
            const isRegionalGroup = this.isRegionalGroup(name);
            
            // 调试信息 - 针对微软相关组
            if (name.includes('微软') || name.includes('bing') || name.includes('云盘') || name.includes('服务')) {
                console.log(`Processing group: ${name}`);
                console.log(`Is regional: ${isRegionalGroup}`);
                console.log(`Original proxies: ${proxies.join(', ')}`);
            }
            
            // 如果是地区节点组
            if (isRegionalGroup) {
                // 统计非 DIRECT 的代理数量
                const nonDirectProxies = proxies.filter(proxy => proxy !== 'DIRECT');
                
                // 如果有实际的代理节点，则移除 DIRECT
                if (nonDirectProxies.length > 0) {
                    if (name.includes('微软') || name.includes('bing') || name.includes('云盘') || name.includes('服务')) {
                        console.log(`Regional group with nodes, removing DIRECT: ${nonDirectProxies.join(', ')}`);
                    }
                    return nonDirectProxies;
                }
                
                // 如果没有实际代理节点，保留 DIRECT
                if (name.includes('微软') || name.includes('bing') || name.includes('云盘') || name.includes('服务')) {
                    console.log(`Regional group without nodes, keeping DIRECT`);
                }
                return proxies.includes('DIRECT') ? ['DIRECT'] : proxies;
            }
            
            // 对于非地区节点组（如奈飞视频、油管视频等），保留原有配置
            if (name.includes('微软') || name.includes('bing') || name.includes('云盘') || name.includes('服务')) {
                console.log(`Non-regional group, keeping original: ${proxies.join(', ')}`);
            }
            return proxies;
        } catch (error: any) {
            console.warn(`Smart handle DIRECT failed: ${error.message || error}`);
            return group.proxies;
        }
    }

    private isRegionalGroup(groupName: string): boolean {
        const name = groupName.toLowerCase();

        // 特殊处理微软相关服务 - 直接识别为非地区节点组
        if (name.includes('微软') || name.includes('microsoft') ||
            name.includes('bing') || name.includes('云盘') || name.includes('服务')) {
            return false; // 微软相关服务不是地区节点组
        }

        // 地区节点组的关键词列表（优先检查地区关键词）
        const regionalKeywords = [
            // 中文地区名
            '香港', '台湾', '日本', '韩国', '新加坡', '狮城', '美国', '英国', '德国', '法国', '荷兰',
            '俄罗斯', '印度', '泰国', '菲律宾', '马来西亚', '印尼', '越南', '土耳其',
            '阿根廷', '巴西', '澳大利亚', '加拿大', '南非', '埃及', '以色列',
            // 英文地区名
            'hong kong', 'taiwan', 'japan', 'korea', 'singapore', 'united states',
            'united kingdom', 'germany', 'france', 'netherlands', 'russia',
            'india', 'thailand', 'philippines', 'malaysia', 'indonesia',
            'vietnam', 'turkey', 'argentina', 'brazil', 'australia', 'canada',
            // 地区代码
            'hk', 'tw', 'jp', 'kr', 'sg', 'us', 'uk', 'de', 'fr', 'nl', 'ru',
            'in', 'th', 'ph', 'my', 'id', 'vn', 'tr', 'ar', 'br', 'au', 'ca'
        ];

        // 如果包含地区关键词，则认为是地区节点组
        if (regionalKeywords.some(keyword => name.includes(keyword))) {
            return true;
        }

        // 排除纯功能性代理组的关键词（不包含地区信息的纯功能组）
        const pureFunctionalKeywords = [
            '选择', 'select', 'auto', '自动', '手动', 'manual',
            '油管', 'youtube',
            '游戏', 'game', '广告', 'ad', '拦截', 'block',
            '流媒体', 'streaming', '视频', 'video', '音乐', 'music',
            '社交', 'social', '聊天', 'chat', '邮件', 'email',
            '学术', 'academic', '学术网站', 'scholar', 'google scholar',
            '苹果', 'apple', 'icloud', 'itunes', 'app store',
            'telegram', 'whatsapp', 'discord', 'twitter', 'facebook',
            'instagram', 'tiktok', 'twitch', 'spotify', 'pinterest',
            'github', 'gitlab', 'stackoverflow', 'reddit', 'quora',
            'wikipedia', 'wikimedia', 'medium', 'dev.to', 'hackernews',
            'direct', 'reject', 'proxy', 'proxies', 'fallback'
        ];

        // 如果只包含功能性关键词且不包含地区信息，则不是地区节点组
        if (pureFunctionalKeywords.some(keyword => name.includes(keyword))) {
            return false;
        }

        // 默认情况下，如果包含"节点"关键词，认为是地区节点组
        return name.includes('节点') || name.includes('node');
    }
}
