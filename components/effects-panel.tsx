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
                // find the "gain" effect definition in the constant array
                const effectDef = effectDefinitions.find(e => e.id === "distortion")!;
                // create a gain node using the nodeCallback function
                const node = effectDef.nodeCallback(controls.context!);
                // update the tracks state variable with the new effect and node
                setTracks(prev => [
                    // add all tracks before the selected track
                    ...prev.slice(0, selectedWaveform.trackIndex),
                    {
                        ...track,
                        effects: [
                            ...track.effects,
                            {
                                id: "delay",
                                intensity: 3,
                                timestamp: Date.now(),
                                node: node
                            }
                        ]
                    },
                    // add all tracks after the selected track
                    ...prev.slice(selectedWaveform.trackIndex + 1),
                ]);

                // fetch all effect nodes that have already been applied to the track and assign them to an array
                const nodes = [...tracks[selectedWaveform.trackIndex].effects.map(e => e.node), node];
                let prev: AudioNode = track.outputNode;
                prev.disconnect();
                for (const node of nodes) {
                    // disconnect each node and reconnect them to each other in order
                    prev.connect(node);
                    prev = node;
                }
                // connect the final node to the master gain node
                prev!.connect(controls.gainNode!);
            }}>
                Add Gain Effect
            </Button>
            <div>
                {selectedWaveform && tracks[selectedWaveform?.trackIndex]!.effects.map((effect, i) => <div key={effect.timestamp}>
                    
                </div>)}
            </div>
        </div>
    )
}

export default EffectsPanel