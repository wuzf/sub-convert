/**
 * 将 Hysteria2 配置对象转换为 Hysteria2 标准协议 URL
 * @param {object} config - Hysteria2 配置对象
 * @returns {string} Hysteria2 标准协议 URL (hysteria2://...)
 * @throws {Error} 如果缺少必要的配置字段
 */
export function hysteria2Convert(config: Record<string, any>): string {
    if (!config || !config.server || !config.port || !config.password) {
        throw new Error('Hysteria2 configuration object must contain server, port, and password.');
    }

    const server = config.server;
    const port = config.port;
    const password = config.password;
    const remarks = config.name || '';

    const parameters = new URLSearchParams();

    // TLS/安全性 相关参数
    const sni = config.sni || config.servername || config.server;
    if (sni) {
        parameters.append('sni', sni);
    }
    const insecure = config.insecure ?? config['skip-cert-verify'];
    if (typeof insecure === 'boolean') parameters.append('insecure', insecure ? '1' : '0');
    if (config.alpn && (typeof config.alpn === 'string' || Array.isArray(config.alpn))) {
        parameters.append('alpn', Array.isArray(config.alpn) ? config.alpn.join(',') : config.alpn);
    }

    // 混淆 Obfs 参数 (Hysteria2 只支持 obfs=salamander + obfs-password，没有 obfs-param)
    if (config.obfs) {
        parameters.append('obfs', config.obfs);
    }
    if (config['obfs-password']) {
        parameters.append('obfs-password', config['obfs-password']);
    }
    // 端口跳跃不在标准分享链接里。写进查询参数只为还原，混淆链接会去掉，避免后端拒识。
    if (config.ports !== undefined && config.ports !== null && config.ports !== '') {
        parameters.append('ports', String(config.ports));
    }
    if (config.mport !== undefined && config.mport !== null && config.mport !== '') {
        parameters.append('mport', String(config.mport));
    }

    const queryString = parameters.toString();

    // Hysteria2 规范：认证信息放在 userinfo 中 (hysteria2://password@host:port)，而不是 query 参数
    const encodedPassword = encodeURIComponent(password);
    const encodedServer = encodeURIComponent(server);
    const encodedRemarks = encodeURIComponent(remarks);

    let hysteria2Url = `hysteria2://${encodedPassword}@${encodedServer}:${port}`;
    if (queryString) {
        hysteria2Url += `?${queryString}`;
    }
    if (remarks) {
        hysteria2Url += `#${encodedRemarks}`;
    }

    return hysteria2Url;
}
