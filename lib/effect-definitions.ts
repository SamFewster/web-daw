export const effectDefinitions: EffectDefinition[] = [
    {
        id: "compressor",
        name: "Compressor",
        nodeCallback: (context) => {
            const compressor = context.createDynamicsCompressor();
            compressor.threshold.value = -30;  // dB level where compression starts
            compressor.knee.value = 20;        // smoothness of compression
            compressor.ratio.value = 50;       // compression ratio
            compressor.attack.value = 0.003;   // how quickly compression starts
            compressor.release.value = 0.25;   // how quickly it releases

            return compressor;
        },
        onIntensityChange: (intensity, node) => {
            (node as DynamicsCompressorNode).ratio.value = intensity;
        }
    },
    {
        id: "gain",
        name: "Gain",
        nodeCallback: (context) => {
            const gainNode = context.createGain();
            gainNode.gain.value = 3;
            return gainNode;
        },
        onIntensityChange: (intensity, node) => {
            (node as GainNode).gain.value = intensity;
        }
    }
    // {
    //     id: "reverb",
    //     name: "Reverb",
    //     nodeCallback: (context, sourceNode) => {
    //         const reverbNode = context
    //         const convolver = context.createConvolver();
    //         const irBuffer = context.createBuffer(2, context.sampleRate * 3, context.sampleRate);
    //         convolver.buffer = irBuffer;
    //         convolver.normalize = true;

    //     },
    //     onIntensityChange: (intensity, node) => {
    //         (node as AudioWorkletNode).port.postMessage({ intensity })
    //     }
    // }
]