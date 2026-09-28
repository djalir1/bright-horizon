import PublicLayout from "@/components/public/PublicLayout";

const RefundPolicy = () => (
  <PublicLayout>
    <div className="pt-28 pb-20 px-4">
      <article className="max-w-3xl mx-auto gold-card rounded-xl p-8 md:p-12 font-body text-foreground/90 leading-relaxed">
        <h1 className="font-display text-3xl md:text-4xl text-gold-gradient mb-2">Refund Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Senior Gala Kigali 2026 · S.A.D Corporation</p>

        <Section n="1" title="Event goes ahead as planned">
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li><strong>All-in ticket payments (Founder / General / VIP)</strong> are non-refundable once the event is confirmed and proceeding, because we commit your payment to venue, catering, and production costs in advance.</li>
          </ul>
        </Section>

        <Section n="2" title="If the event is cancelled or does not happen">
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>If S.A.D Corporation cancels the event entirely, <strong>ALL ticket payments</strong> (Founder, General, and VIP) are <strong>FULLY REFUNDABLE</strong>.</li>
            <li><strong>HOWEVER:</strong> refunds are issued <em>minus</em> the mobile money transaction fees that were charged when you paid. These fees are taken by the mobile money provider (MTN MoMo / Airtel Money), not by us — we never received that portion, so we cannot refund it.</li>
            <li><em>Example:</em> if you paid 26,500 RWF and the MoMo fee was 300 RWF, your refund would be 26,200 RWF.</li>
          </ul>
        </Section>

        <Section n="3" title="Refund timeline if event is cancelled">
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>Refunds will be processed within <strong>14 days</strong> of the cancellation announcement.</li>
            <li>Refunds are sent to the same mobile money number used for payment.</li>
            <li>You will be notified by SMS and email once your refund is sent.</li>
          </ul>
        </Section>

        <Section n="4" title="If the event is postponed (not cancelled)">
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>Your ticket remains valid for the new date.</li>
            <li>If you cannot attend the new date, you may request a refund within <strong>7 days</strong> of the new date announcement, minus mobile money fees.</li>
          </ul>
        </Section>

        <Section n="5" title="No-show policy">
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>If you buy a ticket and simply do not attend an event that went ahead as planned, <strong>no refund is given</strong>. This is standard for all events.</li>
          </ul>
        </Section>

        <div className="mt-10 border-t border-gold/10 pt-6 text-xs text-muted-foreground">
          <p>Questions? Contact <a href="mailto:sadcorporation1@gmail.com" className="text-gold hover:underline">sadcorporation1@gmail.com</a> · <a href="tel:+250786324622" className="text-gold hover:underline">+250 786 324 622</a></p>
        </div>
      </article>
    </div>
  </PublicLayout>
);

const Section = ({ n, title, children }: { n: string; title: string; children: React.ReactNode }) => (
  <section className="mb-8">
    <h2 className="font-display text-xl text-gold mb-3 flex items-baseline gap-3">
      <span className="text-gold/50 font-mono text-sm">{n}.</span> {title}
    </h2>
    {children}
  </section>
);

export default RefundPolicy;