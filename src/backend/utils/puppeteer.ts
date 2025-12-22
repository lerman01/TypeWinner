import puppeteer, {Browser, Page} from "puppeteer-core";
import {typeText} from "./typing";
import {getTextFromImg} from "./grok";
import {getChromePath, paths} from "./commons";
import IpcMainInvokeEvent = Electron.IpcMainInvokeEvent;

export const chromePath = getChromePath()

let browser: Browser
export const openPuppeteerBrowser = async (ipcEvent: IpcMainInvokeEvent) => {
    browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        executablePath: chromePath!,
        userDataDir: `${paths.data}/chromeUserData`,
        ignoreDefaultArgs: ['--enable-automation'],
        args: [
            '--disable-infobars',
            '--disable-session-crashed-bubble',
            '--hide-crash-restore-bubble',
            '--disable-session-restore'
        ],
    })
    browser.on('disconnected', () => {
        ipcEvent.sender.send('enableBrowser');
    })
    browser.on('targetcreated', async target => {
        if (target.type() === 'page') {
            const newPage = await target.page();
            if (newPage && newPage !== page) {
                await newPage.close();
            }
        }
    });

    const [page] = await browser.pages()
    const gameUrl = 'https://play.typeracer.com/'
    await page.goto(gameUrl)

    await page.setRequestInterception(true);
    page.on('request', async req => {
        req.continue().catch(() => {
        })
    })
    page.on('response', async res => {
        if (res.url().startsWith('https://play.typeracer.com/challenge?id=')) {
            solveChallenge(page, await res.buffer()).catch(() => {
            })
        }
    })


    const initRaceListener = () => {
        const observer = new MutationObserver((mutationList, observer) => {
            for (const mutation of mutationList) {
                const el = mutation.target as HTMLElement
                if (el.classList?.contains('trafficLight') && el.style.background.includes('-495px')) {
                    const raceText = document.querySelector('table.inputPanel div')!.textContent!
                    gameStarted(raceText)
                }
            }
        });

        observer.observe(document.body, {attributes: true, subtree: true});
    }

    page.on('framenavigated', async frame => {
        if (frame === page.mainFrame()) {
            page.evaluate(initRaceListener).catch(() => {
            })
        }
    });


    await page.exposeFunction('gameStarted', async (raceText: string) => {
        const el = await page.waitForSelector('.txtInput')
        await el!.click()
        await page.waitForFunction(() => document.activeElement?.tagName === 'INPUT')
        await typeText(page, raceText);
    });

    await page.evaluate(initRaceListener).catch(() => {
    })

}

const solveChallenge = async (page: Page, imageData: Buffer) => {
    const challengeText = await getTextFromImg(imageData)
    if (challengeText) {
        await typeText(page, challengeText)
        await page.click('.dialogContent button');
    }
}