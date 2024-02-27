export function generateOccurrencesString(numbers) {
    // count occurrences
    let occurrences = {};
    numbers.forEach(number => {
        occurrences[number] = (occurrences[number] || 0) + 1;
    });
    // sort occurrences
    const sortedOccurrencesArray = Object.entries(occurrences).sort((a, b) => b[1] - a[1]);
    // occurrences array to string
    return sortedOccurrencesArray.map(([num, count]) => `${num} (${count})`).join(', ');
}