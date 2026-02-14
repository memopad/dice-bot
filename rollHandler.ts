import { parseRollCommand } from './parser';
import { rollCriticalDice, formatCriticalResult } from './critical';
import { rollNormalDice, formatNormalResult } from './normal';
import { evaluate } from 'mathjs';

function safeInt(expr: string, name: string, min: number, max: number) {
    const v = evaluate(expr);
    if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`❌ ${name} 수식이 숫자가 아닙니다.`);
    const n = Math.floor(v);
    if (n < min || n > max) throw new Error(`❌ ${name} 범위 오류 (${min}~${max})`);
    return n;
}

export function handleRollCommand(body: string): string {
    try {
        const parsed = parseRollCommand(body);
        if (!parsed) return '❌ 명령어 파싱 오류입니다.';
        if ('error' in parsed) return parsed.error;

        if (parsed.isExploding) {
            const count = safeInt(parsed.countExpr, '주사위 개수', 1, 100);
            const threshold = safeInt(parsed.explodeThreshold!, '크리 임계값', 2, 10);

            const bonus = parsed.modifierExpr
                ? safeInt(parsed.modifierExpr, '보정값', -1000, 1000)
                : 0;
            const result = rollCriticalDice(count, threshold, bonus);
            return formatCriticalResult(result);
        } else {
            const result = rollNormalDice(
                parsed.countExpr,
                parsed.sidesExpr,
                parsed.modifierExpr,
                parsed.compareOp,
                parsed.compareTarget
            );
            return formatNormalResult(result);
        }
    } catch (e) {
        return (e as Error).message || '❌ 오류';
    }
}
