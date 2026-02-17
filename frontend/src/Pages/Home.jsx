import Features from "../Components/Features/Features";
import Hero from "../Components/Hero/Hero";
import Navbar from "../Components/NavBar/Navbar";
import ReadyScan from "../Components/ReadyScan/ReadyScan";


export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <Features />
      <ReadyScan />
    </>
  )
}
