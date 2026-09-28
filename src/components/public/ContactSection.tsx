import { motion } from "framer-motion";
import { Phone, Mail, MapPin } from "lucide-react";

const contacts = [
  { icon: Phone, label: "WhatsApp / Call", value: "+250 7XX XXX XXX" },
  { icon: Mail, label: "Email", value: "sadcorporation1@gmail.com" },
  { icon: MapPin, label: "Location", value: "Kigali, Rwanda" },
];

const ContactSection = () => {
  return (
    <section id="contact" className="py-20 md:py-28 bg-surface">
      <div className="container mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-display text-3xl md:text-5xl font-semibold text-gold-gradient mb-4">
            Contact Us
          </h2>
          <div className="w-16 h-px bg-gold/30 mx-auto" />
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {contacts.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="gold-card rounded-lg p-6 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-4">
                <item.icon className="w-5 h-5 text-gold" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-1">{item.label}</h3>
              <p className="text-sm text-muted-foreground font-body">{item.value}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
