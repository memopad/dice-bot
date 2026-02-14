import { evaluate } from 'mathjs';

export interface CalcResult {
    expression: string;
    result: string;
    type: 'normal' | 'division' | 'choice';
}

export function parseCalcCommand(input: string): CalcResult {
    const trimmed = input.trim();

    // 🎲 choice: /c A B C or /c (A,B,C)
    const isChoiceLike = /^[(\s]*([^\d\+\-\*\/\^\(\)]+)[,\s]+([^\d\+\-\*\/\^\(\)]+)[)\s]*$/;
    if (isChoiceLike.test(trimmed)) {
        const normalized = trimmed.replace(/^\(|\)$/g, '');
        const candidates = normalized
            .split(/[\s,]+/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0);

        if (candidates.length >= 2) {
            const chosen = candidates[Math.floor(Math.random() * candidates.length)];
            return {
                expression: candidates.join(', '),
                result: `**${chosen}**`,
                type: 'choice',
            };
        }
    }

    // ➗ 몫/나머지 처리: /c 10//3
    const divMatch = trimmed.match(/^(\d+)\s*\/\/\s*(\d+)$/);
    if (divMatch) {
        const left = parseInt(divMatch[1], 10);
        const right = parseInt(divMatch[2], 10);
        const quotient = Math.floor(left / right);
        const remainder = left % right;
        return {
            expression: `${left} // ${right}`,
            result: `몫: **${quotient}**, 나머지: **${remainder}**`,
            type: 'division',
        };
    }

    // 🧮 일반 수식
    try {
        const value = evaluate(trimmed);

        if (typeof value === 'number') {
            const formatted =
                Math.floor(value) !== value
                    ? value.toFixed(3).replace(/\.?0+$/, '')
                    : value.toString();

            return {
                expression: trimmed,
                result: `**${formatted}**`,
                type: 'normal',
            };
        }

        return {
            expression: trimmed,
            result: `**${String(value)}**`,
            type: 'normal',
        };
    } catch (err) {
        return {
            expression: trimmed,
            result: '❌ 계산 오류: 올바른 수식이 아닙니다.',
            type: 'normal',
        };
    }
}
