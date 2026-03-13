type Effect = {
    id: string,
    intensity: number,
    node: AudioNode
}

type EffectDefinition = {
    id: string,
    name: string,
    nodeCallback: (context: AudioContext) => AudioNode,
    onIntensityChange: (intensity: number, node: AudioNode) => void
}