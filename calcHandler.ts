import { evaluate } from 'mathjs';

export interface CalcResult {
    expression: string;
    result: string;
    type: 'normal' | 'division' | 'choice';
}

export function parseCalcCommand(input: string): CalcResult {
    const trimmed = input.trim();

    if (!trimmed) {
        return {
            expression: '',
            result: '❌ 입력이 비어 있습니다.',
            type: 'normal',
        };
    }

    // ➗ 1️⃣ 몫/나머지 처리: 10//3
    const divMatch = trimmed.match(/^(\d+)\s*\/\/\s*(\d+)$/);
    if (divMatch) {
        const left = parseInt(divMatch[1], 10);
        const right = parseInt(divMatch[2], 10);

        if (right === 0) {
            return {
                expression: `${left} // ${right}`,
                result: '❌ 0으로 나눌 수 없습니다.',
                type: 'division',
            };
        }

        const quotient = Math.floor(left / right);
        const remainder = left % right;

        return {
            expression: `${left} // ${right}`,
            result: `몫: **${quotient}**, 나머지: **${remainder}**`,
            type: 'division',
        };
    }

    // 🧮 2️⃣ 숫자/연산자만 있을 때만 계산 시도
    const looksLikeMath = /^[\d+\-*/^().\s]+$/;

    if (looksLikeMath.test(trimmed)) {
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
        } catch {
            // 계산 실패 → 아래 choice fallback
        }
    }

    // 🎲 3️⃣ fallback choice 처리
    // 괄호 제거 (A,B,C) 형태 지원
    const normalized = trimmed.replace(/^\(|\)$/g, '');

    const candidates = normalized
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

    if (candidates.length >= 2) {
        const chosen =
            candidates[Math.floor(Math.random() * candidates.length)];

        return {
            expression: candidates.join(', '),
            result: `**${chosen}**`,
            type: 'choice',
        };
    }

    // 🚫 아무 조건도 만족 안 하면 오류
    return {
        expression: trimmed,
        result: '❌ 계산할 수 없는 입력입니다.',
        type: 'normal',
    };
}
