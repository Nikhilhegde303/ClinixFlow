/**
 * Calculates the new Exponential Moving Average with Outlier Suppression.
 * Alpha is set to 0.3 for a responsive but smooth calculation.
 */
export const calculateNewEMA = (currentDurationMins, oldEMA, alpha = 0.3) => {
    // 1. The Hard-Cap Outlier Filter: Cap the session at 2x the current average
    const outlierCap = 2 * oldEMA;
    const filteredDuration = currentDurationMins > outlierCap ? outlierCap : currentDurationMins;

    // 2. The EMA Calculation
    const newEMA = (filteredDuration * alpha) + (oldEMA * (1 - alpha));

    // Return rounded to 2 decimal places to prevent floating point drift
    return parseFloat(newEMA.toFixed(2));
};