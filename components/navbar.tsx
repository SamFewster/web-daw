import React, { useState } from 'react'
import { Button } from './ui/button'
import { FastForwardIcon, PauseIcon, PlayIcon, SettingsIcon } from 'lucide-react'
import { Slider } from './ui/slider'
import { useControls } from './controls-provider'
import SettingsDialog from './dialogs/settings-dialog'
import ExportButton from './export-button'

// The Navbar is the main "transport bar" of the DAW.
// It holds global controls like:
// - Zoom (pixels-per-second scaling of the timeline)
// - Transport buttons (seek back/forward, play/pause)
// - Master volume (controls the master GainNode)
// - Settings + Export actions
const Navbar = ({ tracks }: { tracks: Track[] }) => {
    // Global transport + audio engine state, and helper functions to change it.
    const { controls, controlsInterface } = useControls();
    // Local UI state for whether the settings modal is visible.
    const [settingsOpen, setSettingsOpen] = useState(false);
    return (
        // Fixed top bar: spaced into zoom (left), transport (middle), and actions (right).
        <div className="w-screen bg-muted flex items-center justify-between p-2 z-[2]">
            <div className="flex flex-col gap-2 items-center jusitfy-center text-center">
                <p className='text-sm'>Zoom</p>
                {/* Zoom slider updates the global zoom value used for converting time <-> pixels. */}
                <Slider value={[controls.zoom]} min={10} max={300} className="w-[200px]" onValueChange={(value) => controlsInterface.setControls(prev => ({ ...prev, zoom: value[0] }))} />
            </div>
            <div className="flex gap-2 justify-center items-center">
                {/* Seek backwards 10 seconds. onKeyDown preventDefault stops buttons stealing focus/spacebar behaviour. */}
                <Button variant="outline" size="icon" onKeyDown={(e) => e.preventDefault()} onClick={() => controlsInterface.seekTime(-10)}>
                    <FastForwardIcon className="rotate-180" />
                </Button>
                {/* Play/pause toggles the global transport state. */}
                <Button variant="outline" size="icon" onKeyDown={(e) => e.preventDefault()} onClick={() => controlsInterface.playPause()}>
                    {/* Icon switches depending on whether we're currently playing. */}
                    {controls.playing ? <PauseIcon /> : <PlayIcon />}
                </Button>
                {/* Seek forwards 10 seconds. */}
                <Button variant="outline" size="icon" onKeyDown={(e) => e.preventDefault()} onClick={() => controlsInterface.seekTime(+10)}>
                    <FastForwardIcon />
                </Button>
            </div>
            <div className='flex gap-4'>
                <div className="flex flex-col gap-2 items-center jusitfy-center text-center">
                    <p className='text-sm'>Volume</p>
                    {/* Master volume slider controls the GainNode at the end of the audio graph. */}
                    <Slider min={0} max={100} defaultValue={[50]} className="w-[200px]" onValueChange={(value) => {
                        if (controls.gainNode) {
                            // Slider is 0..100, GainNode expects 0..1.
                            controls.gainNode.gain.value = value[0] / 100;
                        }
                    }} />
                </div>
                <Button size="icon" variant="outline" onClick={() => {
                    // Open the settings dialog.
                    setSettingsOpen(true);
                }}>
                    <SettingsIcon />
                </Button>
                {/* Export uses the current tracks to render/mixdown audio. */}
                <ExportButton tracks={tracks} />
                {/* SettingsDialog is controlled by local `settingsOpen` state. */}
                <SettingsDialog open={settingsOpen} setOpen={setSettingsOpen} />
            </div>
        </div>
    )
}

export default Navbar