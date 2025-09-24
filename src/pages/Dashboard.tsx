import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Phone, 
  CheckCircle, 
  TrendingUp, 
  Clock, 
  Filter, 
  Search,
  Calendar,
  ChevronDown,
  ChevronRight,
  FileText
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatInTimeZone } from "date-fns-tz";

export default function Dashboard() {
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [expandedTranscripts, setExpandedTranscripts] = useState<Set<string>>(new Set());
  
  const { toast } = useToast();

  useEffect(() => {
    loadCallLogs();
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  };

  const loadCallLogs = async () => {
    try {
      setLoading(true);
      
      // Get call logs - RLS will automatically filter by user's agents
      const { data, error } = await supabase
        .from('call_logs')
        .select('*')
        .order('call_timestamp_unix', { ascending: false });

      if (error) throw error;
      setCallLogs(data || []);
    } catch (error) {
      console.error('Error loading call logs:', error);
      toast({
        title: "Fehler",
        description: "Call-Logs konnten nicht geladen werden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatUnixTimestamp = (unixTimestamp: number) => {
    try {
      // Convert unix timestamp to Date and format for Europe/Paris timezone
      const date = new Date(unixTimestamp * 1000);
      return formatInTimeZone(date, 'Europe/Paris', 'dd.MM.yyyy HH:mm:ss');
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Ungültiges Datum';
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTranscript = (logId: string) => {
    const newExpanded = new Set(expandedTranscripts);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedTranscripts(newExpanded);
  };

  const getAgentName = (elevenlabsAgentId: string) => {
    const agent = agents.find(a => a.elevenlabs_agent_id === elevenlabsAgentId);
    return agent?.name || 'Unbekannter Agent';
  };

  const filteredCallLogs = selectedAgent === "all" 
    ? callLogs 
    : callLogs.filter(log => {
        const agent = agents.find(a => a.elevenlabs_agent_id === log.elevenlabs_agent_id);
        return agent?.id === selectedAgent;
      });

  const totalCalls = filteredCallLogs.length;
  const totalDuration = filteredCallLogs.reduce((sum, log) => sum + log.duration, 0);
  const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Übersicht über alle Ihre Telefonagenten-Aktivitäten</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamt Anrufe</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCalls}</div>
            <p className="text-xs text-muted-foreground">
              Alle aufgezeichneten Anrufe
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamtdauer</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(totalDuration)}</div>
            <p className="text-xs text-muted-foreground">
              Minuten:Sekunden
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ø Dauer</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(avgDuration)}</div>
            <p className="text-xs text-muted-foreground">
              Durchschnittliche Anrufdauer
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger>
                  <SelectValue placeholder="Agent auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Agenten</SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Anruf-Logs
          </CardTitle>
          <CardDescription>
            Alle Anrufe Ihrer Agenten im Detail
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Lade Anrufdaten...</p>
            </div>
          ) : filteredCallLogs.length === 0 ? (
            <div className="text-center py-16">
              <Phone className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Noch keine Anrufdaten vorhanden</h3>
              <p className="text-muted-foreground mb-6">
                Sobald Sie Ihren ersten Agent erstellt und Anrufe getätigt haben, werden hier Ihre Statistiken und Call-Daten angezeigt.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCallLogs.map((log) => (
                <Card key={log.id} className="border-l-4 border-l-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-primary" />
                          <div>
                            <p className="font-semibold">{getAgentName(log.elevenlabs_agent_id)}</p>
                            <p className="text-sm text-muted-foreground">Agent</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{formatUnixTimestamp(log.call_timestamp_unix)}</p>
                            <p className="text-sm text-muted-foreground">Anrufdatum (Paris Zeit)</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{formatDuration(log.duration)}</p>
                            <p className="text-sm text-muted-foreground">Dauer</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{log.caller_number}</p>
                            <p className="text-sm text-muted-foreground">Anrufer</p>
                          </div>
                        </div>
                      </div>
                      
                      {log.transcript && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleTranscript(log.id)}
                          className="flex items-center gap-2"
                        >
                          <FileText className="h-4 w-4" />
                          Transkript
                          {expandedTranscripts.has(log.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                    
                    {log.transcript && expandedTranscripts.has(log.id) && (
                      <div className="mt-4 p-4 bg-muted rounded-lg">
                        <h4 className="font-semibold mb-2 text-sm text-muted-foreground">TRANSKRIPT:</h4>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {log.transcript}
                        </p>
                      </div>
                    )}
                    
                    {!log.transcript && (
                      <div className="mt-2">
                        <Badge variant="secondary" className="text-xs">
                          Kein Transkript verfügbar
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}