import React, { useState } from 'react'
import { Button } from './ui/button'
import { FastForwardIcon, PauseIcon, PlayIcon, SettingsIcon } from 'lucide-react'
import { Slider } from './ui/slider'
import { useControls } from './controls-provider'
import SettingsDialog from './dialogs/settings-dialog'

const Navbar = () => {
    const { controls, controlsInterface } = useControls();
    const [settingsOpen, setSettingsOpen] = useState(false);
    return (
        <div className="w-screen bg-muted flex items-center justify-between p-2 z-[2]">
            <div className="flex flex-col gap-2 items-center jusitfy-center text-center">
                <p className='text-sm'>Zoom</p>
                <Slider value={[controls.zoom]} min={1} max={200} className="w-[200px]" onValueChange={(value) => controlsInterface.setControls(prev => ({ ...prev, zoom: value[0] }))} />
            </div>
            <div className="flex gap-2 justify-center items-center">
                <Button variant="outline" size="icon" onKeyDown={(e) => e.preventDefault()} onClick={() => controlsInterface.seekTime(-10)}>
                    <FastForwardIcon className="rotate-180" />
                </Button>
                <Button variant="outline" size="icon" onKeyDown={(e) => e.preventDefault()} onClick={() => controlsInterface.playPause()}>
                    {controls.playing ? <PauseIcon /> : <PlayIcon />}
                </Button>
                <Button variant="outline" size="icon" onKeyDown={(e) => e.preventDefault()} onClick={() => controlsInterface.seekTime(+10)}>
                    <FastForwardIcon />
                </Button>
            </div>
            <div className='flex gap-1'>
                <div className="flex flex-col gap-2 items-center jusitfy-center text-center">
                    <p className='text-sm'>Volume</p>
                    <Slider min={0} max={100} defaultValue={[50]} className="w-[200px]" onValueChange={(value) => {
                        if (controls.gainNode) {
                            controls.gainNode.gain.value = value[0] / 100;
                        }
                    }} />
                </div>
                <Button size="icon" variant="outline" onClick={() => {
                    setSettingsOpen(true);
                }}>
                    <SettingsIcon />
                </Button>
                <SettingsDialog open={settingsOpen} setOpen={setSettingsOpen} />
            </div>
        </div>
    )
}

export default Navbar