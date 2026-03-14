// @ts-ignore
import Tuna from 'tunajs';

export const effectDefinitions: EffectDefinition[] = [
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
        },
        defaultIntensity: 0.5,
        minIntensity: 0,
        maxIntensity: 2,
        step: 0.1
    },
    {
        id: "pan",
        name: "Stereo Pan",
        nodeCallback: (context) => {
            const pan = context.createStereoPanner();
            pan.pan.value = 0;
            return pan;
        },
        onIntensityChange: (intensity, node) => {
            (node as StereoPannerNode).pan.value = intensity;
        },
        defaultIntensity: 0,
        minIntensity: -1,
        maxIntensity: 1,
        step: 0.1
    },
    {
        id: "chorus",
        name: "Chorus",
        nodeCallback: (context) => {
            // create a tuna instance and a chorus node from it
            const tuna = new Tuna(context);
            const node = new tuna.Chorus();
            return node;
        },
        onIntensityChange: (intensity, node) => {
            (node as any).feedback = intensity;
        },
        defaultIntensity: 0.4,
        minIntensity: 0,
        maxIntensity: 1,
        step: 0.01
    },
    {
        id: "delay",
        name: "Delay",
        nodeCallback: (context) => {
            const tuna = new Tuna(context);
            const node = new tuna.Delay();
            return node;
        },
        onIntensityChange: (intensity, node) => {
            (node as any).feedback = intensity;
        },
        defaultIntensity: 0.45,
        minIntensity: 0,
        maxIntensity: 1,
        step: 0.01
    },
    {
        id: "compressor",
        name: "Compressor",
        nodeCallback: (context) => {
            const tuna = new Tuna(context);
            const node = new tuna.Compressor();
            return node;
        },
        onIntensityChange: (intensity, node) => {
            (node as any).ratio = intensity;
        },
        defaultIntensity: 4,
        minIntensity: 1,
        maxIntensity: 20,
        step: 1
    },
    {
        id: "lowpass",
        name: "Low Pass Filter",
        nodeCallback: (context) => {
            const tuna = new Tuna(context);
            const node = new tuna.Filter({
                type: "lowpass"
            });
            return node;
        },
        onIntensityChange: (intensity, node) => {
            (node as any).frequency = intensity;
        },
        defaultIntensity: 800,
        minIntensity: 20,
        maxIntensity: 22050,
        step: 1
    },
    {
        id: "highpass",
        name: "High Pass Filter",
        nodeCallback: (context) => {
            const tuna = new Tuna(context);
            const node = new tuna.Filter({
                type: "highpass"
            });
            return node;
        },
        onIntensityChange: (intensity, node) => {
            (node as any).frequency = intensity;
        },
        defaultIntensity: 800,
        minIntensity: 20,
        maxIntensity: 22050,
        step: 1
    },
    {
        id: "tremolo",
        name: "Tremolo",
        nodeCallback: (context) => {
            const tuna = new Tuna(context);
            const node = new tuna.Tremolo();
            return node;
        },
        onIntensityChange: (intensity, node) => {
            (node as any).intensity = intensity;
        },
        defaultIntensity: 0.3,
        minIntensity: 0,
        maxIntensity: 1,
        step: 0.01
    },
    {
        id: "wahwah",
        name: "Wah Wah",
        nodeCallback: (context) => {
            const tuna = new Tuna(context);
            const node = new tuna.WahWah();
            return node;
        },
        onIntensityChange: (intensity, node) => {
            (node as any).sensitivity = intensity;
        },
        defaultIntensity: -0.5,
        minIntensity: -1,
        maxIntensity: 1,
        step: 0.01
    },
    {
        id: "bitcrusher",
        name: "Bitcrusher",
        nodeCallback: (context) => {
            const tuna = new Tuna(context);
            const node = new tuna.Bitcrusher();
            return node;
        },
        onIntensityChange: (intensity, node) => {
            (node as any).normfreq = intensity;
        },
        defaultIntensity: 0.1,
        minIntensity: 0,
        maxIntensity: 1,
        step: 0.01
    },
    {
        id: "moog",
        name: "Moog Filter",
        nodeCallback: (context) => {
            const tuna = new Tuna(context);
            const node = new tuna.MoogFilter();
            return node;
        },
        onIntensityChange: (intensity, node) => {
            (node as any).resonance = intensity;
        },
        defaultIntensity: 3.5,
        minIntensity: 0,
        maxIntensity: 4,
        step: 0.01
    },
    {
        id: "pingpong",
        name: "Ping Pong Delay",
        nodeCallback: (context) => {
            const tuna = new Tuna(context);
            const node = new tuna.PingPongDelay();
            return node;
        },
        onIntensityChange: (intensity, node) => {
            (node as any).resonance = intensity;
        },
        defaultIntensity: 0.3,
        minIntensity: 0,
        maxIntensity: 1,
        step: 0.01
    },
]