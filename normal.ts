import { evaluate } from 'mathjs';

const SAFE_MATH = /^[\d+\-*/%^().\s]+$/;

function safeEval(expr: string, name: string): number {
    if (!SAFE_MATH.test(expr)) {
        throw new Error(`❌ ${name}에 사용할 수 없는 문자가 있습니다.`);
    }

    try {
        const value = evaluate(expr);
        if (typeof value !== 'number' || !Number.isFinite(value)) {
            throw new Error();
        }
        return value;
    } catch {
        throw new Error(`❌ 수식 오류: ${expr}`);
    }
}

function safeInteger(expr: string, name: string, min: number, max: number): number {
    const value = safeEval(expr, name);
    if (!Number.isInteger(value)) {
        throw new Error(`❌ ${name}는 정수여야 합니다.`);
    }
    if (value < min || value > max) {
        throw new Error(`❌ ${name} 범위 오류 (${min}~${max})`);
    }
    return value;
}

function rollDie(sides: number): number {
    return Math.floor(Math.random() * sides) + 1;
}

function applyModifier(total: number, modifierExpr?: string): number {
    if (!modifierExpr) return total;

    if (!SAFE_MATH.test(modifierExpr)) {
        throw new Error('❌ 보정식에 사용할 수 없는 문자가 있습니다.');
    }

    // +2뿐 아니라 *5, /2, ^2 등도 주사위 총합에 적용합니다.
    const value = safeEval(`(${total})${modifierExpr}`, '보정식');
    return value;
}

function formatNumber(value: number): string {
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(3).replace(/\.?0+$/, '');
}

export interface NormalRollResult {
    total: number;
    rolls: number[];
    finalTotal: number;
    modifierExpr?: string;
    success?: boolean;
}

export function rollNormalDice(
    countExpr: string,
    sidesExpr: string,
    modifierExpr?: string,
    compareOp?: string,
    compareTarget?: string
): NormalRollResult {
    const count = safeInteger(countExpr, '주사위 개수', 1, 100);
    const sides = safeInteger(sidesExpr, '주사위 면수', 2, 100000);

    const rolls = Array.from({ length: count }, () => rollDie(sides));
    const total = rolls.reduce((a, b) => a + b, 0);
    const finalTotal = applyModifier(total, modifierExpr);

    let success: boolean | undefined;

    if (compareOp && compareTarget) {
        const target = safeEval(compareTarget, '비교 기준값');
        switch (compareOp) {
            case '=': success = finalTotal === target; break;
            case '>': success = finalTotal > target; break;
            case '>=': success = finalTotal >= target; break;
            case '<': success = finalTotal < target; break;
            case '<=': success = finalTotal <= target; break;
        }
    }

    const result: NormalRollResult = { total, rolls, finalTotal };
    if (modifierExpr) result.modifierExpr = modifierExpr;
    if (typeof success === 'boolean') result.success = success;
    return result;
}

export function formatNormalResult(result: NormalRollResult): string {
    const rollStr = result.rolls.join(', ');
    const finalText = formatNumber(result.finalTotal);

    const detail = result.modifierExpr
        ? `${rollStr} → ${result.total}${result.modifierExpr}`
        : rollStr;

    const base = `**${finalText}** (${detail})`;

    if (typeof result.success === 'boolean') {
        return result.success ? `${base} → ✅ 성공` : `${base} → ❌ 실패`;
    }

    return base;
}
