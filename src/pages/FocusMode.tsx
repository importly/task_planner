import {useEffect, useState} from "react";
import {useLocation, useNavigate} from "react-router-dom";
import {EnrichedTask, Task} from "@/types";
import {Button} from "@/components/ui/button";
import {Progress} from "@/components/ui/progress";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {X} from "lucide-react";

const FocusMode = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const task: Task | EnrichedTask | null = location.state?.task;

    const [timeLeft, setTimeLeft] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isRunning, setIsRunning] = useState(false);

    useEffect(() => {
        if (task && 'estTime' in task) {
            const initialTime = task.estTime * 60;
            setTimeLeft(initialTime);
            setDuration(initialTime);
        }
    }, [task]);

    useEffect(() => {
        if (!isRunning || timeLeft <= 0) {
            if (timeLeft <= 0 && isRunning) {
                new Notification("Focus session complete!", {
                    body: `You've completed your focus session for "${task?.title}".`,
                });
            }
            return;
        }


        const intervalId = setInterval(() => {
            setTimeLeft(prevTime => prevTime - 1);
        }, 1000);

        return () => clearInterval(intervalId);
    }, [isRunning, timeLeft, task?.title]);

    if (!task) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">No Task Selected</h2>
                    <p className="text-muted-foreground mb-4">Please go back and select a task to focus on.</p>
                    <Button onClick={() => navigate("/")}>Go Back</Button>
                </div>
            </div>
        );
    }

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const progress = duration > 0 ? ((duration - timeLeft) / duration) * 100 : 0;

    return (
        <div
            className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 relative grainy-gradient">
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-6 right-6 text-muted-foreground hover:text-foreground"
                onClick={() => navigate("/")}
            >
                <X className="h-6 w-6"/>
            </Button>
            <Card className="w-full max-w-2xl bg-card/80 backdrop-blur-lg border-white/10 animate-fade-in-up">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold text-center">{task.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center gap-8">
                    <div className="text-8xl font-bold font-mono tracking-tighter">
                        {formatTime(timeLeft)}
                    </div>
                    <div className="w-full">
                        <Progress value={progress} className="h-3"/>
                    </div>
                    <div className="flex gap-4">
                        <Button
                            size="lg"
                            onClick={() => setIsRunning(!isRunning)}
                            className="px-10 py-6 text-lg"
                        >
                            {isRunning ? "Pause" : "Start"}
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            onClick={() => {
                                setIsRunning(false);
                                setTimeLeft(duration);
                            }}
                            className="px-10 py-6 text-lg"
                        >
                            Reset
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default FocusMode;