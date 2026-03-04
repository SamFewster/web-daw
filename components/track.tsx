import React, { useEffect, useState } from 'react'
import Waveform from './waveform'
import { Button } from './ui/button';
import { Volume1Icon, VolumeOffIcon } from 'lucide-react';
import { useControls } from './controls-provider';
import { computeAudioBuffer } from '@/lib/utils';

const Track = ({ track, index, setTracks }: { track: Track, index: number, setTracks: React.Dispatch<React.SetStateAction<Track[]>> }) => {
    const [muted, setMuted] = useState(false);
    const [localGainNode, setLocalGainNode] = useState<GainNode | null>();
    const { controls } = useControls();

    useEffect(() => {
        if (controls.context) {
            const localGainNode = controls.context.createGain();
            localGainNode.connect(controls.gainNode!);
            setLocalGainNode(localGainNode);
        }
    }, []);

    useEffect(() => {
        if (localGainNode) {
            if (muted) localGainNode.gain.value = 0;
            else localGainNode.gain.value = 1;
        }
    }, [muted]);

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
                        return { audioBlob: file, startTime: totalTime - trackTime, audioBuffer: audioBuffer }
                    }));
                    setTracks(prev => [
                        ...prev.slice(0, index),
                        {
                            ...prev[index],
                            audio: [
                                ...prev[index].audio,
                                ...newData
                            ]
                        }
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
            {track.audio.map((item, i) => <Waveform trackItem={item} node={localGainNode!} key={i} />)}
        </div>
    );
}

export default Track