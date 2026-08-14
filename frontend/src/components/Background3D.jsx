import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";

function Blob({ position, color, scale, speed }) {
    const meshRef = useRef();

    useFrame((state) => {
        const t = state.clock.getElapsedTime() * speed;
        meshRef.current.position.y = position[1] + Math.sin(t) * 0.4;
        meshRef.current.rotation.x = t * 0.2;
        meshRef.current.rotation.y = t * 0.15;
    });

    return (
        <mesh ref={meshRef} position={position} scale={scale}>
            <icosahedronGeometry args={[1, 6]} />
            <meshStandardMaterial
                color={color}
                roughness={0.3}
                metalness={0.3}
                emissive={color}
                emissiveIntensity={0.25}
            />
        </mesh>
    );
}

function Scene() {
    return (
        <>
            <fog attach="fog" args={["#0f172a", 6, 16]} />
            <ambientLight intensity={1} />
            <directionalLight position={[5, 5, 5]} intensity={1.5} />
            <pointLight position={[-5, 0, 5]} intensity={1.5} color="#ffffff" />

            <Blob position={[-4, 1.5, -3]} color="#6366f1" scale={1.3} speed={0.5} />
            <Blob position={[4, -1.5, -4]} color="#ec4899" scale={1.1} speed={0.7} />
            <Blob position={[0, -3, -5]} color="#06b6d4" scale={0.9} speed={0.6} />
        </>
    );
}

function Background3D() {
    return (
        <div className="fixed inset-0 -z-10">
            <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
                <Scene />
            </Canvas>
        </div>
    );
}

export default Background3D;