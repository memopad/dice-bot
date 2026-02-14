import { evaluate } from 'mathjs';

function safeEval(expr: string): number {
    try {
        return evaluate(expr);
    } catch (e) {
        throw new Error(`❌ 수식 오류: ${expr}`);
    }
}

function rollDie(sides: number): number {
    return Math.floor(Math.random() * sides) + 1;
}

export interface NormalRollResult {
    total: number;
    rolls: number[];
    finalTotal: number;
    success?: boolean;
}

export function rollNormalDice(
    countExpr: string,
    sidesExpr: string,
    modifierExpr?: string,
    compareOp?: string,
    compareTarget?: string
): NormalRollResult {
    const count = safeEval(countExpr);
    const sides = safeEval(sidesExpr);
    const modifier = modifierExpr ? safeEval(modifierExpr) : 0;

    const rolls = Array.from({ length: count }, () => rollDie(sides));
    const total = rolls.reduce((a, b) => a + b, 0);
    const finalTotal = total + modifier;

    let success: boolean | undefined = undefined;

    if (compareOp && compareTarget) {
        const target = safeEval(compareTarget);
        switch (compareOp) {
            case '=': success = finalTotal === target; break;
            case '>': success = finalTotal > target; break;
            case '>=': success = finalTotal >= target; break;
            case '<': success = finalTotal < target; break;
            case '<=': success = finalTotal <= target; break;
        }
    }

    return { total, rolls, finalTotal, success };
}

export function formatNormalResult(result: NormalRollResult): string {
    const rollStr = result.rolls.join(', ');
    const base = `**${result.finalTotal}** (${rollStr})`;

    if (typeof result.success === 'boolean') {
        return result.success ? `${base} → ✅ 성공` : `${base} → ❌ 실패`;
    }

    return base;
}
