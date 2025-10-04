import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Phone, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { BatchCallStarter } from "@/components/BatchCallStarter";

interface BatchCall {
  batchid: string;
  callname: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function BatchCalls() {
  const navigate = useNavigate();
  const [batchCalls, setBatchCalls] = useState<BatchCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchBatchCalls(pagination.page);
  }, []);

  const fetchBatchCalls = async (page: number = 1) => {
    setLoading(true);
    try {
      const url = new URL(`${supabase.functions.invoke}/get-batch-calls`);
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        throw new Error('No auth token');
      }

      const response = await fetch(
        `https://ubqcxxfynhnwhvtogkvx.supabase.co/functions/v1/get-batch-calls?page=${page}&pageSize=20`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      
      if (data?.success) {
        setBatchCalls(data.items || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        throw new Error(data.error || 'Failed to fetch batch calls');
      }
    } catch (error: any) {
      console.error('Error fetching batch calls:', error);
      toast({
        title: "Fehler",
        description: "Batch-Calls konnten nicht geladen werden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    fetchBatchCalls(newPage);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('de-DE');
  };

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case 'completed':
      case 'done':
        return <Badge variant="default">Abgeschlossen</Badge>;
      case 'in_progress':
        return <Badge variant="secondary">In Bearbeitung</Badge>;
      case 'failed':
        return <Badge variant="destructive">Fehlgeschlagen</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Lade Batch-Calls...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Batch-Calls</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Batch-Anrufe und überprüfen Sie die Ergebnisse
          </p>
        </div>
        <BatchCallStarter onBatchStarted={fetchBatchCalls} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Batch-Call Übersicht
          </CardTitle>
          <CardDescription>
            Ihre letzten Batch-Calls
          </CardDescription>
        </CardHeader>
        <CardContent>
          {batchCalls.length === 0 ? (
            <div className="text-center py-8">
              <Phone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Noch keine Batch-Calls vorhanden</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Call Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Erstellt am</TableHead>
                  <TableHead>Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batchCalls.map((batch) => (
                  <TableRow 
                    key={batch.batchid}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/batch-calls/${batch.batchid}`)}
                  >
                    <TableCell className="font-medium">
                      {batch.callname || `Batch ${batch.batchid.slice(0, 8)}`}
                    </TableCell>
                    <TableCell>{getStatusBadge(batch.status)}</TableCell>
                    <TableCell>{formatDate(batch.created_at)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/batch-calls/${batch.batchid}`)}
                      >
                        Details ansehen
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          
          {batchCalls.length > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Seite {pagination.page} von {pagination.totalPages} ({pagination.total} gesamt)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={!pagination.hasPrevPage || loading}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Zurück
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.hasNextPage || loading}
                >
                  Weiter
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}