import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import { BrowserRouter } from "react-router-dom";

import App from "./App.jsx";


const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
    throw new Error("Missing Clerk Publishable Key");
}

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <ClerkProvider publishableKey={clerkPubKey}>
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </ClerkProvider>
    </StrictMode>
);