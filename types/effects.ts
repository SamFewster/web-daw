type Effect = {
    id: string,
    intensity: number,
    timestamp: number
}

type EffectDefinition = {
    id: string,
    name: string,
    nodeCallback: (context: AudioContext) => AudioNode,
    onIntensityChange: (intensity: number, node: AudioNode) => void,
    defaultIntensity: number,
    minIntensity: number,
    maxIntensity: number,
    step: number
}