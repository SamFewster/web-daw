import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'

const SettingsDialog = ({ open, setOpen }: { open: boolean, setOpen: React.Dispatch<React.SetStateAction<boolean>> }) => {
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                    <DialogDescription>
                        Tweak your preferences
                    </DialogDescription>
                </DialogHeader>
                <div>
                    placeholder
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default SettingsDialog