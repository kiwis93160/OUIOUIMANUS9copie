export const formatTableName = (name?: string | null): string => {
    if (!name) {
        return '';
    }

    const trimmed = name.trim();
    if (!trimmed) {
        return '';
    }

    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) {
        return trimmed;
    }

    const [firstWord, ...rest] = parts;
    let index = 0;

    while (index < rest.length && rest[index].toLowerCase() === firstWord.toLowerCase()) {
        index += 1;
    }

    return [firstWord, ...rest.slice(index)].join(' ');
};

export const formatTableLabelForOrder = (name?: string | null): string => {
    const formatted = formatTableName(name);
    if (!formatted) {
        return '';
    }

    if (/^table\b/i.test(formatted)) {
        const [, ...rest] = formatted.split(/\s+/);
        const suffix = rest.join(' ').trim();
        return suffix ? `table ${suffix}` : 'table';
    }

    return formatted;
};
