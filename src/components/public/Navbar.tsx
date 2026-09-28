import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Pay", href: "/pay" },
  { label: "Ticket", href: "/ticket" },
  { label: "Receipt", href: "/receipt" },
  { label: "Contact", href: "/contact" },
];

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/90 backdrop-blur-md border-b border-gold/20"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 md:px-8 flex items-center justify-between h-16 md:h-20">
        <Link to="/" className="flex items-center gap-2">
          <svg width="20" height="16" viewBox="0 0 20 16" fill="none" className="text-gold">
            <path d="M10 0L12 4L16 2L14 6L18 6L14 8L16 12L12 10L10 14L8 10L4 12L6 8L2 6L6 6L4 2L8 4L10 0Z" fill="currentColor" opacity="0.8"/>
            <path d="M3 14H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span className="font-display text-xl md:text-2xl font-semibold text-gold">
            Senior Gala
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="text-sm font-body text-foreground/70 hover:text-gold transition-colors duration-200"
            >
              {link.label}
            </Link>
          ))}
          <a
            href="/senior-gala-user-manual.pdf"
            target="_blank"
            rel="noopener"
            className="text-sm font-body text-foreground/70 hover:text-gold transition-colors duration-200"
          >
            User Manual
          </a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/register"
            className="px-5 py-2 text-sm font-body font-medium bg-gold text-background rounded-md hover:bg-gold-light transition-all duration-200 hover:scale-105"
          >
            Register
          </Link>
          <Link
            to="/pay"
            className="px-5 py-2 text-sm font-body font-medium border border-gold text-gold rounded-md hover:bg-gold/10 transition-all duration-200 hover:scale-105"
          >
            Pay Now
          </Link>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden text-foreground p-2"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background/95 backdrop-blur-md border-b border-gold/20 overflow-hidden"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="text-foreground/70 hover:text-gold py-2 font-body transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <a
                href="/senior-gala-user-manual.pdf"
                target="_blank"
                rel="noopener"
                className="text-foreground/70 hover:text-gold py-2 font-body transition-colors"
              >
                User Manual
              </a>
              <div className="flex gap-3 pt-2">
                <Link
                  to="/register"
                  className="flex-1 text-center px-4 py-2.5 text-sm font-medium bg-gold text-background rounded-md"
                >
                  Register
                </Link>
                <Link
                  to="/pay"
                  className="flex-1 text-center px-4 py-2.5 text-sm font-medium border border-gold text-gold rounded-md"
                >
                  Pay Now
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
