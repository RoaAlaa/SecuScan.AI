import FeatureCard from "./FeaturesCard"
import { Zap, BotMessageSquare, Brain, FileOutput } from "lucide-react";

export default function Features() {
  const features = [
    {
      icon:Zap,
      title: "Lightning Fast",
      description:
        "Scan your entire application in seconds using optimized AI-driven scanning pipelines.",
    },
    {
      icon: Brain,
      title: "AI-Enhanced Detection",
      description:
        "Automatically detect SQL injection, XSS, CSRF, and emerging vulnerabilities.",
    },
    {
      icon: FileOutput,
      title: "Detailed Reports",
      description:
        "Generate professional vulnerability reports with severity levels and remediation steps.",
    },
    {
      icon: BotMessageSquare,
      title: "AI Assistance",
      description:
        "Chat with AI to understand vulnerabilities and receive intelligent security guidance.",
    },
  ]

  return (
    <section className="mt-24 px-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, index) => (
          <FeatureCard
            key={index}
            icon={feature.icon}
            title={feature.title}
            description={feature.description}
          />
        ))}
      </div>
    </section>
  )
}