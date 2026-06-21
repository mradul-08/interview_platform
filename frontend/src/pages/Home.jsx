import { Link } from "react-router-dom";

function Home() {
    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                gap: "20px",
            }}
        >
            <h1>Interview Platform 🚀</h1>

            <Link to="/login">
                <button>Get Started</button>
            </Link>
        </div>
    );
}

export default Home;