import type { AnytlsConfig } from '../types';
import { decodeUserinfo } from '../../../shared';
import { Faker } from '../../../shared/faker';
import { PsUtil } from '../../../shared/ps';

export class AnytlsParser extends Faker {
    #originLink = '';
    #confuseLink = '';
    #originConfig: Partial<AnytlsConfig> = {};
    #confuseConfig: Partial<AnytlsConfig> = {};
    #originPs = '';
    #confusePs = '';
    #tag = '';

    constructor(v: string) {
        super();
        this.#confusePs = crypto.randomUUID();
        this.setOriginConfig(v);
        this.setConfuseConfig(v);
    }

    private setOriginConfig(v: string): void {
        this.#originLink = v;
        this.#originConfig = new URL(v);
        this.#originPs = this.#originConfig.hash ?? '';
        this.#tag = this.getTag(this.#originConfig.hash) ?? '';
    }

    public updateOriginConfig(ps: string): void {
        this.#originConfig.hash = ps;
        this.#originPs = ps;
        this.#originLink = this.#originConfig.href!;
        this.setConfuseConfig(this.#originLink);
    }

    private setConfuseConfig(v: string): void {
        this.#confuseConfig = new URL(v);
        this.#confuseConfig.username = this.getUsername();
        this.#confuseConfig.host = this.getHost();
        this.#confuseConfig.hostname = this.getHostName();
        this.#confuseConfig.port = this.getPort();
        this.#confuseConfig.hash = PsUtil.setPs(this.#originPs, this.#confusePs);
        this.#confuseLink = this.#confuseConfig.href!;
    }

    public restoreClash(proxy: Record<string, any>, ps: string): Record<string, any> {
        proxy.name = ps;
        proxy.server = this.originConfig.hostname ?? '';
        proxy.port = Number(this.originConfig.port ?? 0);
        proxy.password = decodeUserinfo(this.originConfig.username);
        if (this.originConfig.searchParams?.has('sni')) {
            proxy.sni = this.originConfig.searchParams.get('sni') ?? '';
        }
        if (this.originConfig.searchParams?.has('insecure')) {
            proxy['skip-cert-verify'] = this.originConfig.searchParams.get('insecure') === '1';
        }
        return proxy;
    }

    public restoreSingbox(outbound: Record<string, any>, ps: string): Record<string, any> {
        outbound.tag = ps;
        outbound.server = this.originConfig.hostname ?? '';
        outbound.server_port = Number(this.originConfig.port ?? 0);
        outbound.password = decodeUserinfo(this.originConfig.username);
        if (outbound.tls?.server_name && this.originConfig.searchParams?.has('sni')) {
            outbound.tls.server_name = this.originConfig.searchParams.get('sni') ?? '';
        }
        if (outbound.tls && this.originConfig.searchParams?.has('insecure')) {
            outbound.tls.insecure = this.originConfig.searchParams.get('insecure') === '1';
        }
        return outbound;
    }

    get originPs(): string {
        return this.#originPs;
    }

    get originLink(): string {
        return this.#originLink;
    }

    get originConfig(): Partial<AnytlsConfig> {
        return this.#originConfig;
    }

    get confusePs(): string {
        return encodeURIComponent(this.#confusePs);
    }

    get confuseLink(): string {
        return this.#confuseLink;
    }

    get confuseConfig(): Partial<AnytlsConfig> {
        return this.#confuseConfig;
    }

    get tag(): string | null {
        return this.#tag ?? null;
    }
}

