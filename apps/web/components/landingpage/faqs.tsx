import { FaqAccordion, type FaqItem } from "@/components/faq-accordion";
import { Eyebrow } from "@/components/marketing/primitives";
import { BRAND } from "@/lib/site";
import { LANDING_FAQS } from "./faq-data";

/**
 * The FAQ band on the landing pages (plan/web/revamp REV-16, REV-21): a sticky
 * heading on the left, the shared accordion on the right. `/` passes nothing and
 * gets LANDING_FAQS; `/hire` passes its own questions.
 *
 * Server component: the accordion is the only interactive part.
 */
export default function FaqsAccrodian({
    faqs = LANDING_FAQS,
    idPrefix = "landing-faq",
    sub = "What the platform does, what it costs, what runs where, and the things it deliberately does not do.",
    contact = BRAND.email,
}: {
    faqs?: readonly FaqItem[];
    idPrefix?: string;
    sub?: string;
    contact?: string;
}) {
    return (
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-20">
                <div className="lg:col-span-4">
                    <div className="lg:sticky lg:top-28">
                        <Eyebrow>Questions</Eyebrow>
                        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-neutral-900 md:text-4xl">
                            Before you sign up
                        </h2>
                        <p className="mt-4 text-base leading-7 text-neutral-600">{sub}</p>
                        <a
                            href={`mailto:${contact}`}
                            className="mt-6 inline-flex border-b border-neutral-300 pb-0.5 text-[15px] font-medium text-neutral-900 transition-colors hover:border-neutral-900"
                        >
                            Ask us anything else
                        </a>
                    </div>
                </div>
                <div className="lg:col-span-8">
                    <FaqAccordion faqs={faqs} idPrefix={idPrefix} />
                </div>
            </div>
        </div>
    );
}
