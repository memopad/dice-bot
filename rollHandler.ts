import { parseRollCommand } from './parser';
import { rollCriticalDice, formatCriticalResult } from './critical';
import { rollNormalDice, formatNormalResult } from './normal';
import { evaluate } from 'mathjs';
import { parseCocRollCommand, handleCocRollCommand } from './cocHandler';

function safeInt(expr: string, name: string, min: number, max: number): number {
    const value = evaluate(expr);
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(`❌ ${name} 수식이 숫자가 아닙니다.`);
    }

    const integer = Math.floor(value);
    if (integer < min || integer > max) {
        throw new Error(`❌ ${name} 범위 오류 (${min}~${max})`);
    }
    return integer;
}

function appendLabel(result: string, label?: string): string {
    return label ? `${result}\n↳ ${label}` : result;
}

export function handleRollCommand(body: string): string {
    try {
        // CoC 판정도 /r 명령 안에서 처리합니다.
        const coc = parseCocRollCommand(body);
        if (coc) return handleCocRollCommand(coc);

        const parsed = parseRollCommand(body);
        if (!parsed) return '❌ 명령어 파싱 오류입니다.';

        if (parsed.isExploding) {
            const count = safeInt(parsed.countExpr, '주사위 개수', 1, 100);
            const threshold = safeInt(parsed.explodeThreshold!, '크리 임계값', 2, 10);

            // 기존 폭발 주사위는 +보정/-보정만 유지합니다.
            if (parsed.modifierExpr && !/^[+\-]/.test(parsed.modifierExpr)) {
                return '❌ 폭발 주사위에는 +보정 또는 -보정만 사용할 수 있습니다.';
            }

            const bonus = parsed.modifierExpr
                ? safeInt(parsed.modifierExpr, '보정값', -1000, 1000)
                : 0;

            const result = rollCriticalDice(count, threshold, bonus);
            return appendLabel(formatCriticalResult(result), parsed.label);
        }

        const result = rollNormalDice(
            parsed.countExpr,
            parsed.sidesExpr,
            parsed.modifierExpr,
            parsed.compareOp,
            parsed.compareTarget
        );

        return appendLabel(formatNormalResult(result), parsed.label);
    } catch (error) {
        return (error as Error).message || '❌ 오류';
    }
}
