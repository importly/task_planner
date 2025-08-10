import {Toaster} from "@/components/ui/toaster";
import {Toaster as Sonner} from "@/components/ui/sonner";
import {TooltipProvider} from "@/components/ui/tooltip";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {BrowserRouter, Route, Routes} from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Review from "./pages/Review";
import FocusMode from "./pages/FocusMode";

const queryClient = new QueryClient();

const App = () => (
    <QueryClientProvider client={queryClient}>
        <TooltipProvider>
            <Toaster/>
            <Sonner/>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Index/>}/>
                    <Route path="/review" element={<Review/>}/>
                    <Route path="/focus" element={<FocusMode/>}/>
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound/>}/>
                </Routes>
            </BrowserRouter>
        </TooltipProvider>
    </QueryClientProvider>
);

export default App;