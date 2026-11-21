import { describe, expect, it } from 'vitest';
import { Hysteria2Parser } from '../../../src/core/parser/protocol/hysteria2';
import { TrojanParser } from '../../../src/core/parser/protocol/trojan';
import { VlessParser } from '../../../src/core/parser/protocol/vless';
import { hysteria2Convert } from '../../../src/core/parser/yaml/protocol/hysteria2';
import { vlessConvert } from '../../../src/core/parser/yaml/protocol/vless';
import { decodeUserinfo } from '../../../src/shared';

const password = 'sample.@!';

describe('decodeUserinfo', () => {
    it('把 userinfo 里保留的 %40 解回 @', () => {
        expect(decodeUserinfo('sample.%40%21')).toBe(password);
        expect(decodeUserinfo(password)).toBe(password);
        expect(decodeUserinfo('100%')).toBe('100%');
        expect(decodeUserinfo('')).toBe('');
    });
});

describe('协议还原', () => {
    it('hysteria2 写回解码后的密码，并按原始 insecure 覆盖证书标记', () => {
        const link = hysteria2Convert({
            server: '203.0.113.10',
            port: 64646,
            password,
            name: 'hy2-test',
            sni: 'www.bing.com',
            'skip-cert-verify': true
        });
        const username = new URL(link).username;
        expect(username).toContain('%40');
        expect(username).not.toContain('@');

        const proxy = new Hysteria2Parser(link).restoreClash(
            {
                name: 'fake',
                type: 'hysteria2',
                server: '127.0.0.1',
                port: 1,
                password: username,
                'skip-cert-verify': false
            },
            'hy2-test'
        );

        expect(proxy.password).toBe(password);
        expect(String(proxy.password)).not.toContain('%40');
        expect(proxy['skip-cert-verify']).toBe(true);
        expect(proxy.server).toBe('203.0.113.10');
        expect(proxy.port).toBe(64646);
    });

    it('hysteria2 原始链接没有 insecure 时，不保留后端注入的证书标记', () => {
        const link = `hysteria2://${encodeURIComponent(password)}@203.0.113.10:64646?sni=www.bing.com#hy2`;
        const proxy = new Hysteria2Parser(link).restoreClash(
            {
                type: 'hysteria2',
                password: 'wrong',
                'skip-cert-verify': false
            },
            'hy2'
        );

        expect(proxy.password).toBe(password);
        expect(proxy).not.toHaveProperty('skip-cert-verify');
    });

    it('hysteria2 查询参数里的密码优先于 userinfo', () => {
        const link = 'hysteria2://ignored@203.0.113.10:64646?password=from-query.@#hy2';
        const proxy = new Hysteria2Parser(link).restoreClash(
            {
                type: 'hysteria2',
                password: 'wrong'
            },
            'hy2'
        );

        expect(proxy.password).toBe('from-query.@');
    });

    it('vless 原始链接没有证书参数时，去掉后端注入的 skip-cert-verify', () => {
        const link = vlessConvert({
            type: 'vless',
            uuid: '11111111-1111-1111-1111-111111111111',
            server: '203.0.113.11',
            port: 8080,
            name: 'vless-test',
            security: 'reality',
            servername: 'www.bing.com',
            flow: 'xtls-rprx-vision',
            'reality-opts': { 'public-key': 'test-public-key', 'short-id': 'abcd' },
            'client-fingerprint': 'chrome'
        });
        expect(link).not.toContain('allowInsecure');

        const proxy = new VlessParser(link).restoreClash(
            {
                name: 'fake',
                type: 'vless',
                server: '127.0.0.1',
                port: 1,
                uuid: '00000000-0000-0000-0000-000000000000',
                'skip-cert-verify': false,
                network: 'tcp'
            },
            'vless-test'
        );

        expect(proxy).not.toHaveProperty('skip-cert-verify');
        expect(proxy.uuid).toBe('11111111-1111-1111-1111-111111111111');
        expect(proxy.server).toBe('203.0.113.11');
        expect(proxy.port).toBe(8080);
    });

    it('vless 原始 allowInsecure 为 1 时保留跳过证书校验', () => {
        const link = 'vless://11111111-1111-1111-1111-111111111111@203.0.113.12:443?encryption=none&security=tls&allowInsecure=1#node';
        const proxy = new VlessParser(link).restoreClash(
            {
                type: 'vless',
                network: 'tcp',
                'skip-cert-verify': false
            },
            'node'
        );

        expect(proxy['skip-cert-verify']).toBe(true);
    });

    it('trojan 写回解码后的密码', () => {
        const link = `trojan://${encodeURIComponent(password)}@203.0.113.13:443#trojan`;
        const proxy = new TrojanParser(link).restoreClash(
            {
                type: 'trojan',
                password: new URL(link).username
            },
            'trojan'
        );

        expect(new URL(link).username).toContain('%40');
        expect(proxy.password).toBe(password);
    });
});
