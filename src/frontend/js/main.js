const enableBrowser = () => {
    document.querySelector('#browser-btn').disabled = false;
}


const openBrowserOnClick = () => {
    window.api.openBrowser().catch(() => {
    })
    document.querySelector('#browser-btn').disabled = true;

}

document.addEventListener("DOMContentLoaded", () => {
    window.api.enableBrowser(enableBrowser)

    document.getElementById('grok-link').addEventListener('click', (e) => {
        e.preventDefault();
        window.api.openExternal('https://console.groq.com/').catch(() => {
        })
    });

    document.getElementById('apiKeyBtn').addEventListener('click', (e) => {
        const apiKeyInput = document.getElementById('apiKeyInput')
        window.api.saveApiKey(apiKeyInput.value).catch(() => {
        })
        e.target.disabled = true
    });

    const apiKeyInput = document.getElementById('apiKeyInput')
    apiKeyInput.addEventListener('input', e => {
        const apiKeySaveBtn = document.getElementById('apiKeyBtn')
        apiKeySaveBtn.disabled = false
    });

    (async () => {
        const apiKey = await window.api.getApiKey()
        if (apiKey) {
            apiKeyInput.value = apiKey
        }
    })()

})
