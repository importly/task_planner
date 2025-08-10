import * as React from "react";
import {cn} from "@/lib/utils";

const Kbd = React.forwardRef<
    HTMLElement,
    React.HTMLAttributes<HTMLElement>
>(({className, children, ...props}, ref) => {
    return (
        <kbd
            ref={ref}
            className={cn(
                "pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100",
                className
            )}
            {...props}
        >
            {children}
        </kbd>
    );
});
Kbd.displayName = "Kbd";

export {Kbd};