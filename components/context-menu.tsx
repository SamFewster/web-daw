import React, { useState } from 'react'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu';
import { CircleGaugeIcon, CopyIcon, TrashIcon } from 'lucide-react';
import Track from './track';
import SpeedDialog from './dialogs/speed-dialog';

// This component wraps the main timeline/tracks area with a right-click context menu.
// The menu actions operate on the currently selected waveform (`selectedWaveform`).
const WaveformContextMenu = ({ selectedWaveform, setSelectedWaveform, tracks, setTracks }: { selectedWaveform: SelectedWaveform | undefined, setSelectedWaveform: React.Dispatch<React.SetStateAction<SelectedWaveform | undefined>>, tracks: Track[], setTracks: React.Dispatch<React.SetStateAction<Track[]>> }) => {
    // Local UI state: controls whether the "Change Speed" dialog is open.
    const [speedDialogOpen, setSpeedDialogOpen] = useState(false);
    return (
        <>
            <ContextMenu>
                {/* The trigger is the entire tracks area. Right-clicking here opens the menu. */}
                <ContextMenuTrigger className="flex flex-col gap-1 h-full p-2 w-full" onContextMenu={(e) => {
                    // If nothing is selected, we prevent opening the context menu (so actions always have a target).
                    if (!selectedWaveform || typeof selectedWaveform.waveformIndex === 'undefined') {
                        e.preventDefault();
                    }
                }}>
                    {/* Render every track lane. Each `Track` renders its own clips (Waveforms). */}
                    {tracks.map((track, i) => (
                        <Track track={track} index={i} setTracks={setTracks} setSelectedWaveform={setSelectedWaveform} selectedWaveform={selectedWaveform} key={i} />
                    ))}
                </ContextMenuTrigger>
                <ContextMenuContent>
                    {/* Duplicate: create a copy of the selected clip and append it after the last clip on the track. */}
                    <ContextMenuItem onClick={() => {
                        // Guard: only run if a waveform is selected.
                        // (waveformIndex identifies which clip within the selected track is selected.)
                        if (!selectedWaveform || !selectedWaveform.waveformIndex) return;

                        // Find where to place the new duplicate: we use the latest end time on this track.
                        let timeToAddAudio = 0; // tracks the point to insert the new audio waveform
                        // iterate through the audio waveforms in the selected track
                        for (const audio of tracks[selectedWaveform.trackIndex].audio) {
                            // calculate the end time of the current audio waveform by adding its duration to its start time
                            const endTime = audio.startTime + audio.audioBuffer.duration;
                            // if the end time of the current audio waveform is greater than the time to add the new audio waveform
                            if (endTime > timeToAddAudio) timeToAddAudio = endTime;
                        }

                        // Update state immutably: replace only the selected track with an updated copy.
                        setTracks(prev => [
                            // add all the tracks before the selected track
                            ...prev.slice(0, selectedWaveform.trackIndex),
                            // copy the selected track and add the new audio waveform
                            {
                                ...prev[selectedWaveform.trackIndex],
                                audio: [
                                    ...prev[selectedWaveform.trackIndex].audio,
                                    // Copy the selected clip's data but move it to `timeToAddAudio`.
                                    {
                                        ...prev[selectedWaveform.trackIndex].audio[selectedWaveform.waveformIndex!],
                                        startTime: timeToAddAudio,
                                        // New timestamp acts as a unique id/key for the duplicate.
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
                    {/* Change Speed opens a dialog that edits playback speed for the selected clip. */}
                    <ContextMenuItem onClick={() => {
                        setSpeedDialogOpen(true);
                    }}>
                        <CircleGaugeIcon className='stroke-primary' />
                        Change Speed
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    {/* Delete removes the selected clip from its track. */}
                    <ContextMenuItem variant='destructive' onClick={() => {
                        if (!selectedWaveform) return;
                        // Remove the clip at `waveformIndex` from the selected track's `audio` array.
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
            {/* Dialog rendered alongside the menu; controlled by `speedDialogOpen`. */}
            <SpeedDialog open={speedDialogOpen} setOpen={setSpeedDialogOpen} selectedWaveform={selectedWaveform} tracks={tracks} setTracks={setTracks} />
        </>
    )
}

export default WaveformContextMenu