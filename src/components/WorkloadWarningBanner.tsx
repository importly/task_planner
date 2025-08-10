import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {AlertTriangle, Info, X, Zap} from "lucide-react";
import {Button} from "./ui/button";

interface WorkloadWarningBannerProps {
    warnings: string[];
    onDismiss: (warning: string) => void;
}

export const WorkloadWarningBanner = ({warnings, onDismiss}: WorkloadWarningBannerProps) => {
    if (warnings.length === 0) {
        return null;
    }

    const getWarningIcon = (warning: string) => {
        if (warning.includes("overload") || warning.includes("exceeds budget")) {
            return <AlertTriangle className="h-4 w-4"/>;
        }
        if (warning.includes("energy")) {
            return <Zap className="h-4 w-4"/>;
        }
        if (warning.includes("context")) {
            return <Info className="h-4 w-4"/>;
        }
        return <AlertTriangle className="h-4 w-4"/>;
    };

    return (
        <div className="space-y-2">
            {warnings.map((warning, index) => (
                <Alert key={index} variant={warning.includes("overload") ? "destructive" : "default"}>
                    {getWarningIcon(warning)}
                    <AlertTitle>Heads up!</AlertTitle>
                    <AlertDescription className="flex justify-between items-center">
                        {warning}
                        <Button variant="ghost" size="icon" onClick={() => onDismiss(warning)}>
                            <X className="h-4 w-4"/>
                        </Button>
                    </AlertDescription>
                </Alert>
            ))}
        </div>
    );
};