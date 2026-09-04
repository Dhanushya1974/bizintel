import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, MapPin, Plus } from "lucide-react";
import { PageHeader } from "@/components/brand/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/brand/empty-state";
import { SAVED_PROJECTS } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/projects/")({
  head: () => ({ meta: [{ title: "Projects & Reports — BizIntel" }] }),
  component: Projects,
});

function Projects() {
  return (
    <div>
      <PageHeader
        title="Projects & Reports"
        description="Every analysis in one place. Each project opens as a single consolidated report — market, competitors, location, financials and insights together."
        actions={
          <Link to="/analysis/new">
            <Button className="bg-[color:var(--color-brand)] text-[color:var(--color-brand-foreground)] hover:bg-[color:var(--color-brand)]/90">
              <Plus className="mr-1 h-4 w-4" /> New analysis
            </Button>
          </Link>
        }
      />
      <div className="p-4 sm:p-8">
        {SAVED_PROJECTS.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No projects yet"
            description="Run your first analysis to generate a consolidated report."
            action={
              <Link to="/analysis/new">
                <Button className="bg-[color:var(--color-brand)] text-[color:var(--color-brand-foreground)] hover:bg-[color:var(--color-brand)]/90">
                  <Plus className="mr-1 h-4 w-4" /> New analysis
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {SAVED_PROJECTS.map((p) => (
              <Card key={p.id} className="transition hover:border-[color:var(--color-brand)]/40 hover:shadow-md">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between">
                    <p className="font-semibold">{p.title}</p>
                    <span className="text-lg font-bold text-[color:var(--color-brand)]">{p.score}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <MapPin className="mr-1 inline h-3 w-3" />
                    {p.location}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">{p.businessType}</Badge>
                    <Badge className="bg-[color:var(--color-teal)]/20 text-foreground hover:bg-[color:var(--color-teal)]/20 text-[10px]">{p.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Updated {p.updatedAt}</p>
                  <Link to="/projects/$id" params={{ id: p.id }}>
                    <Button variant="outline" className="w-full">
                      <FileText className="mr-1 h-4 w-4" /> Open report
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
