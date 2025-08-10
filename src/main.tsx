import {createRoot} from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import {MsalProvider} from "@azure/msal-react";
import {msalInstance} from "./lib/msalConfig.ts";
import {GoogleOAuthProvider} from "@react-oauth/google";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

createRoot(document.getElementById("root")!).render(
    <GoogleOAuthProvider clientId={googleClientId}>
        <MsalProvider instance={msalInstance}>
            <App/>
        </MsalProvider>
    </GoogleOAuthProvider>,
);