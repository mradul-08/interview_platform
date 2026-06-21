import { SignIn } from "@clerk/clerk-react";

function Login() {
    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            <SignIn
                routing="path"
                path="/login"
                signUpUrl="/login"
                afterSignInUrl="/dashboard"
            />
        </div>
    );
}

export default Login;