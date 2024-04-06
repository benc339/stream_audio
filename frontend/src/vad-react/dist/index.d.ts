import type { RealTimeVADOptions } from "@ricky0123/vad-web";
export { utils } from "@ricky0123/vad-web";
interface ReactOptions {
    startOnLoad: boolean;
    userSpeakingThreshold: number;
}
export type ReactRealTimeVADOptions = RealTimeVADOptions & ReactOptions & {
    onAudioFrame?: (audioFrame: Float32Array) => any;
};
export declare const defaultReactRealTimeVADOptions: {
    startOnLoad: boolean;
    userSpeakingThreshold: number;
    stream: MediaStream;
    positiveSpeechThreshold: number;
    negativeSpeechThreshold: number;
    redemptionFrames: number;
    frameSamples: number;
    preSpeechPadFrames: number;
    minSpeechFrames: number;
    submitUserSpeechOnPause: boolean;
    onFrameProcessed: (probabilities: import("@ricky0123/vad-web/dist/_common").SpeechProbabilities) => any;
    onVADMisfire: () => any;
    onSpeechStart: () => any;
    onAudioFrame: (audioFrame: Float32Array) => any;
    onSpeechEnd: (audio: Float32Array) => any;
    ortConfig?: ((ort: any) => any) | undefined;
    workletURL: string;
    modelURL: string;
    modelFetcher: (path: string) => Promise<ArrayBuffer>;
} | {
    startOnLoad: boolean;
    userSpeakingThreshold: number;
    additionalAudioConstraints?: {
        advanced?: MediaTrackConstraintSet[] | undefined;
        aspectRatio?: ConstrainDouble | undefined;
        deviceId?: ConstrainDOMString | undefined;
        displaySurface?: ConstrainDOMString | undefined;
        facingMode?: ConstrainDOMString | undefined;
        frameRate?: ConstrainDouble | undefined;
        groupId?: ConstrainDOMString | undefined;
        height?: ConstrainULong | undefined;
        sampleRate?: ConstrainULong | undefined;
        sampleSize?: ConstrainULong | undefined;
        width?: ConstrainULong | undefined;
    } | undefined;
    stream: undefined;
    positiveSpeechThreshold: number;
    negativeSpeechThreshold: number;
    redemptionFrames: number;
    frameSamples: number;
    preSpeechPadFrames: number;
    minSpeechFrames: number;
    submitUserSpeechOnPause: boolean;
    onFrameProcessed: (probabilities: import("@ricky0123/vad-web/dist/_common").SpeechProbabilities) => any;
    onVADMisfire: () => any;
    onSpeechStart: () => any;
    onAudioFrame: (audioFrame: Float32Array) => any;
    onSpeechEnd: (audio: Float32Array) => any;
    ortConfig?: ((ort: any) => any) | undefined;
    workletURL: string;
    modelURL: string;
    modelFetcher: (path: string) => Promise<ArrayBuffer>;
};
export declare function useMicVAD(options: Partial<ReactRealTimeVADOptions>): {
    listening: boolean;
    errored: false | {
        message: string;
    };
    loading: boolean;
    userSpeaking: boolean;
    pause: () => void;
    start: () => void;
    toggle: () => void;
};
//# sourceMappingURL=index.d.ts.map