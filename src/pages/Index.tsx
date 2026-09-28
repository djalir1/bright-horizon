import PublicLayout from "@/components/public/PublicLayout";
import HeroSection from "@/components/public/HeroSection";
import AboutSection from "@/components/public/AboutSection";
import HowItWorksSection from "@/components/public/HowItWorksSection";
import ContactSection from "@/components/public/ContactSection";

const Index = () => {
  return (
    <PublicLayout>
      <HeroSection />
      <AboutSection />
      <HowItWorksSection />
      <ContactSection />
    </PublicLayout>
  );
};

export default Index;
