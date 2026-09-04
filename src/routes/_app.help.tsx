import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/brand/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

const FAQ = [
  { q: "How is the opportunity score calculated?", a: "We combine demand, competitor density, demographic fit, and macro trend signals into a 0–100 score with confidence bands." },
  { q: "Where does the data come from?", a: "Live sources include mapping providers, review aggregators, mobility panels and public demographic datasets." },
  { q: "Can I export reports?", a: "Yes — PDF, CSV and XLSX exports are available on every plan." },
  { q: "Do you support team seats?", a: "Growth and Business plans include multi-seat workspaces with role-based access." },
];

export const Route = createFileRoute("/_app/help")({
  head: () => ({ meta: [{ title: "Help & Support — BizIntel" }] }),
  component: () => (
    <div>
      <PageHeader title="Help & support" description="Answers, guides, and a direct line to our team." actions={<Button className="bg-[color:var(--color-brand)] text-[color:var(--color-brand-foreground)] hover:bg-[color:var(--color-brand)]/90"><MessageSquare className="mr-1 h-4 w-4" />Contact support</Button>} />
      <div className="mx-auto max-w-3xl p-4 sm:p-8">
        <Card><CardContent className="p-4">
          <Accordion type="single" collapsible>
            {FAQ.map((f, i) => (
              <AccordionItem key={f.q} value={`i${i}`}><AccordionTrigger>{f.q}</AccordionTrigger><AccordionContent>{f.a}</AccordionContent></AccordionItem>
            ))}
          </Accordion>
        </CardContent></Card>
      </div>
    </div>
  ),
});