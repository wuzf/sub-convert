/**
 * @description 分组URL
 * @param {string[]} urls
 * @param {number} chunkCount
 * @returns {string[]} urlGroup
 */
export function getUrlGroup(urls: string[], chunkCount: number = 10): string[] {
    const urlGroup: string[] = [];
    let urlChunk: string[] = [];
    urls.forEach((url, index) => {
        urlChunk.push(url);
        if ((index + 1) % chunkCount === 0) {
            urlGroup.push(urlChunk.join('|'));
            urlChunk = [];
        }
    });
    if (urlChunk.length > 0) {
        urlGroup.push(urlChunk.join('|'));
    }
    return urlGroup;
}

/**
 * URL.username 对 userinfo 里的 @ 会保留成 %40，不能直接当密码写回。
 * 已经解码过的值再解一次会抛错，这时保留原值。
 */
export function decodeUserinfo(value: string | null | undefined): string {
    if (!value) {
        return '';
    }
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

export function isJson(text: string): boolean {
    try {
        JSON.parse(text);
        return true;
    } catch {
        return false;
    }
}

export function hasKey(obj: Record<string, any>, key: string): boolean {
    return Object.hasOwn(obj, key);
}
