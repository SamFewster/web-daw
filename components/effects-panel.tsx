import React from 'react';
import { Button } from './ui/button';
import { effectDefinitions } from '@/lib/effect-definitions';
import { useControls } from './controls-provider';

const EffectsPanel = ({ selectedWaveform, tracks, setTracks }: { selectedWaveform: SelectedWaveform | undefined, tracks: Track[], setTracks: React.Dispatch<React.SetStateAction<Track[]>> }) => {
    const { controls } = useControls();
    return (
        <div>
            <Button onClick={() => {
                if (!selectedWaveform) return;
                const track = tracks[selectedWaveform.trackIndex];
                const effectDef = effectDefinitions.find(e => e.id === "compressor")!;
                const node = effectDef.nodeCallback(controls.context!);
                setTracks(prev => [
                    ...prev.slice(0, selectedWaveform.trackIndex),
                    {
                        ...track,
                        effects: [
                            ...track.effects,
                            {
                                id: "compressor",
                                intensity: 0,
                                node: node
                            }
                        ]
                    },
                    ...prev.slice(selectedWaveform.trackIndex + 1),
                ]);

                const nodes = [...tracks[selectedWaveform.trackIndex].effects.map(e => e.node), node];
                let prev: AudioNode = track.outputNode;
                prev.disconnect();
                for (const node of nodes) {
                    prev.connect(node);
                    prev = node;
                }
                prev!.connect(controls.gainNode!);
            }}>
                Add Compressor Effect
            </Button>
        </div>
    )
}

export default EffectsPanel