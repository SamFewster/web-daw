import React, { useState } from 'react'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu';
import { CircleGaugeIcon, CopyIcon, TrashIcon } from 'lucide-react';
import Track from './track';
import SpeedDialog from './dialogs/speed-dialog';
const WaveformContextMenu = ({ selectedWaveform, setSelectedWaveform, tracks, setTracks }: { selectedWaveform: SelectedWaveform | undefined, setSelectedWaveform: React.Dispatch<React.SetStateAction<SelectedWaveform | undefined>>, tracks: Track[], setTracks: React.Dispatch<React.SetStateAction<Track[]>> }) => {
    const [speedDialogOpen, setSpeedDialogOpen] = useState(false);
    return (
        <>
            <ContextMenu>
                <ContextMenuTrigger className="flex flex-col gap-1 h-full p-2 w-full" onContextMenu={(e) => {
                    if (!selectedWaveform) {
                        e.preventDefault();
                    }
                }}>
                    {tracks.map((track, i) => (
                        <Track track={track} index={i} setTracks={setTracks} setSelectedWaveform={setSelectedWaveform} selectedWaveform={selectedWaveform} key={i} />
                    ))}
                </ContextMenuTrigger>
                <ContextMenuContent>
                    <ContextMenuItem onClick={() => {
                        if (!selectedWaveform || !selectedWaveform.waveformIndex) return;

                        let timeToAddAudio = 0; // tracks the point to insert the new audio waveform
                        // iterate through the audio waveforms in the selected track
                        for (const audio of tracks[selectedWaveform.trackIndex].audio) {
                            // calculate the end time of the current audio waveform by adding its duration to its start time
                            const endTime = audio.startTime + audio.audioBuffer.duration;
                            // if the end time of the current audio waveform is greater than the time to add the new audio waveform
                            if (endTime > timeToAddAudio) timeToAddAudio = endTime;
                        }

                        setTracks(prev => [
                            // add all the tracks before the selected track
                            ...prev.slice(0, selectedWaveform.trackIndex),
                            // copy the selected track and add the new audio waveform
                            {
                                ...prev[selectedWaveform.trackIndex],
                                audio: [
                                    ...prev[selectedWaveform.trackIndex].audio,
                                    {
                                        ...prev[selectedWaveform.trackIndex].audio[selectedWaveform.waveformIndex!],
                                        startTime: timeToAddAudio,
                                        timestamp: Date.now()
                                    }
                                ]
                            },
                            // add all the tracks after the selected track
                            ...prev.slice(selectedWaveform.trackIndex + 1)
                        ]);
                    }}>
                        <CopyIcon className='stroke-primary' />
                        Duplicate
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => {
                        setSpeedDialogOpen(true);
                    }}>
                        <CircleGaugeIcon className='stroke-primary' />
                        Change Speed
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem variant='destructive' onClick={() => {
                        if (!selectedWaveform) return;
                        setTracks(prev => [
                            // add all the tracks before the selected track
                            ...prev.slice(0, selectedWaveform.trackIndex),
                            // copy the selected track and remove the selected audio waveform
                            {
                                ...prev[selectedWaveform.trackIndex],
                                audio: [
                                    ...prev[selectedWaveform.trackIndex].audio.filter((_, i) => i !== selectedWaveform.waveformIndex)
                                ]
                            },
                            // add all the tracks after the selected track
                            ...prev.slice(selectedWaveform.trackIndex + 1)
                        ]);
                    }}>
                        <TrashIcon />
                        Delete
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
            <SpeedDialog open={speedDialogOpen} setOpen={setSpeedDialogOpen} selectedWaveform={selectedWaveform} tracks={tracks} setTracks={setTracks} />
        </>
    )
}

export default WaveformContextMenu