import PublicLayout from "@/components/public/PublicLayout";

const TermsPage = () => {
  return (
    <PublicLayout>
      <div className="min-h-screen pt-28 pb-20 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-display text-4xl md:text-5xl text-gold-gradient mb-3">Terms &amp; Conditions</h1>
          <p className="text-sm text-muted-foreground font-body mb-10">Senior Gala 2026 · Last updated: May 2026</p>

          <div className="space-y-8 font-body text-foreground/80 leading-relaxed">
            <section>
              <h2 className="font-display text-2xl text-gold mb-3">1. Eligibility</h2>
              <p>The Senior Gala is intended for finalist / senior students who are eighteen (18) years of age or above at the time of the event. By registering, you confirm that you meet this age requirement and that the information you provide is true and accurate.</p>
            </section>

            <section>
              <h2 className="font-display text-2xl text-gold mb-3">2. Ticket Price (All-In)</h2>
              <p>Ticket prices are <strong>all-inclusive</strong> — there is no separate registration fee. Tiers: <span className="text-gold font-semibold">Founder 19,500 RWF</span> · <span className="text-gold font-semibold">General 26,500 RWF</span> · <span className="text-gold font-semibold">VIP / Privée 36,500 RWF</span>.</p>
              <p className="mt-2">Payments are processed via Mobile Money (MoMo) or cash through an authorized agent. Payments are reviewed and approved by the Senior Gala team. Approved payments are final.</p>
            </section>

            <section>
              <h2 className="font-display text-2xl text-gold mb-3">4. Refund Policy</h2>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Ticket payments:</strong> Non-refundable once approved by the Senior Gala team.</li>
                <li><strong>Event cancellation:</strong> If the Senior Gala team cancels the event for reasons within its control, approved ticket payments will be refunded in full within 30 days, minus mobile-money transaction fees.</li>
                <li><strong>Force majeure:</strong> No refunds are owed if the event is cancelled, postponed, or modified due to circumstances beyond our control (natural disaster, government order, public-health restrictions, etc.).</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-2xl text-gold mb-3">5. E-Ticket &amp; Entry</h2>
              <p>Once your ticket payment is approved, you may download your e-ticket from the Balance page. The e-ticket contains a unique QR code linked to your registration. <strong>Each ticket admits one (1) person only</strong> and is non-transferable. You must present a valid e-ticket (digital or printed) along with a matching ID at the entrance.</p>
            </section>

            <section>
              <h2 className="font-display text-2xl text-gold mb-3">6. Code of Conduct</h2>
              <p>Attendees agree to behave respectfully and lawfully throughout the event. The Senior Gala team reserves the right to refuse entry or remove any attendee for disruptive, illegal, or unsafe behaviour, with no refund.</p>
            </section>

            <section>
              <h2 className="font-display text-2xl text-gold mb-3">7. Photography &amp; Media</h2>
              <p>By attending, you consent to being photographed or filmed for promotional use by the Senior Gala team and S.A.D Corporation.</p>
            </section>

            <section>
              <h2 className="font-display text-2xl text-gold mb-3">8. Data Privacy</h2>
              <p>Personal information collected during registration is used solely for event management and communication. We do not sell or share your data with third parties.</p>
            </section>

            <section>
              <h2 className="font-display text-2xl text-gold mb-3">9. Liability</h2>
              <p>The Senior Gala team and S.A.D Corporation are not liable for personal injury, loss, or damage to property occurring before, during, or after the event, except where required by law.</p>
            </section>

            <section>
              <h2 className="font-display text-2xl text-gold mb-3">10. Changes</h2>
              <p>We may update these terms at any time. The latest version will always be available on this page.</p>
            </section>

            <section>
              <h2 className="font-display text-2xl text-gold mb-3">11. Contact</h2>
              <p>For questions about these terms, contact <a className="text-gold hover:underline" href="mailto:sadcorporation1@gmail.com">sadcorporation1@gmail.com</a>.</p>
            </section>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default TermsPage;