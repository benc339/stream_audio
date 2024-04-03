import React, { useEffect, useRef, useState } from 'react';

const AudioStreamer: React.FC = () => {
  const socketRef = useRef<WebSocket | null>(null);
  const [recognizedText, setRecognizedText] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  console.log('start');

  useEffect(() => {
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

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);


  const startAudioCapture = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: {
        channelCount: 1 // Specify mono audio
    } });

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
        socketRef.current.send(event.data);
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

      const timer = setTimeout(stopRecording, 1000); // Stop recording after 5 seconds

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