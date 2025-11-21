export function hasNesting(data: any): boolean {
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        return Object.values(data).some(
            v => typeof v === 'object' && v !== null
        );
    } else if (Array.isArray(data)) {
        return data.some(
            item =>
                typeof item === 'object' &&
                item !== null &&
                Object.values(item).some(
                    v => typeof v === 'object' && v !== null
                )
        );
    }
    return false;
}

export function flattenJson(
    data: any,
    out: Record<string, any> = {},
    keyMap: Record<string, string> = {},
    prefix: string = "k"
): [Record<string, any>, Record<string, string>] {
    let counter = 0;

    function _flatten(value: any, path: string) {
        if (typeof value !== 'object' || value === null) {
            const shortKey = `${prefix}${counter}`;
            out[shortKey] = value;
            keyMap[shortKey] = path;
            counter += 1;
            return;
        }

        if (Array.isArray(value)) {
            value.forEach((v, i) => {
                const newPath = path ? `${path}[${i}]` : `[${i}]`;
                _flatten(v, newPath);
            });
        } else {
            Object.entries(value).forEach(([k, v]) => {
                const newPath = path ? `${path}.${k}` : k;
                _flatten(v, newPath);
            });
        }
    }

    _flatten(data, "");
    return [out, keyMap];
}
