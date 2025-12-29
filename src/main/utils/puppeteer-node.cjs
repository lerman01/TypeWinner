const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { Groq } = require('groq-sdk');

// Get arguments from command line
const [chromePath, dataDir, configPath, apiKey] = process.argv.slice(2);

const MAX_DELAY = 400;

// Function to read config from file
const readConfig = () => {
  try {
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    // Rust already calculates the delay values, use them directly
    return {
      minDelay: config.minDelay,
      maxDelay: config.maxDelay,
      errorRate: config.errorRate,
    };
  } catch (error) {
    // Fallback to default config if file doesn't exist
    return {
      minDelay: 20,
      maxDelay: 25,
      errorRate: 0,
    };
  }
};

let typeConfig = readConfig();

let groq;
if (apiKey) {
  groq = new Groq({ apiKey });
}

const getRandomInt = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Watch config file for changes
fs.watchFile(configPath, { interval: 500 }, () => {
  typeConfig = readConfig();
});

const shouldDoError = () => {
  const randomInt = getRandomInt(0, 100);
  return randomInt < typeConfig.errorRate;
};

const doError = async (page) => {
  const errorsAmount = getRandomInt(1, 5);

  for (let i = 0; i < errorsAmount; i++) {
    const errorCharacter = String.fromCharCode(97 + Math.floor(Math.random() * 26));
    await page.keyboard.type(errorCharacter, {
      delay: getRandomInt(typeConfig.minDelay, typeConfig.maxDelay),
    });
  }

  for (let i = 0; i < errorsAmount; i++) {
    await page.keyboard.press('Backspace', {
      delay: getRandomInt(typeConfig.minDelay, typeConfig.maxDelay),
    });
  }
};

const typeText = async (page, raceText) => {
  for (const character of raceText) {
    if (shouldDoError()) {
      await doError(page);
    }
    await page.keyboard.type(character, {
      delay: getRandomInt(typeConfig.minDelay, typeConfig.maxDelay),
    });
  }
};

const getTextFromImg = async (img) => {
  if (!groq) return null;
  const base64String = img.toString('base64');

  const chatCompletion = await groq.chat.completions.create({
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Write me the text in the image,
return the following JSON: {"text": ""}`,
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${base64String}`,
            },
          },
        ],
      },
    ],
    response_format: {
      type: 'json_object',
    },
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    stream: false,
  });
  return (
    (JSON.parse(chatCompletion?.choices?.[0]?.message?.content ?? '{}')
      ?.text ?? '')
  );
};

const solveChallenge = async (page, imageData) => {
  const challengeText = await getTextFromImg(imageData);
  if (challengeText) {
    await typeText(page, challengeText);
    await page.click('.dialogContent button');
  }
};

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      executablePath: chromePath,
      userDataDir: path.join(dataDir, 'chromeUserData'),
      ignoreDefaultArgs: ['--enable-automation'],
      args: [
        '--disable-infobars',
        '--disable-session-crashed-bubble',
        '--hide-crash-restore-bubble',
        '--disable-session-restore',
      ],
    });

    const [page] = await browser.pages();

    browser.on('disconnected', () => {
      console.log('Browser disconnected, exiting...');
      process.exit(0);
    });

    browser.on('targetcreated', async (target) => {
      if (target.type() === 'page') {
        const newPage = await target.page();
        if (newPage && newPage !== page) {
          await newPage.close();
        }
      }
    });

    page.on('close', async () => {
      console.log('Page closed, closing browser and exiting...');
      await browser.close().catch(() => {});
      process.exit(0);
    });

    const gameUrl = 'https://play.typeracer.com/';
    await page.goto(gameUrl);

    await page.setRequestInterception(true);
    page.on('request', async (req) => {
      req.continue().catch(() => {});
    });

    page.on('response', async (res) => {
      if (res.url().startsWith('https://play.typeracer.com/challenge?id=')) {
        solveChallenge(page, await res.buffer()).catch(() => {});
      }
    });

    const initRaceListener = () => {
      const observer = new MutationObserver((mutationList) => {
        for (const mutation of mutationList) {
          const el = mutation.target;
          if (
            el.classList?.contains('trafficLight') &&
            el.style.background.includes('-495px')
          ) {
            const raceText = document.querySelector(
              'table.inputPanel div',
            )?.textContent;
            if (raceText) {
              gameStarted(raceText);
            }
          }
        }
      });

      observer.observe(document.body, { attributes: true, subtree: true });
    };

    page.on('framenavigated', async (frame) => {
      if (frame === page.mainFrame()) {
        await page.evaluate(initRaceListener).catch(() => {});
      }
    });

    await page.exposeFunction('gameStarted', async (raceText) => {
      const el = await page.waitForSelector('.txtInput');
      await el.click();
      await page.waitForFunction(
        () => document.activeElement?.tagName === 'INPUT',
      );
      await typeText(page, raceText);
    });

    await page.evaluate(initRaceListener).catch(() => {});
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();

