import { MemoryRouter as Router, Route, Routes } from 'react-router-dom';
import './tailwind.css';
import { useEffect, useState } from 'react';
import Slider from 'rc-slider';
import icon from '/icon.png';
import 'rc-slider/assets/index.css';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
// Tauri drag regions work via CSS -webkit-app-region, no API needed

function TypeWinner() {
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isSaveDisabled, setIsSaveDisabled] = useState(true);
  const [speedRange, setSpeedRange] = useState<number[]>([375, 380]);
  const [errRate, setErrRate] = useState<number>(10);

  useEffect(() => {
    let unlistenFn: (() => void) | undefined;
    let unlistenBrowserOpening: (() => void) | undefined;
    let unlistenCloseRequested: (() => void) | undefined;

    const setupListeners = async () => {
      try {
        const unlisten = await listen('enableBrowser', (event) => {
          console.log('enableBrowser event received', event);
          setIsBrowserOpen(false);
        });
        unlistenFn = unlisten;
        
        const unlistenOpening = await listen('browser-opening', (event) => {
          console.log('browser-opening event received', event);
          setIsBrowserOpen(true);
        });
        unlistenBrowserOpening = unlistenOpening;
        
        // Listen for close requested to ensure cleanup
        const appWindow = getCurrentWindow();
        const unlistenClose = await appWindow.onCloseRequested(async () => {
          // Call quit command to ensure puppeteer is killed
          try {
            await invoke('quit');
          } catch (error) {
            console.error('Failed to quit:', error);
            // Force close even if quit fails
            appWindow.close();
          }
        });
        unlistenCloseRequested = unlistenClose;
        
        console.log('Event listeners set up successfully');
      } catch (error) {
        console.error('Failed to setup listeners:', error);
        // Try to set up listener again after a delay
        setTimeout(() => {
          setupListeners();
        }, 1000);
      }
    };

    setupListeners();

    (async () => {
      try {
        const cachedApiKey = await invoke<string | null>('get_api_key');
        if (cachedApiKey) {
          setApiKey(cachedApiKey);
        }
      } catch (error) {
        console.error('Failed to get API key:', error);
      }
    })();

    // Block context menu (right-click)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };
    document.addEventListener('contextmenu', handleContextMenu);

    // Block text selection
    const handleSelectStart = (e: Event) => {
      e.preventDefault();
      return false;
    };
    document.addEventListener('selectstart', handleSelectStart);

    // Block image dragging
    const handleDragStart = (e: DragEvent) => {
      if (e.target instanceof HTMLImageElement) {
        e.preventDefault();
        return false;
      }
    };
    document.addEventListener('dragstart', handleDragStart);

    // Drag region is handled via CSS -webkit-app-region in App.css

    return () => {
      if (unlistenFn) {
        unlistenFn();
      }
      if (unlistenBrowserOpening) {
        unlistenBrowserOpening();
      }
      if (unlistenCloseRequested) {
        unlistenCloseRequested();
      }
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

  useEffect(() => {
    invoke('update_type_speed', { args: { min: speedRange[0], max: speedRange[1] } })
      .catch(() => {});
  }, [speedRange]);

  useEffect(() => {
    invoke('update_err_rate', { errRate })
      .catch(() => {});
  }, [errRate]);

  return (
    <div className="px-4 pb-4">
      <div className="flex items-center gap-2 pt-4">
        <img className="w-8" src={icon} alt="icon" draggable="false" />
        <div className="text-2xl font-bold flex-1" data-tauri-drag-region>
          TypeWinner
        </div>
        <div className="ml-auto">
          <button
            type="button"
            className="bg-white text-[#005894] rounded-full size-6 font-black cursor-pointer mx-auto"
            onClick={async () => {
              try {
                await invoke('quit');
              } catch (error) {
                console.error('Failed to quit:', error);
                // Fallback: try to close window directly
                const appWindow = getCurrentWindow();
                appWindow.close().catch(() => {});
              }
            }}
          >
            X
          </button>
        </div>
      </div>

      <div className="flex pt-6 gap-4">
        <button
          type="button"
          disabled={isBrowserOpen}
          className="shadow-lg cursor-pointer font-bold px-4 rounded-lg bg-[#4caf50] disabled:bg-[#E0E0E0] disabled:text-[#9E9E9E] disabled:cursor-default"
          onClick={async () => {
            try {
              await invoke('open_browser');
              // Button will be disabled when browser-opening event is received
            } catch (error) {
              console.error('Failed to open browser:', error);
            }
          }}
        >
          Open Browser
        </button>

        <div className="flex flex-col gap-4 w-full">
          <div className="bg-white p-2 rounded-lg shadow-lg">
            <h2 className="font-bold text-black">Type Speed</h2>
            <Slider
              className="my-2"
              styles={{
                track: {
                  height: '8px',
                },
                rail: {
                  height: '8px',
                },
                handle: {
                  height: '17px',
                  width: '17px',
                },
              }}
              range
              onChange={(v) => {
                setSpeedRange(v as number[]);
              }}
              allowCross={false}
              value={speedRange}
              min={0}
              max={400}
            />
            <div className="flex justify-between text-gray-600 text-sm">
              <span>
                Min Speed: <span id="minValue">{speedRange[0]}</span>
              </span>
              <span>
                Max Speed: <span id="maxValue">{speedRange[1]}</span>
              </span>
            </div>
          </div>

          <div className="bg-white p-2 rounded-lg shadow-lg">
            <h2 className="font-bold text-black">Error Rate</h2>
            <Slider
              className="my-2"
              styles={{
                track: {
                  height: '8px',
                },
                rail: {
                  height: '8px',
                },
                handle: {
                  height: '17px',
                  width: '17px',
                },
              }}
              onChange={(v) => {
                setErrRate(v as number);
              }}
              allowCross={false}
              value={errRate}
              min={0}
              max={100}
            />
            <div className="flex justify-between text-gray-600 text-sm">
              <span>
                Error Rate: <span id="errRate">{errRate}</span>%
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center my-2 font-bold">
        <div className="flex-grow border-t border-dashed border-gray-300" />
        <span className="mx-4 text-sm">Solve Challenge Feature</span>
        <div className="flex-grow border-t border-dashed border-gray-300" />
      </div>

      <div>
        <div className="pb-2">
          To enable challenge solver enter your Grok API key here:
          <br />
          <span className="text-sm">
            (Don’t have one?&nbsp;
            <a
              className="text-blue-300 underline"
              href="https://console.groq.com/"
              onClick={(e) => {
                e.preventDefault();
                invoke('open_external', { url: 'https://console.groq.com/' })
                  .catch(() => {});
              }}
            >
              Create one here
            </a>
            — <span className="font-semibold">it’s FREE</span>
          </span>
          )
        </div>
      </div>
      <div className="flex gap-4">
        <input
          type="password"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            setIsSaveDisabled(false);
          }}
          className="w-full bg-white outline-none rounded-lg text-black"
        />

        <button
          type="button"
          disabled={isSaveDisabled}
          className="shadow-lg cursor-pointer font-bold px-4 rounded-lg bg-[#4caf50] disabled:bg-[#E0E0E0] disabled:text-[#9E9E9E] disabled:cursor-default"
          onClick={() => {
            invoke('save_api_key', { apiKey }).catch(() => {});
            setIsSaveDisabled(true);
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<TypeWinner />} />
      </Routes>
    </Router>
  );
}
