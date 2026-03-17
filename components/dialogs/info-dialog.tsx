import React from 'react'
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { buttonVariants } from '../ui/button'

const InfoDialog = () => {
    return (
        <Dialog>
            <DialogTrigger className='text-muted-foreground hover:underline'>
                Need help?
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Info</DialogTitle>
                </DialogHeader>
                <ul role="list" className='list-disc px-4'>
                    <li>Drag and drop audio files from your computer to add them to the playlist.</li>
                    <li>Drag waveforms left and right to make them play earlier or later in the playlist.</li>
                    <li>Add effects using the bottom panel. Each track has its own set of effects.</li>

                    {/* KEYBOARD SHORTCUTS */}
                    <li className='font-bold'>
                        Keyboard Shortcuts
                        <ul role="list" className='font-normal list-disc px-4 text-muted-foreground'>
                            <li>[space] to play/pause</li>
                            <li>[,] to seek -10s</li>
                            <li>[.] to seek +10s</li>
                            <li>[←] to move backwards</li>
                            <li>[→] to move forwards</li>
                        </ul>
                    </li>
                    <li>Click "Export" to save the playlist as a file.</li>
                </ul>
                {/* CLOSE BUTTON */}
                <div className='flex justify-center'>
                    <DialogClose className={buttonVariants({ variant: 'default' })}>
                        Got it!
                    </DialogClose>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default InfoDialog