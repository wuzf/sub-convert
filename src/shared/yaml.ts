import { dump } from 'js-yaml';
import type { ClashType } from '../types';

/**
 * js-yaml allows `?` in the middle of a flow plain scalar, but YAML treats
 * `?` inside `{...}` as the start of an explicit key. Quote those values.
 */
export function quoteFlowScalarsContainingQuestionMark(flow: string): string {
    let result = '';
    let i = 0;
    let quote: '"' | "'" | null = null;

    while (i < flow.length) {
        const ch = flow[i];
        if (quote) {
            result += ch;
            if (ch === quote && flow[i - 1] !== '\\') quote = null;
            i++;
            continue;
        }
        if (ch === '"' || ch === "'") {
            quote = ch;
            result += ch;
            i++;
            continue;
        }
        if (ch === ':' && flow[i + 1] === ' ') {
            result += ': ';
            i += 2;
            const valueStart = flow[i];
            if (valueStart === '"' || valueStart === "'" || valueStart === '{' || valueStart === '[') {
                continue;
            }
            let j = i;
            while (j < flow.length && flow[j] !== ',' && flow[j] !== '}' && flow[j] !== ']') {
                j++;
            }
            const value = flow.slice(i, j);
            result += value.includes('?') ? JSON.stringify(value) : value;
            i = j;
            continue;
        }
        result += ch;
        i++;
    }

    return result;
}

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

    const proxyLines = proxies.map(
        p => `  - ${quoteFlowScalarsContainingQuestionMark(dump(p, { flowLevel: 0, lineWidth: -1 }).trim())}`
    );
    lines.splice(startIdx, endIdx - startIdx, 'proxies:', ...proxyLines);

    return lines.join('\n');
}