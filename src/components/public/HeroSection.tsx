import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import logoImage from "@/assets/senior-gala-logo.png";
import LiveTicketStats from "./LiveTicketStats";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center sparkle-bg overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background z-0" />

      <div className="relative z-10 container mx-auto px-4 text-center pt-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center gap-6"
        >
          <img
            src={logoImage}
            alt="Senior Gala"
            className="w-64 md:w-80 lg:w-96 h-auto mb-2"
          />

          <p className="text-sm md:text-base font-body tracking-[0.3em] uppercase text-gold-light/70">
            Open to all Senior &amp; Finalist Students
          </p>

          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-semibold text-gold-gradient leading-tight">
            Senior Gala Night
          </h1>

          <p className="text-lg md:text-xl font-body text-foreground/70 max-w-lg">
            A night to remember before the next chapter begins
          </p>

          <p className="text-sm font-body text-muted-foreground tracking-widest uppercase">
            Coming Soon · Kigali, Rwanda
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <Link
              to="/register"
              className="px-8 py-3 text-base font-body font-semibold bg-gold text-background rounded-md hover:bg-gold-light transition-all duration-300 hover:scale-105"
            >
              Register Now
            </Link>
            <Link
              to="/pay"
              className="px-8 py-3 text-base font-body font-semibold border border-gold text-gold rounded-md hover:bg-gold/10 transition-all duration-300 hover:scale-105"
            >
              Complete Payment
            </Link>
          </div>

          <LiveTicketStats />
        </motion.div>

        <div className="mt-20 mb-8 flex justify-center">
          <div className="w-32 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
