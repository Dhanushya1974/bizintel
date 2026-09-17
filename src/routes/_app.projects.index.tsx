import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, FileText, MapPin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/brand/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/brand/empty-state";
import { useProjects } from "@/lib/projects";
import { getProjectReport, downloadReport } from "@/lib/report";

export const Route = createFileRoute("/_app/projects/")({
  head: () => ({ meta: [{ title: "Projects & Reports — BizIntel" }] }),
  component: Projects,
});

const NewAnalysisButton = () => (
  <Link to="/analysis/new">
    <Button className="bg-[color:var(--color-brand)] text-[color:var(--color-brand-foreground)] hover:bg-[color:var(--color-brand)]/90">
      <Plus className="mr-1 h-4 w-4" /> New analysis
    </Button>
  </Link>
);

/** One consolidated report file — every Opportunities tab (market, competitors, location, insights). */
async function downloadFull(id: string, title: string) {
  const report = await getProjectReport(id);
  if (!report) return toast.error("Could not build that report");
  downloadReport(report);
  toast.success(`Downloading “${title}” — full report`);
}

function Projects() {
  const { projects, remove } = useProjects();

  return (
    <div>
      <PageHeader
        title="Projects & Reports"
        description="Every analysis in one place. Each project opens as a single consolidated report — market, competitors, location, financials and insights together."
        actions={<NewAnalysisButton />}
      />

      <div className="space-y-10 p-4 sm:p-8">
        {/* ---- Saved projects ------------------------------------------------ */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Saved projects
          </h2>

          {projects.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No saved projects yet"
              description="Run an analysis and it's saved here automatically as a consolidated report."
              action={<NewAnalysisButton />}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((p) => (
                <Card
                  key={p.id}
                  className="transition hover:border-[color:var(--color-brand)]/40 hover:shadow-md"
                >
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold">{p.title}</p>
                      <span className="text-lg font-bold text-[color:var(--color-brand)]">
                        {p.score}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <MapPin className="mr-1 inline h-3 w-3" />
                      {p.location}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {p.businessType}
                      </Badge>
                      <Badge className="bg-[color:var(--color-teal)]/20 text-foreground hover:bg-[color:var(--color-teal)]/20 text-[10px]">
                        {p.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Saved {p.updatedAt}</p>
                    <div className="flex flex-wrap gap-2">
                      <Link to="/projects/$id" params={{ id: p.id }} className="flex-1">
                        <Button variant="outline" className="w-full">
                          <FileText className="mr-1 h-4 w-4" /> Open report
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="Download full report"
                        onClick={() => downloadFull(p.id, p.title)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="Delete project"
                        onClick={() => {
                          remove(p.id);
                          toast.success(`Removed “${p.title}”`);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* ---- Downloads --------------------------------------------------- */}
        <section>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Downloads
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">
            One consolidated report per project — market, competitors, location, financials and
            insights combined into a single file.
          </p>

          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Save a project to generate a downloadable report.
            </p>
          ) : (
            <Card>
              <CardContent className="divide-y divide-border p-0">
                {projects.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center gap-3 p-4 sm:flex-nowrap">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[color:var(--color-brand)]/10 text-[color:var(--color-brand)]">
                      <FileText className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Consolidated report · HTML · {p.location} · {p.updatedAt}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => downloadFull(p.id, p.title)}
                    >
                      <Download className="mr-1 h-4 w-4" /> Download
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {projects.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                projects.forEach((p) => downloadFull(p.id, p.title));
              }}
            >
              <Download className="mr-1 h-4 w-4" /> Download all ({projects.length})
            </Button>
          )}
        </section>
      </div>
    </div>
  );
}
