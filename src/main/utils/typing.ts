import { Page } from 'puppeteer-core';
import { getRandomInt } from './commons';

export const MAX_DELAY = 400;

export const typeConfig = {
  minDelay: 20,
  maxDelay: 25,
  errorRate: 0,
};

const shouldDoError = () => {
  const randomInt = getRandomInt(0, 100);
  return randomInt < typeConfig.errorRate;
};

const doError = async (page: Page) => {
  const errorsAmount = getRandomInt(1, 5);

  for (let i = 0; i < errorsAmount; i++) {
    const errorCharacter = String.fromCharCode(
      97 + Math.floor(Math.random() * 26),
    );
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

export const typeText = async (page: Page, raceText: string) => {
  for (const character of raceText) {
    if (shouldDoError()) {
      await doError(page);
    }
    await page.keyboard.type(character, {
      delay: getRandomInt(typeConfig.minDelay, typeConfig.maxDelay),
    });
  }
};
