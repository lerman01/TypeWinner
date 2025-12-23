import { MemoryRouter as Router, Route, Routes } from 'react-router-dom';
import './tailwind.css';
import { useEffect, useState } from 'react';
import Slider from 'rc-slider';
import icon from '../../assets/icon.png';
import 'rc-slider/assets/index.css';

function TypeWinner() {
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isSaveDisabled, setIsSaveDisabled] = useState(true);
  const [speedRange, setSpeedRange] = useState<number[]>([375, 380]);
  const [errRate, setErrRate] = useState<number>(10);

  useEffect(() => {
    window.api.enableBrowser(() => {
      setIsBrowserOpen(false);
    });

    (async () => {
      const cachedApiKey = await window.api.getApiKey();
      if (cachedApiKey) {
        setApiKey(cachedApiKey);
      }
    })();
  }, []);

  useEffect(() => {
    window.api
      .updateTypeSpeed({ min: speedRange[0], max: speedRange[1] })
      .catch(() => {});
  }, [speedRange]);

  useEffect(() => {
    window.api.updateErrRate(errRate).catch(() => {});
  }, [errRate]);

  return (
    <div className="px-4 pb-4">
      <div className="flex items-center gap-2 drag-region pt-4">
        <img className="w-8" src={icon} alt="icon" />
        <div className="text-2xl font-bold">TypeWinner</div>
        <div className="ml-auto">
          <button
            type="button"
            className="bg-white text-[#005894] rounded-full size-6 font-black cursor-pointer mx-auto"
            onClick={window.api.quit}
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
          onClick={() => {
            window.api.openBrowser().catch(() => {});
            setIsBrowserOpen(true);
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
              href="https://www.google.co.il"
              onClick={(e) => {
                e.preventDefault();
                window.api
                  .openExternal('https://console.groq.com/')
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
            window.api.saveApiKey(apiKey).catch(() => {});
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
