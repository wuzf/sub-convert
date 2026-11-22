import { load } from 'js-yaml';
import { describe, expect, it } from 'vitest';
import { dumpClashWithInlineProxies, quoteFlowScalarsContainingQuestionMark } from '../../src/shared/yaml';

describe('行内代理 YAML', () => {
    it('给含问号的路径加引号，避免花括号里被当成显式键', () => {
        const raw = '{path: /argox-vl?ed=2048, headers: {Host: cc.hart.eu.org}}';
        const quoted = quoteFlowScalarsContainingQuestionMark(raw);
        expect(quoted).toContain('path: "/argox-vl?ed=2048"');
        expect(load(quoted)).toEqual({
            path: '/argox-vl?ed=2048',
            headers: { Host: 'cc.hart.eu.org' }
        });
    });

    it('转换结果里的 ws 路径可以按 YAML 解析', () => {
        const yaml = dumpClashWithInlineProxies({
            proxies: [
                {
                    name: 'argo',
                    server: 'time.is',
                    port: 443,
                    type: 'vless',
                    network: 'ws',
                    'ws-opts': {
                        path: '/argox-vl?ed=2048',
                        headers: { Host: 'cc.hart.eu.org' }
                    }
                }
            ]
        } as never);
        const parsed = load(yaml) as { proxies: Array<{ 'ws-opts': { path: string } }> };
        expect(parsed.proxies[0]['ws-opts'].path).toBe('/argox-vl?ed=2048');
    });
});
