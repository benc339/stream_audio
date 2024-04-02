package com.example.websocket;

import com.microsoft.cognitiveservices.speech.*;
import com.microsoft.cognitiveservices.speech.audio.AudioConfig;
import com.microsoft.cognitiveservices.speech.audio.AudioStreamFormat;
import com.microsoft.cognitiveservices.speech.audio.PushAudioInputStream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
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

public class AudioWebSocketHandler extends BinaryWebSocketHandler {
    private static final Logger logger = LoggerFactory.getLogger(AudioWebSocketHandler.class);
    private static final String AZURE_SPEECH_KEY = "ab4d17b76c9f46068907e0ed26cc0889";
    private static final String AZURE_SPEECH_REGION = "westeurope";
    private static final int AUDIO_DURATION_SECONDS = 5;

    private static final int SAMPLE_RATE = 16000;
    private static final int COLLECTION_DURATION_MS = 2000; // Collect data for 5 seconds

    private List<byte[]> audioDataList = new ArrayList<>();

    private List<byte[]> audioChunks = new ArrayList<>();

    public AudioWebSocketHandler() {
        try {
            System.setProperty("com.microsoft.cognitiveservices.speech.debug", "true");
        } catch (Exception e) {
            logger.error("Error initializing Azure Speech SDK: {}", e.getMessage());
        }
    }

    public void convertWebMToPCM(String webMFilePath, String pcmFilePath) {
        ProcessBuilder processBuilder = new ProcessBuilder(
            "ffmpeg", "-i", webMFilePath, 
            "-f", "s16le", // PCM format s16le (signed 16-bit little endian)
            "-acodec", "pcm_s16le", // Set audio codec to PCM signed 16-bit little endian
            "-ar", "16000", // Sample rate 16000 Hz
            "-ac", "1", // Number of audio channels
            pcmFilePath);
        try {
            Process process = processBuilder.start();
            int exitCode = process.waitFor();
            if (exitCode == 0) {
                System.out.println("Conversion successful");
            } else {
                System.err.println("Conversion failed");
            }
        } catch (IOException | InterruptedException e) {
            e.printStackTrace();
        }
    }

    private byte[] loadPcmFileIntoMemory(String pcmFilePath) throws IOException {
        File pcmFile = new File(pcmFilePath);
        if (!pcmFile.exists() || pcmFile.isDirectory()) {
            throw new FileNotFoundException("PCM file not found at " + pcmFilePath);
        }
        
        long fileSize = pcmFile.length();
        if (fileSize > Integer.MAX_VALUE) {
            throw new IOException("PCM file is too large to fit into a byte array.");
        }
    
        byte[] audioData = new byte[(int) fileSize];
        
        try (FileInputStream fis = new FileInputStream(pcmFile)) {
            int bytesRead = fis.read(audioData);
            if (bytesRead != fileSize) {
                throw new IOException("Failed to read the entire PCM file into memory. Expected bytes: " + fileSize + ", Read bytes: " + bytesRead);
            }
        } catch (IOException e) {
            throw new IOException("Error occurred while reading PCM file into memory.", e);
        }
        
        return audioData;
    }
    
    
    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) throws Exception {
        byte[] audioData = message.getPayload().array();
        
        System.out.println("Received audio data size: " + audioData.length + " bytes");

        File tempWebMFile = File.createTempFile("audio", ".webm");
        try (FileOutputStream fos = new FileOutputStream(tempWebMFile)) {
            fos.write(audioData);
            System.out.println("Temporary WebM file path: " + tempWebMFile.getAbsolutePath());
            fos.close();
        } catch (IOException e) {
            e.printStackTrace();
            return;
        }

        System.out.println("Converting WebM to PCM...");

        File outputPcmFile = new File("output_audio_3.pcm");
        extractPcmFromWebM(tempWebMFile.getAbsolutePath(), outputPcmFile.getAbsolutePath());

        System.out.println("Output PCM file path: " + outputPcmFile.getAbsolutePath());

        if (!tempWebMFile.delete()) {
            System.err.println("Failed to delete temporary file: " + tempWebMFile.getAbsolutePath());
        }

        // Loading the PCM file into memory
        byte[] pcmDataBytes = loadPcmFileIntoMemory(outputPcmFile.getAbsolutePath());
        System.out.println("Loaded PCM data into memory. Size: " + pcmDataBytes.length + " bytes");

        // Now that we have the PCM file, transcribe it
        transcribePcmFile(session, pcmDataBytes);
    }

    private void extractPcmFromWebM(String inputFilePath, String outputFilePath) {
        try {
            String command = String.format("ffmpeg -i %s -vn -f s16le -acodec pcm_s16le %s",
                    inputFilePath, outputFilePath);
    
            Process process = Runtime.getRuntime().exec(command);
    
            // Consume the error stream of the process
            new Thread(() -> {
                try (InputStream is = process.getErrorStream();
                     InputStreamReader isr = new InputStreamReader(is);
                     BufferedReader br = new BufferedReader(isr)) {
                    
                    String line;
                    while ((line = br.readLine()) != null) {
                        System.err.println(line);  // You can log this instead
                    }
                } catch (IOException ioe) {
                    ioe.printStackTrace();
                }
            }).start();
    
            // Consume the input stream of the process
            new Thread(() -> {
                try (InputStream is = process.getInputStream();
                     InputStreamReader isr = new InputStreamReader(is);
                     BufferedReader br = new BufferedReader(isr)) {
                    
                    String line;
                    while ((line = br.readLine()) != null) {
                        System.out.println(line);  // You can log this instead
                    }
                } catch (IOException ioe) {
                    ioe.printStackTrace();
                }
            }).start();
    
            int exitCode = process.waitFor();
            if (exitCode != 0) {
                System.err.println("FFmpeg exited with error code: " + exitCode);
            }
        } catch (IOException | InterruptedException e) {
            e.printStackTrace();
        }
    }
    

    private void transcribePcmFile(WebSocketSession session, byte[] pcmDataBytes) {
    
        SpeechConfig speechConfig = SpeechConfig.fromSubscription(AZURE_SPEECH_KEY, AZURE_SPEECH_REGION);
        speechConfig.setSpeechRecognitionLanguage("en-US");

        PushAudioInputStream pushStream = PushAudioInputStream.createPushStream();
        AudioConfig audioConfig = AudioConfig.fromStreamInput(pushStream);
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
    


    private int getTotalAudioDuration() {
        int totalSize = audioChunks.stream().mapToInt(chunk -> chunk.length).sum();
        int sampleRate = 16000;
        int bytesPerSample = 2;
        int channelCount = 1;
        int totalSamples = totalSize / (bytesPerSample * channelCount);
        return totalSamples / sampleRate;
    }

    private void processAudioData(WebSocketSession session) {
        // Combine the audio chunks into a single byte array
        int totalSize = audioChunks.stream().mapToInt(chunk -> chunk.length).sum();
        byte[] combinedAudioData = new byte[totalSize];
        int offset = 0;
        for (byte[] chunk : audioChunks) {
            System.arraycopy(chunk, 0, combinedAudioData, offset, chunk.length);
            offset += chunk.length;
        }

        // Create an AudioInputStream from the combined audio data
        ByteArrayInputStream bais = new ByteArrayInputStream(combinedAudioData);
        AudioFormat format = new AudioFormat(16000, 16, 1, true, false);
        AudioInputStream audioInputStream = new AudioInputStream(bais, format, combinedAudioData.length / format.getFrameSize());

        // Save the WAV file
        String fileName = "output.wav";
        try {
            AudioSystem.write(audioInputStream, AudioFileFormat.Type.WAVE, new File(fileName));
            logger.info("WAV file saved successfully: {}", fileName);
        } catch (IOException e) {
            logger.error("Error saving WAV file: {}", e.getMessage());
        }

        // Perform speech recognition on the combined audio data
        recognizeSpeech(session, combinedAudioData);
    }

    private void recognizeSpeech(WebSocketSession session, byte[] audioData) {
        try {
            SpeechConfig speechConfig = SpeechConfig.fromSubscription(AZURE_SPEECH_KEY, AZURE_SPEECH_REGION);
            speechConfig.setSpeechRecognitionLanguage("en-US");

            AudioStreamFormat audioFormat = AudioStreamFormat.getWaveFormatPCM((long)16000, (short)16, (short)1);
            PushAudioInputStream pushStream = PushAudioInputStream.createPushStream(audioFormat);

            pushStream.write(audioData);
            pushStream.close();

            AudioConfig audioConfig = AudioConfig.fromStreamInput(pushStream);
            SpeechRecognizer recognizer = new SpeechRecognizer(speechConfig, audioConfig);
            Future<SpeechRecognitionResult> task = recognizer.recognizeOnceAsync();
            SpeechRecognitionResult result = task.get();

            if (result.getReason() == ResultReason.RecognizedSpeech) {
                String recognizedText = result.getText();
                session.sendMessage(new org.springframework.web.socket.TextMessage(recognizedText));
            } else {
                logger.warn("Speech recognition failed: {}", result.getReason());
            }
        } catch (InterruptedException | ExecutionException | IOException e) {
            logger.error("Error during speech recognition: {}", e.getMessage());
        }
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        logger.info("WebSocket connection established: {}", session);
        session.setTextMessageSizeLimit(1024 * 1024); // 1MB
        session.setBinaryMessageSizeLimit(1024 * 1024); // 1MB
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        logger.info("WebSocket connection closed: {} - {}", session, status);
    }
}