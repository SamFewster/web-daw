import React, { useEffect, useState } from 'react'
import Waveform from './waveform'
import { Button } from './ui/button';
import { Volume1Icon, VolumeOffIcon } from 'lucide-react';
import { useControls } from './controls-provider';
import { computeAudioBuffer } from '@/lib/utils';

const Track = ({ track, index, setTracks, setSelectedWaveform, selectedWaveform }: { track: Track, index: number, setTracks: React.Dispatch<React.SetStateAction<Track[]>>, setSelectedWaveform: React.Dispatch<React.SetStateAction<SelectedWaveform | undefined>>, selectedWaveform: SelectedWaveform | undefined }) => {
    const [muted, setMuted] = useState(false);
    const { controls } = useControls();

    useEffect(() => {
        if (controls.context) {
            track.outputNode.connect(controls.gainNode!);
        }
    }, []);

    useEffect(() => {
        if (muted) track.outputNode.gain.value = 0;
        else track.outputNode.gain.value = 1;
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