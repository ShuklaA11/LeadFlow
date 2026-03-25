'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Phone } from 'lucide-react';
import { CALL_SENTIMENT_LABELS } from '@/types';
import type { StructuredNotes } from '@/types';
import { formatDate } from '@/lib/utils';

interface CallData {
  id: string;
  title: string;
  callDate: Date;
  durationMinutes: number | null;
  sentiment: string | null;
  sentimentScore: number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  structuredNotes: any;
  manualNotes: string | null;
  transcript: string | null;
  audioFilePath: string | null;
}

function sentimentColor(sentiment: string | null): string {
  switch (sentiment) {
    case 'VERY_POSITIVE': return 'bg-green-600';
    case 'POSITIVE': return 'bg-green-500';
    case 'NEUTRAL': return 'bg-gray-500';
    case 'NEGATIVE': return 'bg-orange-500';
    case 'VERY_NEGATIVE': return 'bg-red-500';
    default: return 'bg-gray-400';
  }
}

export function CallList({ calls }: { calls: CallData[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (calls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Phone className="h-8 w-8 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">No calls logged yet.</p>
        <p className="text-xs text-muted-foreground mt-1">Use &quot;Log Call&quot; to upload a recording or enter manual notes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {calls.map((call) => {
        const expanded = expandedId === call.id;
        const notes = call.structuredNotes as StructuredNotes | null;

        return (
          <Card key={call.id}>
            <CardContent className="pt-4">
              <Button
                variant="ghost"
                className="w-full justify-start p-0 h-auto hover:bg-transparent"
                onClick={() => setExpandedId(expanded ? null : call.id)}
              >
                <div className="flex items-center gap-3 w-full">
                  {expanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{call.title}</span>
                      {call.sentiment && (
                        <Badge className={`text-xs ${sentimentColor(call.sentiment)}`}>
                          {CALL_SENTIMENT_LABELS[call.sentiment] || call.sentiment}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>{formatDate(call.callDate)}</span>
                      {call.durationMinutes && <span>· {call.durationMinutes} min</span>}
                      {call.audioFilePath && <span>· Has recording</span>}
                    </div>
                  </div>
                </div>
              </Button>

              {expanded && notes && (
                <div className="mt-4 ml-7 space-y-3 border-t pt-3">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Summary</h4>
                    <p className="text-sm text-muted-foreground">{notes.summary}</p>
                  </div>

                  {notes.keyPoints?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Key Points</h4>
                      <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-0.5">
                        {notes.keyPoints.map((p, i) => <li key={i}>{p}</li>)}
                      </ul>
                    </div>
                  )}

                  {notes.objections?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Objections</h4>
                      <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-0.5">
                        {notes.objections.map((o, i) => <li key={i}>{o}</li>)}
                      </ul>
                    </div>
                  )}

                  {notes.validationSignals?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Validation Signals</h4>
                      <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-0.5">
                        {notes.validationSignals.map((v, i) => <li key={i}>{v}</li>)}
                      </ul>
                    </div>
                  )}

                  {notes.commitments?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Commitments</h4>
                      <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-0.5">
                        {notes.commitments.map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                    </div>
                  )}

                  {notes.nextSteps?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Next Steps</h4>
                      <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-0.5">
                        {notes.nextSteps.map((n, i) => <li key={i}>{n}</li>)}
                      </ul>
                    </div>
                  )}

                  {notes.quotes?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Key Quotes</h4>
                      <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-0.5">
                        {notes.quotes.map((q, i) => <li key={i}>&ldquo;{q}&rdquo;</li>)}
                      </ul>
                    </div>
                  )}

                  {call.manualNotes && !call.transcript && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Manual Notes</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{call.manualNotes}</p>
                    </div>
                  )}
                </div>
              )}

              {expanded && !notes && call.manualNotes && (
                <div className="mt-4 ml-7 border-t pt-3">
                  <h4 className="text-sm font-medium mb-1">Manual Notes</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{call.manualNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
