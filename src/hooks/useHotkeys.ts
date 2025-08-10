import {useEffect} from 'react';

type Hotkey = {
    key: string;
    altKey?: boolean;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    callback: (event: KeyboardEvent) => void;
};

export const useHotkeys = (hotkeys: Hotkey[]) => {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const hotkey = hotkeys.find(
                (h) =>
                    h.key.toLowerCase() === event.key.toLowerCase() &&
                    !!h.altKey === event.altKey &&
                    !!h.ctrlKey === event.ctrlKey &&
                    !!h.shiftKey === event.shiftKey
            );

            if (hotkey) {
                event.preventDefault();
                hotkey.callback(event);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [hotkeys]);
};