import numpy as np
import wave

def pcm_to_wav(pcm_file, wav_file, sample_rate=16000, num_channels=1, sample_width=4):
    # Read the PCM data from the file
    with open(pcm_file, 'rb') as file:
        pcm_data = file.read()

    # Convert the PCM data to a NumPy array
    pcm_array = np.frombuffer(pcm_data, dtype=np.int16)

    # Create a new WAV file
    with wave.open(wav_file, 'wb') as wav_file:
        # Set the WAV file parameters
        wav_file.setnchannels(num_channels)
        wav_file.setsampwidth(sample_width)
        wav_file.setframerate(sample_rate)

        # Write the PCM data to the WAV file
        wav_file.writeframes(pcm_array.tobytes())

    print(f"Conversion complete. WAV file saved as: {wav_file}")

# Example usage
pcm_file = 'output_audio_3.pcm'
wav_file = 'audio.wav'
pcm_to_wav(pcm_file, wav_file)