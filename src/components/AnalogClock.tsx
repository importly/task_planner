import React, {useEffect, useRef} from 'react';
import Snap from 'snapsvg-cjs';

// We need to declare mina on the window object for TypeScript to recognize it.
declare global {
    interface Window {
        mina: any;
    }
}

export const AnalogClock = () => {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current) return;

        const clock = Snap(svgRef.current);
        clock.clear(); // Clear previous renders to prevent duplicates on hot-reload

        // Hardcoded colors matching the app's dark theme for use with Snap.svg
        const theme = {
            card: '#212121',
            primary: '#3B82F6',
            foreground: '#FFFFFF',
            destructive: '#CF6679',
        };

        // Clock face
        clock.circle(32, 32, 30).attr({
            fill: theme.card,
            stroke: theme.primary,
            strokeWidth: 2
        });

        // Hands
        const hours = clock.rect(29.5, 18, 5, 22, 2.5).attr({fill: theme.foreground});
        const minutes = clock.rect(30.5, 15, 3, 25, 1.5).attr({fill: theme.foreground});
        const seconds = clock.path("M30.5,38.625c0,0.828,0.672,1.5,1.5,1.5s1.5-0.672,1.5-1.5c0-0.656-0.414-1.202-1-1.406V10.125c0-0.277-0.223-0.5-0.5-0.5s-0.5,0.223-0.5,0.5v27.094C30.914,37.423,30.5,37.969,30.5,38.625z M31,38.625c0-0.552,0.448-1,1-1s1,0.448,1,1s-0.448,1-1,1S31,39.177,31,38.625z").attr({
            fill: theme.destructive,
        });

        // Center dot
        clock.circle(32, 32, 3).attr({
            fill: theme.foreground,
            stroke: theme.destructive,
            strokeWidth: 2
        });

        const updateTime = () => {
            const currentTime = new Date();
            const s = currentTime.getSeconds();
            const m = currentTime.getMinutes();
            let h = currentTime.getHours();
            h = h > 12 ? h - 12 : h;
            h = h === 0 ? 12 : h;
            // Add minute contribution to hour hand for smoother movement
            const hourRotation = h * 30 + m / 2;

            hours.animate({transform: `r${hourRotation},32,32`}, 200, window.mina.elastic);
            minutes.animate({transform: `r${m * 6},32,32`}, 200, window.mina.elastic);
            seconds.animate({transform: `r${s * 6},32,32`}, 500, window.mina.elastic);
        };

        updateTime(); // Initial call to set time immediately
        const timerId = setInterval(updateTime, 1000);

        // Cleanup interval on component unmount
        return () => {
            clearInterval(timerId);
        };
    }, []);

    return (
        <div className="transform scale-[1.25] -ml-2 -mr-1">
            <svg ref={svgRef} width="64" height="64" viewBox="0 0 64 64"></svg>
        </div>
    );
};