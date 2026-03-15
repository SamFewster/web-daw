import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { useTheme } from 'next-themes';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';

const SettingsDialog = ({ open, setOpen }: { open: boolean, setOpen: React.Dispatch<React.SetStateAction<boolean>> }) => {
    const { theme, setTheme } = useTheme();
    const [dyslexiaFont, setDyslexiaFont] = useState(false);

    useEffect(() => {
        localStorage.setItem("dyselxia-font", dyslexiaFont.toString());
        document.body.classList.toggle("dyslexia-friendly", dyslexiaFont);
    }, [dyslexiaFont]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                    <DialogDescription>
                        Tweak your preferences
                    </DialogDescription>
                </DialogHeader>
                <div className='flex justify-between w-full'>
                    <div className='flex flex-col gap-2'>
                        <h1 className='text-sm font-bold'>Theme</h1>
                        <Select value={theme} onValueChange={setTheme}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Theme" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectItem value="light">Light</SelectItem>
                                    <SelectItem value="dark">Dark</SelectItem>
                                    <SelectItem value="system">System</SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className='flex gap-2 items-center'>
                        <Checkbox id="dyslexia-font" checked={dyslexiaFont} onCheckedChange={setDyslexiaFont as any} />
                        <Label htmlFor='dyslexia-font'>Dyslexia-Friendly font</Label>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default SettingsDialog