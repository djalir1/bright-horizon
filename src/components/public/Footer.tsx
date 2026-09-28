import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-background border-t border-gold/10 py-10">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg text-gold">Senior Gala</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground font-body">
            <Link to="/" className="hover:text-gold transition-colors">Home</Link>
            <Link to="/about" className="hover:text-gold transition-colors">About</Link>
            <Link to="/register" className="hover:text-gold transition-colors">Register</Link>
            <Link to="/pay" className="hover:text-gold transition-colors">Pay</Link>
            <Link to="/ticket" className="hover:text-gold transition-colors">Ticket</Link>
            <Link to="/contact" className="hover:text-gold transition-colors">Contact</Link>
            <Link to="/refund-policy" className="hover:text-gold transition-colors">Refund Policy</Link>
            <a href="/senior-gala-user-manual.pdf" target="_blank" rel="noopener" className="hover:text-gold transition-colors">User Manual</a>
          </div>
          <div className="text-center md:text-right">
            <p className="text-xs text-muted-foreground font-body">© 2026 Senior Gala. All rights reserved.</p>
            <p className="text-xs text-muted-foreground/60 font-body mt-1">
              Designed &amp; developed by{" "}
              <a
                href="https://sadcorporation.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold hover:text-gold-light transition-colors"
              >
                S.A.D Corporation
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
