import { MapPin, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { COMPETITORS } from "@/lib/mock-data";

export function CompetitorsPanel() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle>Competitors within 1.5 miles</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Distance</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {COMPETITORS.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell><Badge variant="secondary">{c.category}</Badge></TableCell>
                  <TableCell><MapPin className="mr-1 inline h-3 w-3 text-muted-foreground" />{c.distanceMi} mi</TableCell>
                  <TableCell><Star className="mr-1 inline h-3 w-3 fill-[color:var(--color-brand)] text-[color:var(--color-brand)]" />{c.rating} <span className="text-xs text-muted-foreground">({c.reviews})</span></TableCell>
                  <TableCell>{"$".repeat(c.priceLevel)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Cluster map</CardTitle></CardHeader>
        <CardContent>
          <div className="relative h-72 overflow-hidden rounded-lg bg-[color:var(--color-navy)]/5">
            <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle at 30% 40%, oklch(0.72 0.13 178 / 0.4) 0, transparent 40%), radial-gradient(circle at 70% 60%, oklch(0.62 0.16 258 / 0.4) 0, transparent 40%)" }} />
            {COMPETITORS.map((c, i) => (
              <span key={c.id} className="absolute h-3 w-3 rounded-full bg-[color:var(--color-brand)] ring-2 ring-white" style={{ left: `${15 + i * 15}%`, top: `${25 + (i % 3) * 20}%` }} title={c.name} />
            ))}
            <span className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--color-teal)] ring-4 ring-white" title="Your site" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Teal marker = candidate site. Blue markers = competitors.</p>
        </CardContent>
      </Card>
    </div>
  );
}
