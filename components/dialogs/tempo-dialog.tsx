import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Slider } from '../ui/slider'

const TempoDialog = ({ open, setOpen, selectedWaveform, setTracks }: { open: boolean, setOpen: React.Dispatch<React.SetStateAction<boolean>>, selectedWaveform: SelectedWaveform | undefined, setTracks: React.Dispatch<React.SetStateAction<Track[]>> }) => {
    const [tempo, setTempo] = useState(1);
    useEffect(() => {
        setTempo(1);
    }, [selectedWaveform])
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Update Tempo</DialogTitle>
                    <DialogDescription>
                        Change this audio item's speed
                    </DialogDescription>
                </DialogHeader>
                <div>
                    <Slider value={[tempo]} onValueChange={(value) => setTempo(value[0])} />
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default TempoDialog