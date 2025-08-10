import {Configuration, PublicClientApplication} from "@azure/msal-browser";

// This configuration is used to initialize the MSAL instance.
export const msalConfig: Configuration = {
    auth: {
        // Your application's client ID from the Azure portal.
        clientId: import.meta.env.VITE_AZURE_CLIENT_ID || "",
        // Using "consumers" is specific for personal Microsoft accounts (like @hotmail.com, @outlook.com).
        authority: "https://login.microsoftonline.com/consumers",
        // The redirect URI must match the one you configured in the Azure portal.
        redirectUri: window.location.origin,
    },
    cache: {
        cacheLocation: "sessionStorage", // This is more secure than localStorage.
        storeAuthStateInCookie: false,
    },
};

// These are the permissions our app will request from the user.
export const loginRequest = {
    scopes: ["User.Read", "Tasks.ReadWrite"],
};

export const msalInstance = new PublicClientApplication(msalConfig);