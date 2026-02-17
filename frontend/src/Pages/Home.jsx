import { useAuth } from "../context/AuthContext";
import Features from "../Components/Features/Features";
import Hero from "../Components/Hero/Hero";
import ReadyScan from "../Components/ReadyScan/ReadyScan";
import Dashboard from "./Dashboard";

export default function Home() {
  const { user } = useAuth();

  if (user) {
    return <Dashboard />;
  }

  return (
    <>
      <Hero />
      <Features />
      <ReadyScan />
    </>
  );
}
