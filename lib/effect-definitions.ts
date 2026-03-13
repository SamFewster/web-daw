export const effectDefinitions: EffectDefinition[] = [
    {
        id: "compressor",
        name: "Compressor",
        nodeCallback: (context) => {
            const compressor = context.createDynamicsCompressor();
            compressor.threshold.value = -30;  // dB level where compression starts
            compressor.knee.value = 20;        // smoothness of compression
            compressor.ratio.value = 100;       // compression ratio
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
            // create a gain node to raise the volume by a level of 3x
            const gainNode = context.createGain();
            gainNode.gain.value = 0.5;
            // return the node for use in my node rewiring logic
            return gainNode;
        },
        onIntensityChange: (intensity, node) => {
            // update the gain node's volume
            (node as GainNode).gain.value = intensity;
        }
    },
    {
        id: "reverb",
        name: "Reverb",
        nodeCallback: (context) => {
            const convolver = context.createConvolver();
            const irBuffer = context.createBuffer(2, context.sampleRate * 3, context.sampleRate);
            convolver.buffer = irBuffer;
            convolver.normalize = true;
            return convolver;
        },
        onIntensityChange: (intensity, node) => {
            (node as AudioWorkletNode).port.postMessage({ intensity })
        }
    },
    {
        id: "delay",
        name: "Delay",
        nodeCallback: (context) => {
            const delayNode = context.createDelay(1000);
            return delayNode;
        },
        onIntensityChange: (intensity, node) => {
            (node as AudioWorkletNode).port.postMessage({ intensity })
        }
    },
    {
        id: "distortion",
        name: "Distortion",
        nodeCallback: (context) => {
            const distortion = context.createWaveShaper();

            function makeDistortionCurve(amount: number) {
                const samples = 44100;
                const curve = new Float32Array(samples);
                const k = amount;
                const deg = Math.PI / 180;

                for (let i = 0; i < samples; i++) {
                    const x = (i * 2) / samples - 1;
                    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
                }

                return curve;
            }

            distortion.curve = makeDistortionCurve(50);
            distortion.oversample = "4x";

            return distortion;
        },
        onIntensityChange(intensity, node) {

        },
    }
]