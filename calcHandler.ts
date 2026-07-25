import { evaluate } from 'mathjs';

export interface CalcResult {
    expression: string;
    result: string;
    type: 'normal' | 'division' | 'choice';
}

export function parseCalcCommand(input: string): CalcResult {
    const trimmed = input.normalize('NFKC').trim();

    if (!trimmed) {
        return {
            expression: '',
            result: '❌ 입력이 비어 있습니다.',
            type: 'normal',
        };
    }

    // 몫/나머지 처리: /c 10//3
    const divMatch = trimmed.match(/^([+\-]?\d+)\s*\/\/\s*([+\-]?\d+)$/);
    if (divMatch) {
        const left = parseInt(divMatch[1]!, 10);
        const right = parseInt(divMatch[2]!, 10);

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

    // 숫자/연산자만 있으면 계산합니다.
    const looksLikeMath = /^[\d+\-*/%^().\s]+$/;
    if (looksLikeMath.test(trimmed)) {
        try {
            const value = evaluate(trimmed);

            if (typeof value === 'number' && Number.isFinite(value)) {
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
            // 계산 실패 시 아래 선택지 처리로 넘어갑니다.
        }
    }

    // /c (선택지1, 선택지2, 선택지3)
    // 바깥 괄호만 제거하고, 쉼표만 기준으로 나눕니다.
    // 따라서 "매운 라면"처럼 공백이 포함된 선택지도 하나로 유지됩니다.
    const normalized =
        trimmed.startsWith('(') && trimmed.endsWith(')')
            ? trimmed.slice(1, -1).trim()
            : trimmed;

    if (normalized.includes(',')) {
        const candidates = normalized
            .split(',')
            .map((value) => value.trim())
            .filter((value) => value.length > 0);

        if (candidates.length >= 2) {
            const chosen = candidates[Math.floor(Math.random() * candidates.length)];

            return {
                expression: candidates.join(', '),
                result: `**${chosen}**`,
                type: 'choice',
            };
        }
    }

    return {
        expression: trimmed,
        result: '❌ 계산식 또는 쉼표로 구분한 선택지를 입력해주세요. 예: `/c (사과, 배, 복숭아)`',
        type: 'normal',
    };
}
