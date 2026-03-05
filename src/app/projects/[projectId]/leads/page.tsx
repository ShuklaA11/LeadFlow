import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { PIPELINE_STAGE_LABELS } from '@/types';
import { formatRelativeDate } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default async function ProjectLeadsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) notFound();

  const leads = await prisma.lead.findMany({
    where: { projectId, status: 'ACTIVE' },
    include: {
      touchpoints: { orderBy: { sentAt: 'desc' }, take: 1 },
      _count: { select: { touchpoints: true } },
    },
    orderBy: { priorityScore: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project.name} — Leads</h1>
          <p className="text-muted-foreground">{leads.length} active leads</p>
        </div>
        <Link href={`/leads/new?projectId=${projectId}`}>
          <Button><Plus className="mr-2 h-4 w-4" /> Add Lead</Button>
        </Link>
      </div>

      {leads.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg mb-2">No leads yet</p>
          <p className="mb-4">Add your first lead to get started.</p>
          <Link href={`/leads/new?projectId=${projectId}`}><Button>Add Lead</Button></Link>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Touchpoints</TableHead>
                <TableHead>Last Contact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">{lead.firstName} {lead.lastName}</Link>
                    {lead.title && <div className="text-xs text-muted-foreground">{lead.title}</div>}
                  </TableCell>
                  <TableCell>{lead.company}</TableCell>
                  <TableCell><Badge variant="outline">{PIPELINE_STAGE_LABELS[lead.currentStage]}</Badge></TableCell>
                  <TableCell><Badge className={lead.priorityScore >= 70 ? 'bg-green-600' : lead.priorityScore >= 40 ? 'bg-yellow-600' : 'bg-gray-600'}>{lead.priorityScore}</Badge></TableCell>
                  <TableCell>{lead._count.touchpoints}</TableCell>
                  <TableCell className="text-muted-foreground">{lead.touchpoints[0] ? formatRelativeDate(lead.touchpoints[0].sentAt) : 'Never'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
