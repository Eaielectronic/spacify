import React, { useState } from 'react';
import { Music } from 'lucide-react';
import clsx from 'clsx';
import { bridge } from '../services/bridge';

interface SongArtworkProps {
    src?: string;
    alt?: string;
    className?: string;
}

export const SongArtwork: React.FC<SongArtworkProps> = ({ src, alt, className }) => {
    const [hasError, setHasError] = useState(false);

    if (!src || hasError) {
        return (
            <div className={clsx("flex items-center justify-center bg-[#282828] text-gray-500", className)}>
                <Music size="40%" />
            </div>
        );
    }

    return (
        <img
            src={bridge.convertSrc(src)}
            alt={alt}
            className={className}
            onError={() => setHasError(true)}
        />
    );
};
