import React, { useEffect, useRef, useState } from 'react'
import Waveform from './waveform'
import { Button } from './ui/button';
import { Volume1Icon, VolumeOffIcon } from 'lucide-react';
import { useControls } from './controls-provider';
import { computeAudioBuffer, getRandomColour } from '@/lib/utils';
import { effectDefinitions } from '@/lib/effect-definitions';
import { useTheme } from 'next-themes';

const Track = ({ track, index, setTracks, setSelectedWaveform, selectedWaveform }: { track: Track, index: number, setTracks: React.Dispatch<React.SetStateAction<Track[]>>, setSelectedWaveform: React.Dispatch<React.SetStateAction<SelectedWaveform | undefined>>, selectedWaveform: SelectedWaveform | undefined }) => {
    const [muted, setMuted] = useState(false);
    const { controls } = useControls();
    const { resolvedTheme } = useTheme();

    // create a reference to the effect nodes that have already been applied to the track, with a key of each effect's timestamp
    const effectNodesRef = useRef<Map<number, AudioNode>>(new Map());

    const connectNodes = () => {
        // disconnect all nodes
        track.outputNode.disconnect();
        for (const [i, node] of effectNodesRef.current.entries()) {
            node.disconnect();
            // if node has a bypass property (Tuna effect), and it has been removed from the track, set it to true to prevent additional processing
            if ("bypass" in node && !effectNodesRef.current.has(i)) {
                (node as any).bypass = true;
            }
        }

        // start with the track's output node
        let prev: AudioNode = track.outputNode;
        for (const effect of track.effects) {
            // connect each node to each other in order
            const node = effectNodesRef.current.get(effect.timestamp);
            // if the effect's node isn't found, ignore it
            if (!node) continue;
            prev.connect(node);
            prev = node;
        }
        // connect the final node to the master gain node
        prev!.connect(controls.gainNode!);
    }

    useEffect(() => {
        // connect the track's nodes when the component mounts
        connectNodes();
    }, []);

    useEffect(() => {
        for (const effect of track.effects) {
            // find the effect definition from the id in the constant array
            const effectDef = effectDefinitions.find(e => e.id === effect.id)!;

            let node = effectNodesRef.current.get(effect.timestamp);
            if (!node) {
                // if node doesn't already exist, create a new one using the nodeCallback function
                node = effectDef.nodeCallback(controls.context!);
            }

            // call the onIntensityChange function with the intensity and node
            effectDef.onIntensityChange(effect.intensity, node);
            // add the node to the map
            effectNodesRef.current.set(effect.timestamp, node);
        }

        // reconnect the nodes once the effects have been updated
        connectNodes();

        const removedEffects = Array.from(effectNodesRef.current.keys()).filter(key => !track.effects.find(e => e.timestamp === key)) as number[];
        for (const key of removedEffects) {
            const node = effectNodesRef.current.get(key)!;
            node.disconnect();
            effectNodesRef.current.delete(key);
        }
    }, [track.effects])

    useEffect(() => {
        if (muted) track.outputNode.gain.value = 0;
        else track.outputNode.gain.value = 1;
    }, [muted]);

    useEffect(() => {
        if (!resolvedTheme) return;
        setTracks(prev => [
            ...prev.slice(0, index),
            {
                ...prev[index],
                // generate a new random colour based on the updated theme 
                colour: getRandomColour(resolvedTheme)
            },
            ...prev.slice(index + 1)
        ]);
    }, [resolvedTheme])

    return (
        <div
            className="flex"
            onDragOver={(e) => { e.preventDefault() }}
            onDragEnter={(e) => { e.preventDefault() }}
            onDrop={async (e) => {
                e.preventDefault();

                if (e.dataTransfer.files) {
                    let totalTime = track.audio.reduce((prev, currentItem) => prev + currentItem.audioBuffer.duration, 0);
                    const newData = await Promise.all(Array.from(e.dataTransfer.files).map(async (file) => {
                        const audioBuffer = await computeAudioBuffer(controls.context!, await file.arrayBuffer());
                        const trackTime = audioBuffer.duration;
                        totalTime += trackTime;
                        return { audioBlob: file, startTime: totalTime - trackTime, audioBuffer: audioBuffer, timestamp: Date.now() };
                    }));
                    setTracks(prev => [
                        ...prev.slice(0, index),
                        {
                            ...prev[index],
                            audio: [
                                ...prev[index].audio,
                                ...newData
                            ]
                        },
                        ...prev.slice(index + 1)
                    ]);
                }
            }}
        >

            <div className="flex flex-col items-center justify-center p-2 gap-2">
                <Button size="icon" variant="outline" onClick={() => {
                    setMuted(prev => !prev);
                }}>
                    {muted ? <VolumeOffIcon /> : <Volume1Icon />}
                </Button>
            </div>
            <div className='relative h-[116px] w-[6000px]' onPointerDown={(e) => { if (e.target == e.currentTarget) setSelectedWaveform(undefined) }}>
                {track.audio.map((item, i) => <Waveform trackItem={item} setTrackItem={(item: TrackItem) => setTracks(prev => prev.map((track, i2) => i2 === index ? { ...track, audio: track.audio.map((audio, i3) => i3 === i ? item : audio) } : track))} track={track} setSelectedWaveform={setSelectedWaveform} selectedWaveform={selectedWaveform} selectionData={{ trackIndex: index, waveformIndex: i } as SelectedWaveform} key={item.timestamp} />)}
            </div>
        </div>
    );
}

export default Track