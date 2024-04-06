"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMicVAD = exports.defaultReactRealTimeVADOptions = exports.utils = void 0;
const vad_web_1 = require("@ricky0123/vad-web");
const react_1 = __importStar(require("react"));
var vad_web_2 = require("@ricky0123/vad-web");
Object.defineProperty(exports, "utils", { enumerable: true, get: function () { return vad_web_2.utils; } });
const defaultReactOptions = {
    startOnLoad: true,
    userSpeakingThreshold: 0.6,
};
exports.defaultReactRealTimeVADOptions = {
    ...vad_web_1.defaultRealTimeVADOptions,
    ...defaultReactOptions,
};
const reactOptionKeys = Object.keys(defaultReactOptions);
const vadOptionKeys = Object.keys(vad_web_1.defaultRealTimeVADOptions);
const _filter = (keys, obj) => {
    return keys.reduce((acc, key) => {
        acc[key] = obj[key];
        return acc;
    }, {});
};
function useOptions(options) {
    options = { ...exports.defaultReactRealTimeVADOptions, ...options };
    const reactOptions = _filter(reactOptionKeys, options);
    const vadOptions = _filter(vadOptionKeys, options);
    return [reactOptions, vadOptions];
}
function useEventCallback(fn) {
    const ref = react_1.default.useRef(fn);
    // we copy a ref to the callback scoped to the current state/props on each render
    useIsomorphicLayoutEffect(() => {
        ref.current = fn;
    });
    return react_1.default.useCallback((...args) => ref.current.apply(void 0, args), []);
}
function useMicVAD(options) {
    const [reactOptions, vadOptions] = useOptions(options);
    const [userSpeaking, updateUserSpeaking] = (0, react_1.useReducer)((state, isSpeechProbability) => isSpeechProbability > reactOptions.userSpeakingThreshold, false);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [errored, setErrored] = (0, react_1.useState)(false);
    const [listening, setListening] = (0, react_1.useState)(false);
    const [vad, setVAD] = (0, react_1.useState)(null);
    const userOnFrameProcessed = useEventCallback(vadOptions.onFrameProcessed);
    vadOptions.onFrameProcessed = useEventCallback((probs) => {
        updateUserSpeaking(probs.isSpeech);
        userOnFrameProcessed;
    });
    const { onSpeechEnd, onSpeechStart, onVADMisfire } = vadOptions;
    const _onSpeechEnd = useEventCallback(onSpeechEnd);
    const _onSpeechStart = useEventCallback(onSpeechStart);
    const _onVADMisfire = useEventCallback(onVADMisfire);
    vadOptions.onSpeechEnd = _onSpeechEnd;
    vadOptions.onSpeechStart = _onSpeechStart;
    vadOptions.onVADMisfire = _onVADMisfire;
    // Handling the new onAudioFrame option
    const userOnAudioFrame = options.onAudioFrame;
    (0, react_1.useEffect)(() => {
        let myvad;
        let canceled = false;
        const setup = async () => {
            try {
                // Include the onAudioFrame callback in the vadOptions before creating the MicVAD instance
                const extendedVadOptions = {
                    ...vadOptions,
                    onAudioFrame: (audioFrame) => {
                        // Invoke user-provided onAudioFrame callback
                        if (userOnAudioFrame) {
                            userOnAudioFrame(audioFrame);
                        }
                    },
                };
                myvad = await vad_web_1.MicVAD.new(extendedVadOptions);
                if (canceled) {
                    myvad.destroy();
                    return;
                }
            }
            catch (e) {
                setLoading(false);
                setErrored({ message: e instanceof Error ? e.message : String(e) });
                return;
            }
            setVAD(myvad);
            setLoading(false);
            if (reactOptions.startOnLoad) {
                myvad?.start();
                setListening(true);
            }
        };
        setup().catch((e) => {
            console.error("MicVAD setup failed:", e);
        });
        return function cleanUp() {
            myvad?.destroy();
            canceled = true;
            if (!loading && !errored) {
                setListening(false);
            }
        };
    }, [options]);
    const pause = () => {
        if (!loading && !errored) {
            vad?.pause();
            setListening(false);
        }
    };
    const start = () => {
        if (!loading && !errored) {
            vad?.start();
            setListening(true);
        }
    };
    const toggle = () => {
        if (listening) {
            pause();
        }
        else {
            start();
        }
    };
    return {
        listening,
        errored,
        loading,
        userSpeaking,
        pause,
        start,
        toggle,
    };
}
exports.useMicVAD = useMicVAD;
const useIsomorphicLayoutEffect = typeof window !== "undefined" &&
    typeof window.document !== "undefined" &&
    typeof window.document.createElement !== "undefined"
    ? react_1.default.useLayoutEffect
    : react_1.default.useEffect;
//# sourceMappingURL=index.js.map