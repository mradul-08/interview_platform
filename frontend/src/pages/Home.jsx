import { useEffect } from "react";
import api from "../api/api";

function Home() {
    useEffect(() => {
        api.get("/")
            .then((res) => {
                console.log(res.data);
            })
            .catch((err) => {
                console.log(err);
            });
    }, []);

    return <h1>Home Page</h1>;
}

export default Home;