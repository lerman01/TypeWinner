document.addEventListener("DOMContentLoaded", () => {

    const errRateInput = document.getElementById("errRateInput");
    const errRateText = document.getElementById("errRate");
    const rangeTrack = document.getElementById("errTrack");

    function updateRange() {
        errRateText.innerText = errRateInput.value;
        rangeTrack.style.right = 100 - errRateInput.value + "%";
        window.api.updateErrRate(errRateInput.value).catch(() => {
        })
    }

    errRateInput.addEventListener("input", updateRange);

    updateRange();
})