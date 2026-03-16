import { effectDefinitions } from '@/lib/effect-definitions';
import { Button } from './ui/button'
import React, { useState } from 'react'
import audioEncoder from 'audio-encoder';
import { saveAs } from 'file-saver';
import { DownloadIcon, Loader2Icon } from 'lucide-react';

const sampleRate = 44100;

const ExportButton = ({ tracks }: { tracks: Track[] }) => {
    const [exporting, setExporting] = useState(false);
    const exportProject = () => async () => {
        setExporting(true);
        // calculate the total length of the project by finding the end time of the last audio item
        const projectLength = tracks.flatMap(track => track.audio).reduce((acc, item) => (item.startTime + item.audioBuffer.duration) > acc ? item.startTime + item.audioBuffer.duration : acc, 0);

        // Arg 1: number of channels, Arg 2: length of the project in samples, Arg 3: sample rate
        const offlineCtx = new OfflineAudioContext(1, Math.ceil(projectLength * sampleRate), sampleRate);
        for (const track of tracks) {
            // Create a gain node for each track
            let trackInput = offlineCtx.createGain();
            for (const item of track.audio) {
                // Create a buffer source node for each audio item
                const source = offlineCtx.createBufferSource();
                source.buffer = item.audioBuffer;
                // Connect the buffer source node to the gain node
                source.connect(trackInput);
                // Start the buffer source node at the start time of the audio item
                source.start(item.startTime);
            }
            let prev: AudioNode = trackInput;
            for (const effect of track.effects) {
                const effectDef = effectDefinitions.find(e => e.id === effect.id)!;

                // Apply each effect in sequence and connect them to the gain node
                const node = effectDef.nodeCallback(offlineCtx);
                effectDef.onIntensityChange(effect.intensity, node);

                prev.connect(node);
                prev = node;
            }
            prev.connect(offlineCtx.destination);
        }

        // Produce an AudioBuffer from the offline context
        const renderedBuffer = await offlineCtx.startRendering();

        // Convert the AudioBuffer to a Blob and download it
        audioEncoder(renderedBuffer, 0, null, async (blob: Blob) => {
            setExporting(false);
            saveAs(blob, 'project.wav');
        });
    }
    return (
        <Button onClick={exportProject()}>
            {exporting ? <Loader2Icon className='animate-spin' /> : <DownloadIcon />}
            Export
        </Button>
    )
}

export default ExportButton