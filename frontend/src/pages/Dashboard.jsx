import {
    SignedIn,
    SignedOut,
    RedirectToSignIn,
    UserButton,
} from "@clerk/clerk-react";

function Dashboard() {
    return (
        <>
            <SignedIn>
                <div
                    style={{
                        padding: "40px",
                    }}
                >
                    <h1>Dashboard 🚀</h1>

                    <p>Welcome to Interview Platform.</p>

                    <UserButton afterSignOutUrl="/" />
                </div>
            </SignedIn>

            <SignedOut>
                <RedirectToSignIn />
            </SignedOut>
        </>
    );
}

export default Dashboard;