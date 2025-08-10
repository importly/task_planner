import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Separator} from "@/components/ui/separator";
import {Badge} from "@/components/ui/badge";
import {CheckCircle2, Settings} from "lucide-react";

interface SettingsDialogProps {
    isGoogleAuthenticated: boolean;
    loginGoogle: () => void;
}

export const SettingsDialog = ({isGoogleAuthenticated, loginGoogle}: SettingsDialogProps) => {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title="Settings">
                    <Settings className="h-5 w-5"/>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Settings & Connections</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-4">
                    <h3 className="font-semibold">Connections</h3>
                    <div className="flex flex-col gap-3 p-4 border rounded-lg bg-black/20">
                        <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">Microsoft To Do</span>
                            <Badge variant="outline" className="text-green-400 border-green-400/50">
                                <CheckCircle2 className="mr-1.5 h-3 w-3"/> Connected
                            </Badge>
                        </div>
                        <Separator className="bg-white/10"/>
                        <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">Google Calendar</span>
                            {isGoogleAuthenticated ? (
                                <Badge variant="outline" className="text-green-400 border-green-400/50">
                                    <CheckCircle2 className="mr-1.5 h-3 w-3"/> Connected
                                </Badge>
                            ) : (
                                <Button onClick={() => loginGoogle()} size="sm" variant="outline">Connect</Button>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};