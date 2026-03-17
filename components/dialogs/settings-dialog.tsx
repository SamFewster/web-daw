import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { useTheme } from 'next-themes';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import InfoDialog from './info-dialog';

// SettingsDialog lets the user change app-wide preferences such as theme and accessibility options.
// It is controlled by the parent via `open`/`setOpen` so the Navbar can show/hide it.
const SettingsDialog = ({ open, setOpen }: { open: boolean, setOpen: React.Dispatch<React.SetStateAction<boolean>> }) => {
    // Theme comes from `next-themes` and is applied by the ThemeProvider (class on <html>).
    const { theme, setTheme } = useTheme();
    // Accessibility option: toggles a dyslexia-friendly font by adding/removing a CSS class.
    const [dyslexiaFont, setDyslexiaFont] = useState(false);

    useEffect(() => {
        // Persist the preference so it survives page reloads.
        localStorage.setItem("dyselxia-font", dyslexiaFont.toString());
        // Apply/remove the CSS class on the <body> to switch fonts in CSS.
        document.body.classList.toggle("dyslexia-friendly", dyslexiaFont);
    }, [dyslexiaFont]);

    return (
        // The dialog is "controlled": parent passes `open` and is notified via `onOpenChange`.
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                    <DialogDescription>
                        Tweak your preferences
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-2">
                    <div className='flex justify-between w-full'>
                        <div className='flex flex-col gap-2'>
                            <h1 className='text-sm font-bold'>Theme</h1>
                            {/* Theme selection updates the global theme (light/dark/system). */}
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
                            {/* Checkbox toggles the dyslexia-friendly font option. */}
                            <Checkbox id="dyslexia-font" checked={dyslexiaFont} onCheckedChange={setDyslexiaFont as any} />
                            <Label htmlFor='dyslexia-font'>Dyslexia-Friendly font</Label>
                        </div>
                    </div>
                    {/* Additional info/help dialog (e.g. about shortcuts, usage notes, etc.). */}
                    <InfoDialog />
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default SettingsDialog