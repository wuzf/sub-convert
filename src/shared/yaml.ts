import { dump } from 'js-yaml';
import type { ClashType } from '../types';

/**
 * Dump clash config with proxies each on a single line.
 * Only proxies section is affected; other parts remain unchanged.
 */
export function dumpClashWithInlineProxies(config: ClashType): string {
    const yaml = dump(config, {
        indent: 2,
        lineWidth: 200
    });

    const { proxies = [] } = config;
    if (!Array.isArray(proxies) || proxies.length === 0) {
        return yaml;
    }

    const lines = yaml.split('\n');
    const startIdx = lines.findIndex(line => line.trim() === 'proxies:');
    if (startIdx === -1) {
        return yaml;
    }

    // Determine where the proxies section ends by finding the next top-level key
    let endIdx = startIdx + 1;
    while (endIdx < lines.length && lines[endIdx].startsWith('  ')) {
        endIdx++;
    }

    const proxyLines = proxies.map(p => `  - ${dump(p, { flowLevel: 0, lineWidth: -1 }).trim()}`);
    lines.splice(startIdx, endIdx - startIdx, 'proxies:', ...proxyLines);

    return lines.join('\n');
}