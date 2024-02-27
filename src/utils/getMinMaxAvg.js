import { getAverage } from "./getAverage.js";


export function getMinMaxAvg(numbers) {
    return {
        min: Math.min(...numbers),
        max: Math.max(...numbers),
        avg: getAverage(numbers)
    }
}