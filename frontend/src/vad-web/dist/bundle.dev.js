/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("onnxruntime-web"));
	else if(typeof define === 'function' && define.amd)
		define(["onnxruntime-web"], factory);
	else if(typeof exports === 'object')
		exports["vad"] = factory(require("onnxruntime-web"));
	else
		root["vad"] = factory(root["ort"]);
})(self, (__WEBPACK_EXTERNAL_MODULE_onnxruntime_web__) => {
return /******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./dist/_common/frame-processor.js":
/*!*****************************************!*\
  !*** ./dist/_common/frame-processor.js ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   FrameProcessor: () => (/* binding */ FrameProcessor),\n/* harmony export */   defaultFrameProcessorOptions: () => (/* binding */ defaultFrameProcessorOptions),\n/* harmony export */   validateOptions: () => (/* binding */ validateOptions)\n/* harmony export */ });\n/* harmony import */ var _messages__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./messages */ \"./dist/_common/messages.js\");\n/* harmony import */ var _logging__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./logging */ \"./dist/_common/logging.js\");\n/*\nSome of this code, together with the default options found in index.ts,\nwere taken (or took inspiration) from https://github.com/snakers4/silero-vad\n*/\n\n\nconst RECOMMENDED_FRAME_SAMPLES = [512, 1024, 1536];\nconst defaultFrameProcessorOptions = {\n    positiveSpeechThreshold: 0.5,\n    negativeSpeechThreshold: 0.5 - 0.15,\n    preSpeechPadFrames: 1,\n    redemptionFrames: 8,\n    frameSamples: 1536,\n    minSpeechFrames: 3,\n    submitUserSpeechOnPause: false,\n};\nfunction validateOptions(options) {\n    if (!RECOMMENDED_FRAME_SAMPLES.includes(options.frameSamples)) {\n        _logging__WEBPACK_IMPORTED_MODULE_1__.log.warn(\"You are using an unusual frame size\");\n    }\n    if (options.positiveSpeechThreshold < 0 ||\n        options.negativeSpeechThreshold > 1) {\n        _logging__WEBPACK_IMPORTED_MODULE_1__.log.error(\"postiveSpeechThreshold should be a number between 0 and 1\");\n    }\n    if (options.negativeSpeechThreshold < 0 ||\n        options.negativeSpeechThreshold > options.positiveSpeechThreshold) {\n        _logging__WEBPACK_IMPORTED_MODULE_1__.log.error(\"negativeSpeechThreshold should be between 0 and postiveSpeechThreshold\");\n    }\n    if (options.preSpeechPadFrames < 0) {\n        _logging__WEBPACK_IMPORTED_MODULE_1__.log.error(\"preSpeechPadFrames should be positive\");\n    }\n    if (options.redemptionFrames < 0) {\n        _logging__WEBPACK_IMPORTED_MODULE_1__.log.error(\"preSpeechPadFrames should be positive\");\n    }\n}\nconst concatArrays = (arrays) => {\n    const sizes = arrays.reduce((out, next) => {\n        out.push(out.at(-1) + next.length);\n        return out;\n    }, [0]);\n    const outArray = new Float32Array(sizes.at(-1));\n    arrays.forEach((arr, index) => {\n        const place = sizes[index];\n        outArray.set(arr, place);\n    });\n    return outArray;\n};\nclass FrameProcessor {\n    constructor(modelProcessFunc, modelResetFunc, options) {\n        this.modelProcessFunc = modelProcessFunc;\n        this.modelResetFunc = modelResetFunc;\n        this.options = options;\n        this.speaking = false;\n        this.redemptionCounter = 0;\n        this.active = false;\n        this.reset = () => {\n            this.speaking = false;\n            this.audioBuffer = [];\n            this.modelResetFunc();\n            this.redemptionCounter = 0;\n        };\n        this.pause = () => {\n            this.active = false;\n            if (this.options.submitUserSpeechOnPause) {\n                return this.endSegment();\n            }\n            else {\n                this.reset();\n                return {};\n            }\n        };\n        this.resume = () => {\n            this.active = true;\n        };\n        this.endSegment = () => {\n            const audioBuffer = this.audioBuffer;\n            this.audioBuffer = [];\n            const speaking = this.speaking;\n            this.reset();\n            const speechFrameCount = audioBuffer.reduce((acc, item) => {\n                return acc + +item.isSpeech;\n            }, 0);\n            if (speaking) {\n                if (speechFrameCount >= this.options.minSpeechFrames) {\n                    const audio = concatArrays(audioBuffer.map((item) => item.frame));\n                    return { msg: _messages__WEBPACK_IMPORTED_MODULE_0__.Message.SpeechEnd, audio };\n                }\n                else {\n                    return { msg: _messages__WEBPACK_IMPORTED_MODULE_0__.Message.VADMisfire };\n                }\n            }\n            return {};\n        };\n        this.process = async (frame) => {\n            if (!this.active) {\n                return {};\n            }\n            const probs = await this.modelProcessFunc(frame);\n            this.audioBuffer.push({\n                frame,\n                isSpeech: probs.isSpeech >= this.options.positiveSpeechThreshold,\n            });\n            if (probs.isSpeech >= this.options.positiveSpeechThreshold &&\n                this.redemptionCounter) {\n                this.redemptionCounter = 0;\n            }\n            if (probs.isSpeech >= this.options.positiveSpeechThreshold &&\n                !this.speaking) {\n                this.speaking = true;\n                return { probs, msg: _messages__WEBPACK_IMPORTED_MODULE_0__.Message.SpeechStart };\n            }\n            if (probs.isSpeech < this.options.negativeSpeechThreshold &&\n                this.speaking &&\n                ++this.redemptionCounter >= this.options.redemptionFrames) {\n                this.redemptionCounter = 0;\n                this.speaking = false;\n                const audioBuffer = this.audioBuffer;\n                this.audioBuffer = [];\n                const speechFrameCount = audioBuffer.reduce((acc, item) => {\n                    return acc + +item.isSpeech;\n                }, 0);\n                if (speechFrameCount >= this.options.minSpeechFrames) {\n                    const audio = concatArrays(audioBuffer.map((item) => item.frame));\n                    return { probs, msg: _messages__WEBPACK_IMPORTED_MODULE_0__.Message.SpeechEnd, audio };\n                }\n                else {\n                    return { probs, msg: _messages__WEBPACK_IMPORTED_MODULE_0__.Message.VADMisfire };\n                }\n            }\n            if (!this.speaking) {\n                while (this.audioBuffer.length > this.options.preSpeechPadFrames) {\n                    this.audioBuffer.shift();\n                }\n            }\n            return { probs };\n        };\n        this.audioBuffer = [];\n        this.reset();\n    }\n}\n\n\n//# sourceURL=webpack://vad/./dist/_common/frame-processor.js?");

/***/ }),

/***/ "./dist/_common/index.js":
/*!*******************************!*\
  !*** ./dist/_common/index.js ***!
  \*******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   FrameProcessor: () => (/* reexport safe */ _frame_processor__WEBPACK_IMPORTED_MODULE_2__.FrameProcessor),\n/* harmony export */   LOG_PREFIX: () => (/* reexport safe */ _logging__WEBPACK_IMPORTED_MODULE_4__.LOG_PREFIX),\n/* harmony export */   Message: () => (/* reexport safe */ _messages__WEBPACK_IMPORTED_MODULE_3__.Message),\n/* harmony export */   PlatformAgnosticNonRealTimeVAD: () => (/* reexport safe */ _non_real_time_vad__WEBPACK_IMPORTED_MODULE_1__.PlatformAgnosticNonRealTimeVAD),\n/* harmony export */   Resampler: () => (/* reexport safe */ _resampler__WEBPACK_IMPORTED_MODULE_6__.Resampler),\n/* harmony export */   Silero: () => (/* reexport safe */ _models__WEBPACK_IMPORTED_MODULE_5__.Silero),\n/* harmony export */   defaultFrameProcessorOptions: () => (/* reexport safe */ _frame_processor__WEBPACK_IMPORTED_MODULE_2__.defaultFrameProcessorOptions),\n/* harmony export */   defaultNonRealTimeVADOptions: () => (/* reexport safe */ _non_real_time_vad__WEBPACK_IMPORTED_MODULE_1__.defaultNonRealTimeVADOptions),\n/* harmony export */   log: () => (/* reexport safe */ _logging__WEBPACK_IMPORTED_MODULE_4__.log),\n/* harmony export */   utils: () => (/* binding */ utils),\n/* harmony export */   validateOptions: () => (/* reexport safe */ _frame_processor__WEBPACK_IMPORTED_MODULE_2__.validateOptions)\n/* harmony export */ });\n/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./utils */ \"./dist/_common/utils.js\");\n/* harmony import */ var _non_real_time_vad__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./non-real-time-vad */ \"./dist/_common/non-real-time-vad.js\");\n/* harmony import */ var _frame_processor__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./frame-processor */ \"./dist/_common/frame-processor.js\");\n/* harmony import */ var _messages__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./messages */ \"./dist/_common/messages.js\");\n/* harmony import */ var _logging__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./logging */ \"./dist/_common/logging.js\");\n/* harmony import */ var _models__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./models */ \"./dist/_common/models.js\");\n/* harmony import */ var _resampler__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./resampler */ \"./dist/_common/resampler.js\");\n\nconst utils = {\n    minFramesForTargetMS: _utils__WEBPACK_IMPORTED_MODULE_0__.minFramesForTargetMS,\n    arrayBufferToBase64: _utils__WEBPACK_IMPORTED_MODULE_0__.arrayBufferToBase64,\n    encodeWAV: _utils__WEBPACK_IMPORTED_MODULE_0__.encodeWAV,\n};\n\n\n\n\n\n\n\n\n//# sourceURL=webpack://vad/./dist/_common/index.js?");

/***/ }),

/***/ "./dist/_common/logging.js":
/*!*********************************!*\
  !*** ./dist/_common/logging.js ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   LOG_PREFIX: () => (/* binding */ LOG_PREFIX),\n/* harmony export */   log: () => (/* binding */ log)\n/* harmony export */ });\nconst LOG_PREFIX = \"[VAD]\";\nconst levels = [\"error\", \"debug\", \"warn\"];\nfunction getLog(level) {\n    return (...args) => {\n        console[level](LOG_PREFIX, ...args);\n    };\n}\nconst _log = levels.reduce((acc, level) => {\n    acc[level] = getLog(level);\n    return acc;\n}, {});\nconst log = _log;\n\n\n//# sourceURL=webpack://vad/./dist/_common/logging.js?");

/***/ }),

/***/ "./dist/_common/messages.js":
/*!**********************************!*\
  !*** ./dist/_common/messages.js ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   Message: () => (/* binding */ Message)\n/* harmony export */ });\nvar Message;\n(function (Message) {\n    Message[\"AudioFrame\"] = \"AUDIO_FRAME\";\n    Message[\"SpeechStart\"] = \"SPEECH_START\";\n    Message[\"VADMisfire\"] = \"VAD_MISFIRE\";\n    Message[\"SpeechEnd\"] = \"SPEECH_END\";\n    Message[\"SpeechStop\"] = \"SPEECH_STOP\";\n    Message[\"AudioData\"] = \"audio-data\";\n})(Message || (Message = {}));\n\n\n//# sourceURL=webpack://vad/./dist/_common/messages.js?");

/***/ }),

/***/ "./dist/_common/models.js":
/*!********************************!*\
  !*** ./dist/_common/models.js ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   Silero: () => (/* binding */ Silero)\n/* harmony export */ });\n/* harmony import */ var _logging__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./logging */ \"./dist/_common/logging.js\");\nvar _a;\n// @ts-ignore\n\nclass Silero {\n    constructor(ort, modelFetcher) {\n        this.ort = ort;\n        this.modelFetcher = modelFetcher;\n        this.init = async () => {\n            _logging__WEBPACK_IMPORTED_MODULE_0__.log.debug(\"initializing vad\");\n            const modelArrayBuffer = await this.modelFetcher();\n            this._session = await this.ort.InferenceSession.create(modelArrayBuffer);\n            this._sr = new this.ort.Tensor(\"int64\", [16000n]);\n            this.reset_state();\n            _logging__WEBPACK_IMPORTED_MODULE_0__.log.debug(\"vad is initialized\");\n        };\n        this.reset_state = () => {\n            const zeroes = Array(2 * 64).fill(0);\n            this._h = new this.ort.Tensor(\"float32\", zeroes, [2, 1, 64]);\n            this._c = new this.ort.Tensor(\"float32\", zeroes, [2, 1, 64]);\n        };\n        this.process = async (audioFrame) => {\n            const t = new this.ort.Tensor(\"float32\", audioFrame, [1, audioFrame.length]);\n            const inputs = {\n                input: t,\n                h: this._h,\n                c: this._c,\n                sr: this._sr,\n            };\n            const out = await this._session.run(inputs);\n            this._h = out.hn;\n            this._c = out.cn;\n            const [isSpeech] = out.output.data;\n            const notSpeech = 1 - isSpeech;\n            return { notSpeech, isSpeech };\n        };\n    }\n}\n_a = Silero;\nSilero.new = async (ort, modelFetcher) => {\n    const model = new Silero(ort, modelFetcher);\n    await model.init();\n    return model;\n};\n\n\n//# sourceURL=webpack://vad/./dist/_common/models.js?");

/***/ }),

/***/ "./dist/_common/non-real-time-vad.js":
/*!*******************************************!*\
  !*** ./dist/_common/non-real-time-vad.js ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   PlatformAgnosticNonRealTimeVAD: () => (/* binding */ PlatformAgnosticNonRealTimeVAD),\n/* harmony export */   defaultNonRealTimeVADOptions: () => (/* binding */ defaultNonRealTimeVADOptions)\n/* harmony export */ });\n/* harmony import */ var _frame_processor__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./frame-processor */ \"./dist/_common/frame-processor.js\");\n/* harmony import */ var _messages__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./messages */ \"./dist/_common/messages.js\");\n/* harmony import */ var _models__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./models */ \"./dist/_common/models.js\");\n/* harmony import */ var _resampler__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./resampler */ \"./dist/_common/resampler.js\");\n\n\n\n\nconst defaultNonRealTimeVADOptions = {\n    ..._frame_processor__WEBPACK_IMPORTED_MODULE_0__.defaultFrameProcessorOptions,\n    ortConfig: undefined\n};\nclass PlatformAgnosticNonRealTimeVAD {\n    static async _new(modelFetcher, ort, options = {}) {\n        const fullOptions = {\n            ...defaultNonRealTimeVADOptions,\n            ...options,\n        };\n        if (fullOptions.ortConfig !== undefined) {\n            fullOptions.ortConfig(ort);\n        }\n        const vad = new this(modelFetcher, ort, fullOptions);\n        await vad.init();\n        return vad;\n    }\n    constructor(modelFetcher, ort, options) {\n        this.modelFetcher = modelFetcher;\n        this.ort = ort;\n        this.options = options;\n        this.init = async () => {\n            const model = await _models__WEBPACK_IMPORTED_MODULE_2__.Silero.new(this.ort, this.modelFetcher);\n            this.frameProcessor = new _frame_processor__WEBPACK_IMPORTED_MODULE_0__.FrameProcessor(model.process, model.reset_state, {\n                frameSamples: this.options.frameSamples,\n                positiveSpeechThreshold: this.options.positiveSpeechThreshold,\n                negativeSpeechThreshold: this.options.negativeSpeechThreshold,\n                redemptionFrames: this.options.redemptionFrames,\n                preSpeechPadFrames: this.options.preSpeechPadFrames,\n                minSpeechFrames: this.options.minSpeechFrames,\n                submitUserSpeechOnPause: this.options.submitUserSpeechOnPause,\n            });\n            this.frameProcessor.resume();\n        };\n        this.run = async function* (inputAudio, sampleRate) {\n            const resamplerOptions = {\n                nativeSampleRate: sampleRate,\n                targetSampleRate: 16000,\n                targetFrameSize: this.options.frameSamples,\n            };\n            const resampler = new _resampler__WEBPACK_IMPORTED_MODULE_3__.Resampler(resamplerOptions);\n            const frames = resampler.process(inputAudio);\n            let start, end;\n            for (const i of [...Array(frames.length)].keys()) {\n                const f = frames[i];\n                const { msg, audio } = await this.frameProcessor.process(f);\n                switch (msg) {\n                    case _messages__WEBPACK_IMPORTED_MODULE_1__.Message.SpeechStart:\n                        start = (i * this.options.frameSamples) / 16;\n                        break;\n                    case _messages__WEBPACK_IMPORTED_MODULE_1__.Message.SpeechEnd:\n                        end = ((i + 1) * this.options.frameSamples) / 16;\n                        // @ts-ignore\n                        yield { audio, start, end };\n                        break;\n                    default:\n                        break;\n                }\n            }\n            const { msg, audio } = this.frameProcessor.endSegment();\n            if (msg == _messages__WEBPACK_IMPORTED_MODULE_1__.Message.SpeechEnd) {\n                yield {\n                    audio,\n                    // @ts-ignore\n                    start,\n                    end: (frames.length * this.options.frameSamples) / 16,\n                };\n            }\n        };\n        (0,_frame_processor__WEBPACK_IMPORTED_MODULE_0__.validateOptions)(options);\n    }\n}\n\n\n//# sourceURL=webpack://vad/./dist/_common/non-real-time-vad.js?");

/***/ }),

/***/ "./dist/_common/resampler.js":
/*!***********************************!*\
  !*** ./dist/_common/resampler.js ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   Resampler: () => (/* binding */ Resampler)\n/* harmony export */ });\n/* harmony import */ var _logging__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./logging */ \"./dist/_common/logging.js\");\n\nclass Resampler {\n    constructor(options) {\n        this.options = options;\n        this.process = (audioFrame) => {\n            const outputFrames = [];\n            for (const sample of audioFrame) {\n                this.inputBuffer.push(sample);\n            }\n            while ((this.inputBuffer.length * this.options.targetSampleRate) /\n                this.options.nativeSampleRate >\n                this.options.targetFrameSize) {\n                const outputFrame = new Float32Array(this.options.targetFrameSize);\n                let outputIndex = 0;\n                let inputIndex = 0;\n                while (outputIndex < this.options.targetFrameSize) {\n                    let sum = 0;\n                    let num = 0;\n                    while (inputIndex <\n                        Math.min(this.inputBuffer.length, ((outputIndex + 1) * this.options.nativeSampleRate) /\n                            this.options.targetSampleRate)) {\n                        sum += this.inputBuffer[inputIndex];\n                        num++;\n                        inputIndex++;\n                    }\n                    outputFrame[outputIndex] = sum / num;\n                    outputIndex++;\n                }\n                this.inputBuffer = this.inputBuffer.slice(inputIndex);\n                outputFrames.push(outputFrame);\n            }\n            return outputFrames;\n        };\n        if (options.nativeSampleRate < 16000) {\n            _logging__WEBPACK_IMPORTED_MODULE_0__.log.error(\"nativeSampleRate is too low. Should have 16000 = targetSampleRate <= nativeSampleRate\");\n        }\n        this.inputBuffer = [];\n    }\n}\n\n\n//# sourceURL=webpack://vad/./dist/_common/resampler.js?");

/***/ }),

/***/ "./dist/_common/utils.js":
/*!*******************************!*\
  !*** ./dist/_common/utils.js ***!
  \*******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   arrayBufferToBase64: () => (/* binding */ arrayBufferToBase64),\n/* harmony export */   encodeWAV: () => (/* binding */ encodeWAV),\n/* harmony export */   minFramesForTargetMS: () => (/* binding */ minFramesForTargetMS)\n/* harmony export */ });\nfunction minFramesForTargetMS(targetDuration, frameSamples, sr = 16000) {\n    return Math.ceil((targetDuration * sr) / 1000 / frameSamples);\n}\nfunction arrayBufferToBase64(buffer) {\n    var binary = \"\";\n    var bytes = new Uint8Array(buffer);\n    var len = bytes.byteLength;\n    for (var i = 0; i < len; i++) {\n        binary += String.fromCharCode(bytes[i]);\n    }\n    return btoa(binary);\n}\n/*\nThis rest of this was mostly copied from https://github.com/linto-ai/WebVoiceSDK\n*/\nfunction encodeWAV(samples, format = 3, sampleRate = 16000, numChannels = 1, bitDepth = 32) {\n    var bytesPerSample = bitDepth / 8;\n    var blockAlign = numChannels * bytesPerSample;\n    var buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);\n    var view = new DataView(buffer);\n    /* RIFF identifier */\n    writeString(view, 0, \"RIFF\");\n    /* RIFF chunk length */\n    view.setUint32(4, 36 + samples.length * bytesPerSample, true);\n    /* RIFF type */\n    writeString(view, 8, \"WAVE\");\n    /* format chunk identifier */\n    writeString(view, 12, \"fmt \");\n    /* format chunk length */\n    view.setUint32(16, 16, true);\n    /* sample format (raw) */\n    view.setUint16(20, format, true);\n    /* channel count */\n    view.setUint16(22, numChannels, true);\n    /* sample rate */\n    view.setUint32(24, sampleRate, true);\n    /* byte rate (sample rate * block align) */\n    view.setUint32(28, sampleRate * blockAlign, true);\n    /* block align (channel count * bytes per sample) */\n    view.setUint16(32, blockAlign, true);\n    /* bits per sample */\n    view.setUint16(34, bitDepth, true);\n    /* data chunk identifier */\n    writeString(view, 36, \"data\");\n    /* data chunk length */\n    view.setUint32(40, samples.length * bytesPerSample, true);\n    if (format === 1) {\n        // Raw PCM\n        floatTo16BitPCM(view, 44, samples);\n    }\n    else {\n        writeFloat32(view, 44, samples);\n    }\n    return buffer;\n}\nfunction interleave(inputL, inputR) {\n    var length = inputL.length + inputR.length;\n    var result = new Float32Array(length);\n    var index = 0;\n    var inputIndex = 0;\n    while (index < length) {\n        result[index++] = inputL[inputIndex];\n        result[index++] = inputR[inputIndex];\n        inputIndex++;\n    }\n    return result;\n}\nfunction writeFloat32(output, offset, input) {\n    for (var i = 0; i < input.length; i++, offset += 4) {\n        output.setFloat32(offset, input[i], true);\n    }\n}\nfunction floatTo16BitPCM(output, offset, input) {\n    for (var i = 0; i < input.length; i++, offset += 2) {\n        var s = Math.max(-1, Math.min(1, input[i]));\n        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);\n    }\n}\nfunction writeString(view, offset, string) {\n    for (var i = 0; i < string.length; i++) {\n        view.setUint8(offset + i, string.charCodeAt(i));\n    }\n}\n\n\n//# sourceURL=webpack://vad/./dist/_common/utils.js?");

/***/ }),

/***/ "./dist/asset-path.js":
/*!****************************!*\
  !*** ./dist/asset-path.js ***!
  \****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   assetPath: () => (/* binding */ assetPath)\n/* harmony export */ });\n// nextjs@14 bundler may attempt to execute this during SSR and crash\nconst isWeb = typeof window !== \"undefined\" && typeof window.document !== \"undefined\";\nconst currentScript = isWeb\n    ? window.document.currentScript\n    : null;\nlet basePath = \"/\";\nif (currentScript) {\n    basePath = currentScript.src\n        .replace(/#.*$/, \"\")\n        .replace(/\\?.*$/, \"\")\n        .replace(/\\/[^\\/]+$/, \"/\");\n}\nconst assetPath = (file) => {\n    return basePath + file;\n};\n\n\n//# sourceURL=webpack://vad/./dist/asset-path.js?");

/***/ }),

/***/ "./dist/default-model-fetcher.js":
/*!***************************************!*\
  !*** ./dist/default-model-fetcher.js ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   defaultModelFetcher: () => (/* binding */ defaultModelFetcher)\n/* harmony export */ });\nconst defaultModelFetcher = (path) => {\n    return fetch(path).then((model) => model.arrayBuffer());\n};\n\n\n//# sourceURL=webpack://vad/./dist/default-model-fetcher.js?");

/***/ }),

/***/ "./dist/index.js":
/*!***********************!*\
  !*** ./dist/index.js ***!
  \***********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   AudioNodeVAD: () => (/* reexport safe */ _real_time_vad__WEBPACK_IMPORTED_MODULE_5__.AudioNodeVAD),\n/* harmony export */   FrameProcessor: () => (/* reexport safe */ _common__WEBPACK_IMPORTED_MODULE_1__.FrameProcessor),\n/* harmony export */   Message: () => (/* reexport safe */ _common__WEBPACK_IMPORTED_MODULE_1__.Message),\n/* harmony export */   MicVAD: () => (/* reexport safe */ _real_time_vad__WEBPACK_IMPORTED_MODULE_5__.MicVAD),\n/* harmony export */   NonRealTimeVAD: () => (/* binding */ NonRealTimeVAD),\n/* harmony export */   defaultNonRealTimeVADOptions: () => (/* binding */ defaultNonRealTimeVADOptions),\n/* harmony export */   defaultRealTimeVADOptions: () => (/* reexport safe */ _real_time_vad__WEBPACK_IMPORTED_MODULE_5__.defaultRealTimeVADOptions),\n/* harmony export */   utils: () => (/* binding */ utils)\n/* harmony export */ });\n/* harmony import */ var onnxruntime_web__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! onnxruntime-web */ \"onnxruntime-web\");\n/* harmony import */ var onnxruntime_web__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(onnxruntime_web__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _common__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./_common */ \"./dist/_common/index.js\");\n/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./utils */ \"./dist/utils.js\");\n/* harmony import */ var _default_model_fetcher__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./default-model-fetcher */ \"./dist/default-model-fetcher.js\");\n/* harmony import */ var _asset_path__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./asset-path */ \"./dist/asset-path.js\");\n/* harmony import */ var _real_time_vad__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./real-time-vad */ \"./dist/real-time-vad.js\");\n\n\n\n\n\nconst defaultNonRealTimeVADOptions = {\n    modelURL: (0,_asset_path__WEBPACK_IMPORTED_MODULE_4__.assetPath)(\"silero_vad.onnx\"),\n    modelFetcher: _default_model_fetcher__WEBPACK_IMPORTED_MODULE_3__.defaultModelFetcher,\n};\nclass NonRealTimeVAD extends _common__WEBPACK_IMPORTED_MODULE_1__.PlatformAgnosticNonRealTimeVAD {\n    static async new(options = {}) {\n        const { modelURL, modelFetcher } = {\n            ...defaultNonRealTimeVADOptions,\n            ...options,\n        };\n        return await this._new(() => modelFetcher(modelURL), onnxruntime_web__WEBPACK_IMPORTED_MODULE_0__, options);\n    }\n}\nconst utils = { audioFileToArray: _utils__WEBPACK_IMPORTED_MODULE_2__.audioFileToArray, ..._common__WEBPACK_IMPORTED_MODULE_1__.utils };\n\n\n\n\n//# sourceURL=webpack://vad/./dist/index.js?");

/***/ }),

/***/ "./dist/real-time-vad.js":
/*!*******************************!*\
  !*** ./dist/real-time-vad.js ***!
  \*******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   AudioNodeVAD: () => (/* binding */ AudioNodeVAD),\n/* harmony export */   MicVAD: () => (/* binding */ MicVAD),\n/* harmony export */   defaultRealTimeVADOptions: () => (/* binding */ defaultRealTimeVADOptions),\n/* harmony export */   ort: () => (/* binding */ ort)\n/* harmony export */ });\n/* harmony import */ var onnxruntime_web__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! onnxruntime-web */ \"onnxruntime-web\");\n/* harmony import */ var onnxruntime_web__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(onnxruntime_web__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _common__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./_common */ \"./dist/_common/index.js\");\n/* harmony import */ var _asset_path__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./asset-path */ \"./dist/asset-path.js\");\n/* harmony import */ var _default_model_fetcher__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./default-model-fetcher */ \"./dist/default-model-fetcher.js\");\n\n\n\n\nconst ort = onnxruntime_web__WEBPACK_IMPORTED_MODULE_0__;\nconst defaultRealTimeVADOptions = {\n    ..._common__WEBPACK_IMPORTED_MODULE_1__.defaultFrameProcessorOptions,\n    onFrameProcessed: (probabilities) => { },\n    onVADMisfire: () => {\n        _common__WEBPACK_IMPORTED_MODULE_1__.log.debug(\"VAD misfire\");\n    },\n    onSpeechStart: () => {\n        _common__WEBPACK_IMPORTED_MODULE_1__.log.debug(\"Detected speech start\");\n    },\n    onSpeechEnd: () => {\n        _common__WEBPACK_IMPORTED_MODULE_1__.log.debug(\"Detected speech end\");\n    },\n    onAudioFrame: (audioFrame) => {\n        console.log(\"Received an audio frame\");\n    },\n    workletURL: (0,_asset_path__WEBPACK_IMPORTED_MODULE_2__.assetPath)(\"vad.worklet.bundle.min.js\"),\n    modelURL: (0,_asset_path__WEBPACK_IMPORTED_MODULE_2__.assetPath)(\"silero_vad.onnx\"),\n    modelFetcher: _default_model_fetcher__WEBPACK_IMPORTED_MODULE_3__.defaultModelFetcher,\n    stream: undefined,\n    ortConfig: undefined\n};\nclass MicVAD {\n    static async new(options = {}) {\n        const fullOptions = {\n            ...defaultRealTimeVADOptions,\n            ...options,\n        };\n        (0,_common__WEBPACK_IMPORTED_MODULE_1__.validateOptions)(fullOptions);\n        let stream;\n        if (fullOptions.stream === undefined)\n            stream = await navigator.mediaDevices.getUserMedia({\n                audio: {\n                    ...fullOptions.additionalAudioConstraints,\n                    channelCount: 1,\n                    echoCancellation: true,\n                    autoGainControl: true,\n                    noiseSuppression: true,\n                    ...(fullOptions.additionalAudioConstraints ? fullOptions.additionalAudioConstraints : {}),\n                },\n            });\n        else\n            stream = fullOptions.stream;\n        const audioContext = new AudioContext();\n        const sourceNode = new MediaStreamAudioSourceNode(audioContext, {\n            mediaStream: stream,\n        });\n        const audioNodeVAD = await AudioNodeVAD.new(audioContext, fullOptions);\n        audioNodeVAD.receive(sourceNode);\n        return new MicVAD(fullOptions, audioContext, stream, audioNodeVAD, sourceNode);\n    }\n    constructor(options, audioContext, stream, audioNodeVAD, sourceNode, listening = false) {\n        this.options = options;\n        this.audioContext = audioContext;\n        this.stream = stream;\n        this.audioNodeVAD = audioNodeVAD;\n        this.sourceNode = sourceNode;\n        this.listening = listening;\n        this.pause = () => {\n            this.audioNodeVAD.pause();\n            this.listening = false;\n        };\n        this.start = () => {\n            this.audioNodeVAD.start();\n            this.listening = true;\n        };\n        this.destroy = () => {\n            if (this.listening) {\n                this.pause();\n            }\n            if (this.options.stream === undefined) {\n                this.stream.getTracks().forEach((track) => track.stop());\n            }\n            this.sourceNode.disconnect();\n            this.audioNodeVAD.destroy();\n            this.audioContext.close();\n        };\n    }\n}\nclass AudioNodeVAD {\n    static async new(ctx, options = {}) {\n        const fullOptions = {\n            ...defaultRealTimeVADOptions,\n            ...options,\n        };\n        (0,_common__WEBPACK_IMPORTED_MODULE_1__.validateOptions)(fullOptions);\n        if (fullOptions.ortConfig !== undefined) {\n            fullOptions.ortConfig(ort);\n        }\n        try {\n            await ctx.audioWorklet.addModule(fullOptions.workletURL);\n        }\n        catch (e) {\n            console.error(`Encountered an error while loading worklet. Please make sure the worklet vad.bundle.min.js included with @ricky0123/vad-web is available at the specified path:\n        ${fullOptions.workletURL}\n        If need be, you can customize the worklet file location using the \\`workletURL\\` option.`);\n            throw e;\n        }\n        const vadNode = new AudioWorkletNode(ctx, \"vad-helper-worklet\", {\n            processorOptions: {\n                frameSamples: fullOptions.frameSamples,\n            },\n        });\n        let model;\n        try {\n            model = await _common__WEBPACK_IMPORTED_MODULE_1__.Silero.new(ort, () => fullOptions.modelFetcher(fullOptions.modelURL));\n        }\n        catch (e) {\n            console.error(`Encountered an error while loading model file. Please make sure silero_vad.onnx, included with @ricky0123/vad-web, is available at the specified path:\n      ${fullOptions.modelURL}\n      If need be, you can customize the model file location using the \\`modelsURL\\` option.`);\n            throw e;\n        }\n        const frameProcessor = new _common__WEBPACK_IMPORTED_MODULE_1__.FrameProcessor(model.process, model.reset_state, {\n            frameSamples: fullOptions.frameSamples,\n            positiveSpeechThreshold: fullOptions.positiveSpeechThreshold,\n            negativeSpeechThreshold: fullOptions.negativeSpeechThreshold,\n            redemptionFrames: fullOptions.redemptionFrames,\n            preSpeechPadFrames: fullOptions.preSpeechPadFrames,\n            minSpeechFrames: fullOptions.minSpeechFrames,\n            submitUserSpeechOnPause: fullOptions.submitUserSpeechOnPause,\n        });\n        const audioNodeVAD = new AudioNodeVAD(ctx, fullOptions, frameProcessor, vadNode);\n        vadNode.port.onmessage = async (ev) => {\n            switch (ev.data?.message) {\n                case _common__WEBPACK_IMPORTED_MODULE_1__.Message.AudioFrame:\n                    const buffer = ev.data.data;\n                    const frame = new Float32Array(buffer);\n                    await audioNodeVAD.processFrame(frame);\n                    break;\n                default:\n                    break;\n            }\n        };\n        return audioNodeVAD;\n    }\n    constructor(ctx, options, frameProcessor, entryNode) {\n        this.ctx = ctx;\n        this.options = options;\n        this.frameProcessor = frameProcessor;\n        this.entryNode = entryNode;\n        this.pause = () => {\n            const ev = this.frameProcessor.pause();\n            this.handleFrameProcessorEvent(ev);\n        };\n        this.start = () => {\n            this.frameProcessor.resume();\n        };\n        this.receive = (node) => {\n            node.connect(this.entryNode);\n        };\n        this.processFrame = async (frame) => {\n            const ev = await this.frameProcessor.process(frame);\n            this.handleFrameProcessorEvent(ev);\n            // Invoke the onAudioFrame callback with the current frame\n            this.options.onAudioFrame(frame);\n        };\n        this.handleFrameProcessorEvent = (ev) => {\n            if (ev.probs !== undefined) {\n                this.options.onFrameProcessed(ev.probs);\n            }\n            switch (ev.msg) {\n                case _common__WEBPACK_IMPORTED_MODULE_1__.Message.SpeechStart:\n                    this.options.onSpeechStart();\n                    break;\n                case _common__WEBPACK_IMPORTED_MODULE_1__.Message.VADMisfire:\n                    this.options.onVADMisfire();\n                    break;\n                case _common__WEBPACK_IMPORTED_MODULE_1__.Message.SpeechEnd:\n                    this.options.onSpeechEnd(ev.audio);\n                    break;\n                default:\n                    break;\n            }\n        };\n        this.destroy = () => {\n            this.entryNode.port.postMessage({\n                message: _common__WEBPACK_IMPORTED_MODULE_1__.Message.SpeechStop,\n            });\n            this.entryNode.disconnect();\n        };\n    }\n}\n\n\n//# sourceURL=webpack://vad/./dist/real-time-vad.js?");

/***/ }),

/***/ "./dist/utils.js":
/*!***********************!*\
  !*** ./dist/utils.js ***!
  \***********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   audioFileToArray: () => (/* binding */ audioFileToArray)\n/* harmony export */ });\nasync function audioFileToArray(audioFileData) {\n    const ctx = new OfflineAudioContext(1, 1, 44100);\n    const reader = new FileReader();\n    let audioBuffer = null;\n    await new Promise((res) => {\n        reader.addEventListener(\"loadend\", (ev) => {\n            const audioData = reader.result;\n            ctx.decodeAudioData(audioData, (buffer) => {\n                audioBuffer = buffer;\n                ctx\n                    .startRendering()\n                    .then((renderedBuffer) => {\n                    console.log(\"Rendering completed successfully\");\n                    res();\n                })\n                    .catch((err) => {\n                    console.error(`Rendering failed: ${err}`);\n                });\n            }, (e) => {\n                console.log(`Error with decoding audio data: ${e}`);\n            });\n        });\n        reader.readAsArrayBuffer(audioFileData);\n    });\n    if (audioBuffer === null) {\n        throw Error(\"some shit\");\n    }\n    let _audioBuffer = audioBuffer;\n    let out = new Float32Array(_audioBuffer.length);\n    for (let i = 0; i < _audioBuffer.length; i++) {\n        for (let j = 0; j < _audioBuffer.numberOfChannels; j++) {\n            // @ts-ignore\n            out[i] += _audioBuffer.getChannelData(j)[i];\n        }\n    }\n    return { audio: out, sampleRate: _audioBuffer.sampleRate };\n}\n\n\n//# sourceURL=webpack://vad/./dist/utils.js?");

/***/ }),

/***/ "onnxruntime-web":
/*!******************************************************************************************************************!*\
  !*** external {"commonjs":"onnxruntime-web","commonjs2":"onnxruntime-web","amd":"onnxruntime-web","root":"ort"} ***!
  \******************************************************************************************************************/
/***/ ((module) => {

module.exports = __WEBPACK_EXTERNAL_MODULE_onnxruntime_web__;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = __webpack_require__("./dist/index.js");
/******/ 	
/******/ 	return __webpack_exports__;
/******/ })()
;
});