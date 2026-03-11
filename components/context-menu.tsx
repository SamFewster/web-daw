import React from 'react'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu';
import { CircleGaugeIcon, CopyIcon, TrashIcon } from 'lucide-react';
import Track from './track';
import { resampleAudioBuffer } from '@/lib/utils';
import { useControls } from './controls-provider';
import audioEncoder from 'audio-encoder';

const WaveformContextMenu = ({ selectedWaveform, setSelectedWaveform, tracks, setTracks }: { selectedWaveform: SelectedWaveform | undefined, setSelectedWaveform: React.Dispatch<React.SetStateAction<SelectedWaveform | undefined>>, tracks: Track[], setTracks: React.Dispatch<React.SetStateAction<Track[]>> }) => {
    const { controls } = useControls();
    return (
        <ContextMenu>
            <ContextMenuTrigger className="flex flex-col gap-1 h-full p-2 w-full" onContextMenu={(e) => {
                if (!selectedWaveform) {
                    e.preventDefault()
                }
            }}>
                {tracks.map((track, i) => (
                    <Track track={track} index={i} setTracks={setTracks} setSelectedWaveform={setSelectedWaveform} selectedWaveform={selectedWaveform} key={i} />
                ))}
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem onClick={() => {
                    if (!selectedWaveform) return;
                    let timeToAddAudio = 0;
                    for (const audio of tracks[selectedWaveform.trackIndex].audio) {
                        const endTime = audio.startTime + audio.audioBuffer.duration;
                        if (endTime > timeToAddAudio) timeToAddAudio = endTime;
                    }
                    setTracks(prev => [
                        ...prev.slice(0, selectedWaveform.trackIndex),
                        {
                            ...prev[selectedWaveform.trackIndex],
                            audio: [
                                ...prev[selectedWaveform.trackIndex].audio,
                                {
                                    ...prev[selectedWaveform.trackIndex].audio[selectedWaveform.waveformIndex],
                                    startTime: timeToAddAudio,
                                    timestamp: Date.now()
                                }
                            ]
                        },
                        ...prev.slice(selectedWaveform.trackIndex + 1)
                    ]);
                }}>
                    <CopyIcon className='stroke-primary' />
                    Duplicate
                </ContextMenuItem>
                <ContextMenuItem onClick={() => {
                    if (!selectedWaveform) return;
                    let timeToAddAudio = 0;
                    for (const audio of tracks[selectedWaveform.trackIndex].audio) {
                        const endTime = audio.startTime + audio.audioBuffer.duration;
                        if (endTime > timeToAddAudio) timeToAddAudio = endTime;
                    }
                    setTracks(prev => {
                        const newBuffer = resampleAudioBuffer(controls.context!, prev[selectedWaveform.trackIndex].audio[selectedWaveform.waveformIndex].audioBuffer, 2);
                        return [
                            ...prev.slice(0, selectedWaveform.trackIndex),
                            {
                                ...prev[selectedWaveform.trackIndex],
                                audio: [
                                    ...prev[selectedWaveform.trackIndex].audio.slice(0, selectedWaveform.waveformIndex),
                                    {
                                        ...prev[selectedWaveform.trackIndex].audio[selectedWaveform.waveformIndex],
                                        audioBlob: audioEncoder(newBuffer, 0),
                                        audioBuffer: newBuffer,
                                        timestamp: Date.now()
                                    },
                                    ...prev[selectedWaveform.trackIndex].audio.slice(selectedWaveform.waveformIndex + 1)
                                ]
                            },
                            ...prev.slice(selectedWaveform.trackIndex + 1)
                        ]
                    }
                    );
                }}>
                    <CircleGaugeIcon className='stroke-primary' />
                    Change Tempo
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem variant='destructive' onClick={() => {
                    if (!selectedWaveform) return;
                    setTracks(prev => [
                        ...prev.slice(0, selectedWaveform.trackIndex),
                        {
                            ...prev[selectedWaveform.trackIndex],
                            audio: [
                                ...prev[selectedWaveform.trackIndex].audio.filter((_, i) => i !== selectedWaveform.waveformIndex)
                            ]
                        },
                        ...prev.slice(selectedWaveform.trackIndex + 1)
                    ]);
                }}>
                    <TrashIcon />
                    Delete
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    )
}

export default WaveformContextMenu