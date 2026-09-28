import { motion } from "framer-motion";

const steps = [
  {
    number: "1",
    title: "Pick Your Tier",
    description: "Open the Register page and choose Founder, General or VIP — all-in prices, no extra booking fee.",
  },
  {
    number: "2",
    title: "Fill Your Details",
    description: "Select your school (or General Public), enter your name, phone, and email. Takes under a minute.",
  },
  {
    number: "3",
    title: "Pay & Get Your Ticket",
    description: "Send the payment via MoMo, upload the screenshot, and your e-ticket is issued instantly — confirmed once our team verifies.",
  },
];

const HowItWorksSection = () => {
  return (
    <section className="py-20 md:py-28 bg-surface">
      <div className="container mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="font-display text-3xl md:text-5xl font-semibold text-gold-gradient mb-4">
            How It Works
          </h2>
          <div className="w-16 h-px bg-gold/30 mx-auto" />
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-6 relative">
          <div className="hidden lg:block absolute top-10 left-[calc(12.5%+24px)] right-[calc(12.5%+24px)] h-px bg-gold/20" />

          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="flex flex-col items-center text-center"
            >
              <div className="w-14 h-14 rounded-full border-2 border-gold bg-gold/10 flex items-center justify-center mb-5 relative z-10">
                <span className="font-display text-2xl font-bold text-gold">{step.number}</span>
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground font-body leading-relaxed max-w-xs">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <a
            href="/senior-gala-user-manual.pdf"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-gold/40 bg-gold/10 text-gold hover:bg-gold/20 transition-colors font-body text-sm"
          >
            Download the User Manual (PDF)
          </a>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
