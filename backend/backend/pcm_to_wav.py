import numpy as np
import wave

def pcm_to_wav(pcm_file, wav_file, sample_rate=16000, num_channels=1, sample_width=2):
    # Read the PCM data from the file
    with open(pcm_file, 'rb') as file:
        pcm_data = file.read()

    # Convert the PCM data to a NumPy array based on the sample width
    if sample_width == 1:
        dtype = np.uint8  # Unsigned 8-bit PCM
    elif sample_width == 2:
        dtype = np.int16  # Signed 16-bit PCM
    elif sample_width == 4:
        dtype = np.int32  # Signed 32-bit PCM
    else:
        raise ValueError("Unsupported sample width")

    pcm_array = np.frombuffer(pcm_data, dtype=dtype)

    

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
pcm_file = 'outputd1d5afd7-bca1-3b8b-122d-314e3fdadeb1.pcm'
wav_file = 'audio.wav'

# Convert PCM to WAV with 16-bit samples (sample_width=2)
pcm_to_wav(pcm_file, wav_file, sample_rate=16000, num_channels=1, sample_width=2)