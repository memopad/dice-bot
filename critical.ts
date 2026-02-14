function rollD10(): number {
    return Math.floor(Math.random() * 10) + 1;
}

export interface CriticalRollResult {
    total: number;
    rounds: number[][];
    finalValues: number[];
}

export function rollCriticalDice(count: number, threshold: number): CriticalRollResult {
    const rounds: number[][] = [];
    let currentDice = Array.from({ length: count }, rollD10);
    let total = 0;

    while (true) {
        rounds.push(currentDice);
        const hasCritical = currentDice.some((v) => v >= threshold);

        if (hasCritical) {
            total += 10;
            const nextDice = currentDice.filter((v) => v >= threshold);
            currentDice = nextDice.map(() => rollD10());
        } else {
            total += currentDice.reduce((sum, v) => sum + v, 0);
            break;
        }
    }

    return {
        total,
        rounds,
        finalValues: rounds.flat(),
    };
}

export function formatCriticalResult(result: CriticalRollResult): string {
    const roundStrings = result.rounds.map((r) => r.join(', '));
    return `**${result.total}** (${roundStrings.join(' > ')})`;
}
