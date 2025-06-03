let audioContext;
let masterGainNode; // For global volume control if needed later

function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (audioContext) {
            masterGainNode = audioContext.createGain();
            masterGainNode.connect(audioContext.destination);
        }
    }
    return audioContext;
}

export async function loadSound(url) {
    const context = getAudioContext();
    if (!context) {
        console.warn("Web Audio API not supported.");
        return null;
    }
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await context.decodeAudioData(arrayBuffer);
        // Store context on the sound asset itself, or ensure it's always available
        return { buffer: audioBuffer, context: context };
    } catch (error) {
        console.error(`Error loading sound ${url}:`, error);
        return null;
    }
}

export function playSound(soundAsset, loop = false, volume = 1) {
    if (!soundAsset || !soundAsset.buffer || !soundAsset.context) {
        console.warn("Cannot play sound, asset not loaded properly or context missing.");
        return null;
    }

    const context = soundAsset.context; // Use context stored with the asset
    const source = context.createBufferSource();
    source.buffer = soundAsset.buffer;

    const gainNode = context.createGain();
    // Ensure gain is set correctly, especially for volume changes over time.
    // For simple playback, setValueAtTime is fine.
    gainNode.gain.setValueAtTime(volume * (masterGainNode ? masterGainNode.gain.value : 1), context.currentTime); 
    
    source.connect(gainNode);
    gainNode.connect(masterGainNode || context.destination); // Connect to master gain or destination
    
    source.loop = loop;
    source.start(0);
    
    // Storing the source on the soundAsset allows stopping it.
    // This is important for looping sounds like background music.
    if (loop) { // Only store source if it might need to be stopped (like looping music)
      soundAsset.source = source; 
    }
    return source; // Return the source node, useful for more complex audio manipulation
}

// Optional: Function to stop a specific sound (mainly for looping sounds)
export function stopSound(soundAsset) {
    if (soundAsset && soundAsset.source) {
        try {
            soundAsset.source.stop();
            soundAsset.source.disconnect(); // Disconnect to free up resources
            delete soundAsset.source; // Remove reference
        } catch (e) {
            // console.warn("Error stopping sound:", e);
            // Might already be stopped or not playing
        }
    }
}

// Optional: Global volume control
export function setMasterVolume(volume) {
    if (masterGainNode) {
        masterGainNode.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), getAudioContext().currentTime);
    }
}