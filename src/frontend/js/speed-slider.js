document.addEventListener("DOMContentLoaded", () => {

    const minRange = document.getElementById("minRange");
    const maxRange = document.getElementById("maxRange");
    const minValue = document.getElementById("minValue");
    const maxValue = document.getElementById("maxValue");
    const rangeTrack = document.getElementById("rangeTrack");
    const minGap = 5;

    function updateRange(e) {
        let min = parseInt(minRange.value);
        let max = parseInt(maxRange.value);

        // Ensure min & max have a gap of at least `minGap`
        if (max - min < minGap) {
            if (e.target === minRange) {
                minRange.value = max - minGap;
            } else {
                maxRange.value = min + minGap;
            }
        }

        minValue.innerText = minRange.value;
        maxValue.innerText = maxRange.value;

        let minPercent = (minRange.value / 400) * 100;
        let maxPercent = (maxRange.value / 400) * 100;
        rangeTrack.style.left = minPercent + "%";
        rangeTrack.style.right = 100 - maxPercent + "%";
        window.api.updateTypeSpeed({min: Number(minRange.value), max: Number(maxRange.value)})
            .catch(() => {
            })
    }

    minRange.addEventListener("input", updateRange);
    maxRange.addEventListener("input", updateRange);

    updateRange();
})