import React, { useEffect, useState } from 'react'
import Waveform from './waveform'
import { Button } from './ui/button';
import { Volume1Icon, VolumeOffIcon } from 'lucide-react';
import { useControls } from './controls-provider';

const Track = ({ track }: { track: Track }) => {
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
            else localGainNode.gain.value = controls.volume / 100;
        }
    }, [muted]);
    return (
        <div className="flex">
            <div className="flex flex-col items-center justify-center p-2 gap-2">
                <Button size="icon" variant="outline" onClick={() => {
                    setMuted(prev => !prev);
                }}>
                    {muted ? <VolumeOffIcon /> : <Volume1Icon />}
                </Button>
            </div>
            {track.map((item, i) => <Waveform audioBlob={item.audioBlob} node={localGainNode!} key={i} />)}
        </div>
    );
}

export default Track