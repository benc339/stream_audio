import { defaultFrameProcessorOptions, FrameProcessor, validateOptions, } from "./frame-processor";
import { Message } from "./messages";
import { Silero } from "./models";
import { Resampler } from "./resampler";
export const defaultNonRealTimeVADOptions = {
    ...defaultFrameProcessorOptions,
    ortConfig: undefined
};
export class PlatformAgnosticNonRealTimeVAD {
    static async _new(modelFetcher, ort, options = {}) {
        const fullOptions = {
            ...defaultNonRealTimeVADOptions,
            ...options,
        };
        if (fullOptions.ortConfig !== undefined) {
            fullOptions.ortConfig(ort);
        }
        const vad = new this(modelFetcher, ort, fullOptions);
        await vad.init();
        return vad;
    }
    constructor(modelFetcher, ort, options) {
        this.modelFetcher = modelFetcher;
        this.ort = ort;
        this.options = options;
        this.init = async () => {
            const model = await Silero.new(this.ort, this.modelFetcher);
            this.frameProcessor = new FrameProcessor(model.process, model.reset_state, {
                frameSamples: this.options.frameSamples,
                positiveSpeechThreshold: this.options.positiveSpeechThreshold,
                negativeSpeechThreshold: this.options.negativeSpeechThreshold,
                redemptionFrames: this.options.redemptionFrames,
                preSpeechPadFrames: this.options.preSpeechPadFrames,
                minSpeechFrames: this.options.minSpeechFrames,
                submitUserSpeechOnPause: this.options.submitUserSpeechOnPause,
            });
            this.frameProcessor.resume();
        };
        this.run = async function* (inputAudio, sampleRate) {
            const resamplerOptions = {
                nativeSampleRate: sampleRate,
                targetSampleRate: 16000,
                targetFrameSize: this.options.frameSamples,
            };
            const resampler = new Resampler(resamplerOptions);
            const frames = resampler.process(inputAudio);
            let start, end;
            for (const i of [...Array(frames.length)].keys()) {
                const f = frames[i];
                const { msg, audio } = await this.frameProcessor.process(f);
                switch (msg) {
                    case Message.SpeechStart:
                        start = (i * this.options.frameSamples) / 16;
                        break;
                    case Message.SpeechEnd:
                        end = ((i + 1) * this.options.frameSamples) / 16;
                        // @ts-ignore
                        yield { audio, start, end };
                        break;
                    default:
                        break;
                }
            }
            const { msg, audio } = this.frameProcessor.endSegment();
            if (msg == Message.SpeechEnd) {
                yield {
                    audio,
                    // @ts-ignore
                    start,
                    end: (frames.length * this.options.frameSamples) / 16,
                };
            }
        };
        validateOptions(options);
    }
}
