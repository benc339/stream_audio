import React, { useEffect, useRef, useState } from 'react';
import { MicVAD } from "../src/vad-web"

const AudioStreamer: React.FC = () => {
  const socketRef = useRef<WebSocket | null>(null);
  const [recognizedText, setRecognizedText] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  var sendCount = 0;

  useEffect(() => {
    
    const initializeMicVAD = async () => {
      const myvad = await MicVAD.new({
        onSpeechEnd: (audio: Float32Array) => {
          // do something with `audio` (Float32Array of audio samples at sample rate 16000)...
          console.log('Speech end')
          console.log(audio.length)
        },
        onAudioFrame: (audioFrame) => {
          console.log("Audio frame received", audioFrame);
          // Process the audio frame as needed
        },
      });
      myvad.start();
      // Any other asynchronous operations
      
    };
    

    const connectWebSocket = () => {
      socketRef.current = new WebSocket('ws://localhost:8080/audio');
      socketRef.current.onopen = () => {
        console.log('WebSocket connection established 2');
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
    initializeMicVAD();
    //vad.start();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const startAudioCapture = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1 } });
    const audioContext = new AudioContext({ sampleRate: 16000 });
    const sourceNode = audioContext.createMediaStreamSource(stream);
    const destinationNode = audioContext.createMediaStreamDestination();
    sourceNode.connect(destinationNode);

    const options = {
      mimeType: 'audio/webm; codecs=pcm',
      audioBitsPerSecond: 256000,
    };

    mediaRecorderRef.current = new MediaRecorder(destinationNode.stream, options);
    mediaRecorderRef.current.ondataavailable = (event) => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        console.log('Send data');
        sendCount++;
        if (sendCount > 0) {
          socketRef.current.send(event.data);
        }
      }
    };

    mediaRecorderRef.current.start(100);
    setIsRecording(true);
  };

  const stopAudioCapture = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };



  /*
  const vad = useMicVAD({
    startOnLoad: true,
    onAudioFrame: (data) => {
      // Process the audio data here
      console.log(data);
      // Send the audio data to the server using WebSocket
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(data.buffer);
      }
    },
    onSpeechStart: () => {
      startAudioCapture();
      if (socketRef.current) {
        socketRef.current.send('start');
      }
      console.log("User started talking");
    },
    onSpeechEnd: async (audioData) => {
      stopAudioCapture();
      console.log('User stopped talking');      
      if (socketRef.current) {
        socketRef.current.send('stop');
      }
    },
    onFrameProcessed: (frame) => {
      // Handle frame processing logic if needed
    },
  });
  */

  return (
    <div>
      <div>Recognized Text: {recognizedText}</div>
    </div>
  );
};

export default AudioStreamer;