import React, { useEffect, useRef, useState } from 'react';

const AudioStreamer: React.FC = () => {
  const socketRef = useRef<WebSocket | null>(null);
  const [recognizedText, setRecognizedText] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    const connectWebSocket = () => {
      socketRef.current = new WebSocket('ws://localhost:8080/audio');
      socketRef.current.onopen = () => {
        console.log('WebSocket connection established');
      };
      socketRef.current.onmessage = (event) => {
        const receivedText = event.data;
        setRecognizedText((prevText: string) => prevText + ' ' + receivedText);
      };
      socketRef.current.onclose = () => {
        console.log('WebSocket connection closed');
      };
      socketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    };

    connectWebSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  // Define a type for the WAV header writing function parameters
  type DataViewWithString = {
    view: DataView;
    offset: number;
    string: string;
  };

  // Helper function to write strings to the DataView
  const writeString = ({ view, offset, string }: DataViewWithString): void => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // Define a type for the bufferToWav function parameters
  interface BufferToWavParams {
    audioBuffer: Float32Array;
    sampleRate: number;
  }

  // Helper function to convert audio buffer to WAV format
  const bufferToWav = ({ audioBuffer, sampleRate }: BufferToWavParams): ArrayBuffer => {
    const buffer = new ArrayBuffer(44 + audioBuffer.length * 2);
    const view = new DataView(buffer);

    // Write WAV header
    writeString({ view, offset: 0, string: 'RIFF' }); // RIFF header
    view.setUint32(4, 36 + audioBuffer.length * 2, true); // file length
    writeString({ view, offset: 8, string: 'WAVE' }); // WAVE header
    writeString({ view, offset: 12, string: 'fmt ' }); // fmt chunk
    view.setUint32(16, 16, true); // size of fmt chunk
    view.setUint16(20, 1, true); // audio format (1 is PCM)
    view.setUint16(22, 1, true); // number of channels
    view.setUint32(24, sampleRate, true); // sample rate
    view.setUint32(28, sampleRate * 2, true); // byte rate (sampleRate * numChannels * bitsPerSample/8)
    view.setUint16(32, 2, true); // block align (numChannels * bitsPerSample/8)
    view.setUint16(34, 16, true); // bits per sample
    writeString({ view, offset: 36, string: 'data' }); // data chunk header
    view.setUint32(40, audioBuffer.length * 2, true); // data chunk length

    // Write audio data
    let offset = 44;
    for (let i = 0; i < audioBuffer.length; i++, offset += 2) {
      const val = Math.max(-1, Math.min(1, audioBuffer[i]));
      view.setInt16(offset, val < 0 ? val * 0x8000 : val * 0x7FFF, true);
    }

    return buffer;
  };

  const startAudioCapture = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const audioContext = new AudioContext({ sampleRate: 16000 });

    const sourceNode = audioContext.createMediaStreamSource(stream);

    const destinationNode = audioContext.createMediaStreamDestination();

    sourceNode.connect(destinationNode);

    const options = {
      mimeType: 'audio/webm;codecs=pcm',
      audioBitsPerSecond: 256000,
    };

    mediaRecorderRef.current = new MediaRecorder(destinationNode.stream, options);

    const chunks: Blob[] = [];

    mediaRecorderRef.current.ondataavailable = (event) => {
      chunks.push(event.data);
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(event.data);
      }
    };

    mediaRecorderRef.current.onstop = async () => {


      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        //socketRef.current.send(event.data);
      }


    };

    mediaRecorderRef.current.start();
    setIsRecording(true);
  };

  useEffect(() => {
    if (isRecording) {
      const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
        }
      };

      const timer = setTimeout(stopRecording, 2000); // Stop recording after 5 seconds

      return () => {
        clearTimeout(timer);
        stopRecording();
      };
    }
  }, [isRecording]);

  return (
    <div>
      <button onClick={startAudioCapture} disabled={isRecording}>
        {isRecording ? 'Recording...' : 'Start Recording'}
      </button>
      <div>Recognized Text: {recognizedText}</div>
    </div>
  );
};

export default AudioStreamer;