import path from 'path';
import fs from 'fs';
import envPaths from 'env-paths';

export const paths = envPaths('TypeWinner');

export const getChromePath = () => {
  const { platform } = process;

  if (platform === 'win32') {
    // Windows default locations
    const programFiles = process.env.PROGRAMFILES || 'C:\\Program Files';
    const programFilesx86 =
      process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';
    const possiblePaths = [
      path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(
        programFilesx86,
        'Google',
        'Chrome',
        'Application',
        'chrome.exe',
      ),
    ];
    return possiblePaths.find((p) => fs.existsSync(p)) || null;
  }
  if (platform === 'darwin') {
    // macOS default location
    const macPath =
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    return fs.existsSync(macPath) ? macPath : null;
  }
  if (platform === 'linux') {
    // Linux common locations
    const linuxPaths = [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/snap/bin/chromium',
    ];
    return linuxPaths.find((p) => fs.existsSync(p)) || null;
  }

  return null; // Unsupported OS
};

export const resolveHtmlPath = (htmlFileName: string) => {
  if (process.env.NODE_ENV === 'development') {
    const port = process.env.PORT || 1212;
    const url = new URL(`http://localhost:${port}`);
    url.pathname = htmlFileName;
    return url.href;
  }
  return `file://${path.resolve(__dirname, '../renderer/', htmlFileName)}`;
};

export const getRandomInt = (min: number, max: number) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};
