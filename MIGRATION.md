# Migration from Electron to Tauri

This project has been successfully migrated from Electron to Tauri. Here's what changed:

## Key Changes

### 1. Backend (Main Process)
- **Before**: Electron main process in `src/main/main.ts` (Node.js/TypeScript)
- **After**: Tauri backend in `src-tauri/src/main.rs` (Rust)
- All IPC handlers have been converted to Tauri commands

### 2. Frontend
- **Before**: Used Electron's `contextBridge` and `ipcRenderer`
- **After**: Uses Tauri's `@tauri-apps/api` packages
- All `window.api.*` calls replaced with `invoke()` calls

### 3. Build System
- **Before**: Webpack-based build system
- **After**: Vite for frontend, Cargo for Rust backend
- Removed all Electron-specific webpack configurations

### 4. Dependencies
- Removed: `electron`, `electron-builder`, `webpack`, and related packages
- Added: `@tauri-apps/api`, `@tauri-apps/cli`, `vite`, and Rust dependencies

## New Project Structure

```
TypeWinner/
├── src-tauri/          # Rust backend (Tauri)
│   ├── src/
│   │   ├── main.rs     # Main entry point
│   │   ├── commands.rs # Tauri commands (IPC handlers)
│   │   └── utils/      # Utility modules
│   ├── Cargo.toml      # Rust dependencies
│   └── tauri.conf.json # Tauri configuration
├── src/
│   └── renderer/        # React frontend (unchanged structure)
├── index.html          # HTML entry point (moved from src/renderer/)
└── vite.config.ts      # Vite configuration
```

## Development

### Prerequisites
- Node.js (v14+)
- Rust (latest stable)
- Tauri CLI: `npm install -g @tauri-apps/cli` or use `npx`

### Running in Development
```bash
npm install
npm run tauri:dev
```

This will:
1. Start Vite dev server on port 1420
2. Build and run the Tauri app
3. Hot-reload the frontend

### Building for Production
```bash
npm run tauri:build
```

This creates platform-specific installers in `src-tauri/target/release/bundle/`.

## API Changes

### Frontend API Calls

**Before (Electron):**
```typescript
window.api.quit()
window.api.saveApiKey(apiKey)
window.api.getApiKey()
window.api.openExternal(url)
window.api.openBrowser()
window.api.updateTypeSpeed({ min, max })
window.api.updateErrRate(rate)
```

**After (Tauri):**
```typescript
import { invoke } from '@tauri-apps/api/core';

invoke('quit')
invoke('save_api_key', { apiKey })
invoke('get_api_key')
invoke('open_external', { url })
invoke('open_browser')
invoke('update_type_speed', { args: { min, max } })
invoke('update_err_rate', { errRate })
```

### Events

**Before (Electron):**
```typescript
window.api.enableBrowser((value) => { ... })
```

**After (Tauri):**
```typescript
import { listen } from '@tauri-apps/api/event';

const unlisten = await listen('enableBrowser', () => { ... });
// Don't forget to call unlisten() when done
```

## Puppeteer Integration

The Puppeteer functionality is now handled by a standalone Node.js script (`src/main/utils/puppeteer-node.js`) that is spawned from the Rust backend. This maintains compatibility with the existing Puppeteer code while running in a Tauri environment.

## Configuration Files

- **Tauri Config**: `src-tauri/tauri.conf.json` - Window settings, build config, etc.
- **Rust Config**: `src-tauri/Cargo.toml` - Rust dependencies
- **Vite Config**: `vite.config.ts` - Frontend build configuration
- **TypeScript Config**: `tsconfig.json` - Updated for Vite/ESM

## Notes

- The app window configuration (size, always on top, etc.) is now in `tauri.conf.json`
- Icons are located in `src-tauri/icons/`
- The Chrome path detection logic has been ported to Rust
- File system operations (API key storage) use Rust's standard library with `dirs` crate for cross-platform paths

## Troubleshooting

1. **"Chrome not found" error**: Make sure Google Chrome is installed in the default location for your OS
2. **Build errors**: Ensure Rust is properly installed: `rustc --version`
3. **Frontend not loading**: Check that Vite dev server is running on port 1420
4. **Puppeteer script not found**: Ensure `src/main/utils/puppeteer-node.js` exists

