package com.example.websocket;

import com.microsoft.cognitiveservices.speech.*;
import com.microsoft.cognitiveservices.speech.audio.AudioConfig;
import com.microsoft.cognitiveservices.speech.audio.AudioStreamFormat;
import com.microsoft.cognitiveservices.speech.audio.PushAudioInputStream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.BinaryWebSocketHandler;

import javax.sound.sampled.AudioFileFormat;
import javax.sound.sampled.AudioFormat;
import javax.sound.sampled.AudioInputStream;
import javax.sound.sampled.AudioSystem;
import java.io.*;
import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Future;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.nio.ByteOrder;
import java.nio.channels.FileChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;

import org.bytedeco.javacpp.BytePointer;
import org.bytedeco.javacpp.Pointer;
import org.bytedeco.javacpp.PointerPointer;
import org.bytedeco.ffmpeg.avcodec.AVCodec;
import org.bytedeco.ffmpeg.avcodec.AVCodecContext;
import org.bytedeco.ffmpeg.avcodec.AVPacket;
import org.bytedeco.ffmpeg.avformat.AVFormatContext;
import org.bytedeco.ffmpeg.avformat.AVIOContext;
import org.bytedeco.ffmpeg.avformat.AVStream;
import org.bytedeco.ffmpeg.avutil.AVFrame;


public class AudioWebSocketHandler extends BinaryWebSocketHandler {
    private static final Logger logger = LoggerFactory.getLogger(AudioWebSocketHandler.class);
    private static final String AZURE_SPEECH_KEY = "ab4d17b76c9f46068907e0ed26cc0889";
    private static final String AZURE_SPEECH_REGION = "westeurope";
    private static final int AUDIO_DURATION_SECONDS = 5;

    private static final int SAMPLE_RATE = 16000;
    private static final int COLLECTION_DURATION_MS = 2000; // Collect data for 5 seconds

    private List<byte[]> audioDataList = new ArrayList<>();

    private List<byte[]> audioChunks = new ArrayList<>();

    private List<byte[]> pcmChunks = new ArrayList<>();
    private int chunkCount = 0;
    
    private Process ffmpegProcess;
    private OutputStream ffmpegInput;

    private static Semaphore stopTranslationWithFileSemaphore;

    private SpeechRecognizer recognizer;

    private String waveFilePath;
    
    private boolean isTalking;

    private ByteArrayOutputStream pcmOutputStream;

    private String pcmFilePath;

    private List<Float> combinedFloatData = new ArrayList<>();

    private PushAudioInputStream pushStream;

    private FileOutputStream pcmFileOutputStream;

    private static final int BITS_PER_SAMPLE = 16;
    private static final boolean IS_LITTLE_ENDIAN = true;

    public void feedDataToFFmpeg(float[] data) throws IOException {
        if (ffmpegInput != null) {
            byte[] byteData = new byte[data.length * 4];  // Each float is 4 bytes
            ByteBuffer.wrap(byteData).asFloatBuffer().put(data);
            ffmpegInput.write(byteData);
            ffmpegInput.flush();  // Ensure data is sent to FFmpeg
        }
    }

    private void startFFmpegProcess() throws IOException {
        ProcessBuilder processBuilder = new ProcessBuilder(
            "ffmpeg",
            "-f", "f32le", // Float32 little endian format
            "-ar", "16000", // Sample rate 16000 Hz
            "-ac", "1", // Number of audio channels
            "-i", "pipe:0", // Read input from stdin
            "-f", "s16le", // PCM format s16le (signed 16-bit little endian)
            "-acodec", "pcm_s16le", // Set audio codec to PCM signed 16-bit little endian
            "-ar", "16000", // Sample rate 16000 Hz
            "-ac", "1", // Number of audio channels
            "pipe:1" // Write output to stdout
        );
        ffmpegProcess = processBuilder.start();
        ffmpegInput = ffmpegProcess.getOutputStream();
    }

    private void stopFFmpegProcess() throws IOException {
        if (ffmpegProcess != null) {
            ffmpegInput.close(); // Signal FFmpeg to finish
            ffmpegProcess.destroy(); // Terminate the FFmpeg process
            ffmpegProcess = null;
            ffmpegInput = null;
        }
    }

    public AudioWebSocketHandler() {
        try {
            System.setProperty("com.microsoft.cognitiveservices.speech.debug", "true");
        } catch (Exception e) {
            logger.error("Error initializing Azure Speech SDK: {}", e.getMessage());
        }
    }    


    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) throws Exception {
        ByteBuffer byteBuffer = message.getPayload();
        float[] floatData = new float[byteBuffer.remaining() / 4];
        byteBuffer.asFloatBuffer().get(floatData);


        if (isTalking) {
            byte[] pcmData = convertFloatArrayToPCMInMemory(floatData);
            pushStream.write(pcmData);
      
            // Write the PCM data to the file
            if (pcmFileOutputStream != null) {
                //pcmFileOutputStream.write(pcmData);
            }
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        logger.info(message.getPayload());
        try {
            String messageData = message.getPayload();
            if (messageData.equals("start")) {
                startSpeechRecognition(session);
                isTalking = true;
                pcmFilePath = "output" + session.getId().toString() + ".pcm";
                logger.info("User started talking. Chunk count reset.");

                // Open the PCM file for writing
                pcmFileOutputStream = new FileOutputStream(pcmFilePath);
            } else if (messageData.equals("stop")) {
                isTalking = false;
                stopSpeechRecognition();

                // Close the PCM file
                if (pcmFileOutputStream != null) {
                    pcmFileOutputStream.close();
                    pcmFileOutputStream = null;
                }

                // Delete the PCM file after transcribing
                File pcmFile = new File(pcmFilePath);
                if (pcmFile.exists()) {
                    //pcmFile.delete();
                }
                pcmFilePath = "";
            }
        } catch (Exception e) {
            logger.error("Error handling text message", e);
        }
    }

    private void stopSpeechRecognition() {
        if (recognizer != null) {
            try {
                pushStream.close();
                recognizer.stopContinuousRecognitionAsync().get();
                recognizer.close();
                recognizer = null;
                pushStream = null;
            } catch (Exception e) {
                logger.error("Error stopping speech recognition", e);
            }
        }
    }

    private void startSpeechRecognition(WebSocketSession session) {
        SpeechConfig speechConfig = SpeechConfig.fromSubscription(AZURE_SPEECH_KEY, AZURE_SPEECH_REGION);
        speechConfig.setSpeechRecognitionLanguage("en-US");
    
        AudioStreamFormat audioFormat = AudioStreamFormat.getWaveFormatPCM((long)16000, (short)16, (short)1);
        pushStream = PushAudioInputStream.createPushStream(audioFormat);
        AudioConfig audioConfig = AudioConfig.fromStreamInput(pushStream);
        recognizer = new SpeechRecognizer(speechConfig, audioConfig);
    
        recognizer.recognizing.addEventListener((s, e) -> {
            logger.info("RECOGNIZING: Text={}", e.getResult().getText());

            try {
                //session.sendMessage(new TextMessage("Speech started"));
                session.sendMessage(new TextMessage(e.getResult().getText()));
            } catch (Exception ex) {
                logger.error("Error sending message: {}", ex.getMessage());
            }
                        
        });

        recognizer.sessionStopped.addEventListener((s, e) -> {
            logger.info("Session stopped.");
        });
    
        recognizer.recognized.addEventListener((s, e) -> {
            if (e.getResult().getReason() == ResultReason.RecognizedSpeech) {
                String recognizedText = e.getResult().getText();
                logger.info("RECOGNIZED: Text={}", recognizedText);
                // Send the recognized text back to the client via WebSocket
                try {
                    session.sendMessage(new TextMessage("|"+recognizedText+"|"));
                } catch (Exception ex) {
                    logger.error("Error sending message: {}", ex.getMessage());
                }
            
                logger.info("Speech ended");
                try {
                    session.sendMessage(new TextMessage("Speech ended"));
                } catch (Exception ex) {
                    logger.error("Error sending message: {}", ex.getMessage());
                }
                
            } else if (e.getResult().getReason() == ResultReason.NoMatch) {
                logger.warn("NOMATCH: Speech could not be recognized.");
            }
        });
    
        recognizer.canceled.addEventListener((s, e) -> {
            logger.warn("CANCELED: Reason={}", e.getReason());
            if (e.getReason() == CancellationReason.Error) {
                logger.warn("CANCELED: ErrorCode={}", e.getErrorCode());
                logger.warn("CANCELED: ErrorDetails={}", e.getErrorDetails());
                logger.warn("CANCELED: Did you set the speech resource key and region values?");
            }
            // Stop continuous recognition if canceled
            try {
                recognizer.stopContinuousRecognitionAsync().get();
            } catch (InterruptedException | ExecutionException ex) {
                logger.error("Error stopping continuous recognition: {}", ex.getMessage());
            }
        });
    
        // Start continuous recognition
        recognizer.startContinuousRecognitionAsync();
    }


    private byte[] convertFloatArrayToPCMInMemory(float[] floatData) throws IOException, InterruptedException {
        ProcessBuilder processBuilder = new ProcessBuilder(
            "ffmpeg",
            "-f", "f32le", // Float32 little endian format
            "-ar", "16000", // Sample rate 16000 Hz
            "-ac", "1", // Number of audio channels
            "-i", "pipe:0", // Read input from stdin
            "-f", "s16le", // PCM format s16le (signed 16-bit little endian)
            "-acodec", "pcm_s16le", // Set audio codec to PCM signed 16-bit little endian
            "-ar", "16000", // Sample rate 16000 Hz
            "-ac", "1", // Number of audio channels
            "pipe:1" // Write output to stdout
        );
        
        Process process = processBuilder.start();
        
        try (OutputStream ffmpegInput = process.getOutputStream();
             InputStream ffmpegOutput = process.getInputStream()) {
            
            // Write the float array data to FFmpeg's input stream
            byte[] byteData = new byte[floatData.length * 4]; // Each float is 4 bytes
            ByteBuffer.wrap(byteData).asFloatBuffer().put(floatData);
            ffmpegInput.write(byteData);
            ffmpegInput.flush();
            ffmpegInput.close();
            
            // Read the PCM data from FFmpeg's output stream
            byte[] pcmData = ffmpegOutput.readAllBytes();
            
            int exitCode = process.waitFor();
            if (exitCode == 0) {
                System.out.println("In-memory conversion successful");
            } else {
                System.err.println("In-memory conversion failed");
            }
            
            return pcmData;
        }
    }
    
    private void transcribePcmData(WebSocketSession session, byte[] pcmDataBytes) {
        System.out.println("Transcribing PCM data bytes");

        SpeechConfig speechConfig = SpeechConfig.fromSubscription(AZURE_SPEECH_KEY, AZURE_SPEECH_REGION);
        speechConfig.setSpeechRecognitionLanguage("en-US");

        AudioStreamFormat audioFormat = AudioStreamFormat.getWaveFormatPCM((long)16000, (short)16, (short)1);
        PushAudioInputStream pushStream = PushAudioInputStream.createPushStream(audioFormat);
        AudioConfig audioConfig = AudioConfig.fromStreamInput(pushStream);
        //AudioConfig audioConfig = AudioConfig.fromWavFileInput("audio.wav");
        SpeechRecognizer recognizer = new SpeechRecognizer(speechConfig, audioConfig); 

        
        recognizer.recognizing.addEventListener((s, e) -> {
            logger.info("RECOGNIZING: Text={}", e.getResult().getText());

            try {
                //session.sendMessage(new TextMessage("Speech started"));
            } catch (Exception ex) {
                logger.error("Error sending message: {}", ex.getMessage());
            }
                        
        });

        recognizer.sessionStopped.addEventListener((s, e) -> {
            logger.info("Session stopped.");
        });
    
        recognizer.recognized.addEventListener((s, e) -> {
            if (e.getResult().getReason() == ResultReason.RecognizedSpeech) {
                String recognizedText = e.getResult().getText();
                logger.info("RECOGNIZED: Text={}", recognizedText);
                // Send the recognized text back to the client via WebSocket
                try {
                    //session.sendMessage(new TextMessage(recognizedText));
                } catch (Exception ex) {
                    logger.error("Error sending message: {}", ex.getMessage());
                }
            
                logger.info("Speech ended");
                try {
                    //session.sendMessage(new TextMessage("Speech ended"));
                } catch (Exception ex) {
                    logger.error("Error sending message: {}", ex.getMessage());
                }
                
            } else if (e.getResult().getReason() == ResultReason.NoMatch) {
                logger.warn("NOMATCH: Speech could not be recognized.");
            }
        });
    
        recognizer.canceled.addEventListener((s, e) -> {
            logger.warn("CANCELED: Reason={}", e.getReason());
            if (e.getReason() == CancellationReason.Error) {
                logger.warn("CANCELED: ErrorCode={}", e.getErrorCode());
                logger.warn("CANCELED: ErrorDetails={}", e.getErrorDetails());
                logger.warn("CANCELED: Did you set the speech resource key and region values?");
            }
            // Stop continuous recognition if canceled
            try {
                recognizer.stopContinuousRecognitionAsync().get();
            } catch (InterruptedException | ExecutionException ex) {
                logger.error("Error stopping continuous recognition: {}", ex.getMessage());
            }
        });
    
        // Start continuous recognition
        recognizer.startContinuousRecognitionAsync();

        pushStream.write(pcmDataBytes);


    }


    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        logger.info("WebSocket connection established: {}", session);
        session.setTextMessageSizeLimit(1024 * 1024); // 1MB
        session.setBinaryMessageSizeLimit(1024 * 1024); // 1MB
        startFFmpegProcess();
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        logger.info("WebSocket connection closed: {} - {}", session, status);
        stopFFmpegProcess(); 
    }
}
