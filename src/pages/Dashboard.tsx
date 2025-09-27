import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { 
  Phone, 
  Clock, 
  Filter, 
  Search,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronRight,
  FileText,
  X,
  TrendingUp
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatInTimeZone } from "date-fns-tz";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [expandedTranscripts, setExpandedTranscripts] = useState<Set<string>>(new Set());
  
  // Filter states
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [phoneFilter, setPhoneFilter] = useState("");
  
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

  const clearFilters = () => {
    setSelectedAgent("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setPhoneFilter("");
  };

  const filteredCallLogs = callLogs.filter(log => {
    // Agent filter
    if (selectedAgent !== "all") {
      const agent = agents.find(a => a.elevenlabs_agent_id === log.elevenlabs_agent_id);
      if (agent?.id !== selectedAgent) return false;
    }
    
    // Date range filter
    if (dateFrom || dateTo) {
      const logDate = new Date(log.call_timestamp_unix * 1000);
      if (dateFrom && logDate < dateFrom) return false;
      if (dateTo && logDate > new Date(dateTo.getTime() + 24 * 60 * 60 * 1000 - 1)) return false;
    }
    
    // Phone number filter
    if (phoneFilter && !log.caller_number.includes(phoneFilter)) return false;
    
    return true;
  });

  const totalCalls = filteredCallLogs.length;
  const totalDuration = filteredCallLogs.reduce((sum, log) => sum + log.duration, 0);
  const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Anruf-Übersicht</h1>
        <p className="text-muted-foreground">Detaillierte Übersicht aller Anrufe ({totalCalls} von {totalCalls})</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gesamt Anrufe</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-primary">{totalCalls}</div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Erfolgreiche Anrufe</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-green-600">
              {filteredCallLogs.filter(log => log.Erfolgreich === true).length}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalCalls > 0 ? Math.round((filteredCallLogs.filter(log => log.Erfolgreich === true).length / totalCalls) * 100) : 0}% Erfolgsquote
            </p>
          </CardContent>
        </Card>

        {/* Success Rate Chart */}
        <Card className="bg-gradient-to-r from-green-50 to-red-50 border-muted">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Erfolgsübersicht
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { 
                        name: 'Erfolgreich', 
                        value: filteredCallLogs.filter(log => log.Erfolgreich === true).length,
                        color: '#22c55e'
                      },
                      { 
                        name: 'Nicht erfolgreich', 
                        value: filteredCallLogs.filter(log => log.Erfolgreich === false || log.Erfolgreich === null).length,
                        color: '#ef4444'
                      }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={20}
                    outerRadius={40}
                    dataKey="value"
                  >
                    <Cell fill="#22c55e" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Filters */}
      <Card className="bg-muted/30 border-muted">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Filter & Suche</CardTitle>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Zurücksetzen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Agent Filter */}
            <div className="space-y-2">
              <Label>Agent</Label>
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

            {/* Date From */}
            <div className="space-y-2">
              <Label>Von Datum</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal border-muted",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "dd.MM.yyyy") : "Datum wählen"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Date To */}
            <div className="space-y-2">
              <Label>Bis Datum</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal border-muted",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "dd.MM.yyyy") : "Datum wählen"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Phone Filter */}
            <div className="space-y-2">
              <Label>Telefonnummer</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nummer suchen..."
                  value={phoneFilter}
                  onChange={(e) => setPhoneFilter(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
          
          {/* Active Filters Display */}
          {(selectedAgent !== "all" || dateFrom || dateTo || phoneFilter) && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Aktive Filter:</span>
              {selectedAgent !== "all" && (
                <Badge variant="secondary">
                  Agent: {agents.find(a => a.id === selectedAgent)?.name}
                </Badge>
              )}
              {dateFrom && (
                <Badge variant="secondary">
                  Von: {format(dateFrom, "dd.MM.yyyy")}
                </Badge>
              )}
              {dateTo && (
                <Badge variant="secondary">
                  Bis: {format(dateTo, "dd.MM.yyyy")}
                </Badge>
              )}
              {phoneFilter && (
                <Badge variant="secondary">
                  Nummer: {phoneFilter}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Call Logs */}
      <Card className="bg-muted/30 border-muted">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Anruf-Logs</CardTitle>
            <Badge variant="outline" className="text-muted-foreground">
              {filteredCallLogs.length} {filteredCallLogs.length === 1 ? 'Anruf' : 'Anrufe'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Lade Anrufdaten...</p>
            </div>
          ) : filteredCallLogs.length === 0 ? (
            <div className="text-center py-16">
              <Phone className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                {callLogs.length === 0 ? 'Noch keine Anrufdaten vorhanden' : 'Keine Anrufe gefunden'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {callLogs.length === 0 
                  ? 'Sobald Sie Ihren ersten Agent erstellt und Anrufe getätigt haben, werden hier Ihre Statistiken und Call-Daten angezeigt.'
                  : 'Versuchen Sie andere Filtereinstellungen oder setzen Sie die Filter zurück.'
                }
              </p>
              {callLogs.length > 0 && (
                <Button variant="outline" onClick={clearFilters}>
                  Filter zurücksetzen
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCallLogs.map((log) => (
                <Card key={log.id} className="bg-background border-muted/50 shadow-sm">
                  <CardContent className="p-3">
                     {/* Main Call Info Grid */}
                     <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-3">
                       {/* Agent */}
                       <div>
                         <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Agent</p>
                         <p className="font-semibold">{getAgentName(log.elevenlabs_agent_id)}</p>
                       </div>
                       
                       {/* Date/Time */}
                       <div>
                         <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Zeitpunkt</p>
                         <p className="font-semibold text-sm">{formatUnixTimestamp(log.call_timestamp_unix)}</p>
                       </div>
                       
                       {/* Caller */}
                       <div>
                         <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Anrufer</p>
                         <p className="font-semibold">{log.caller_number}</p>
                       </div>

                       {/* Success Status */}
                       <div>
                         <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Erfolgreich</p>
                         <div className="flex items-center gap-2">
                           <div className={`w-2 h-2 rounded-full ${log.Erfolgreich ? 'bg-green-500' : 'bg-red-500'}`}></div>
                           <span className={`text-sm font-medium ${log.Erfolgreich ? 'text-green-600' : 'text-red-600'}`}>
                             {log.Erfolgreich ? 'Ja' : 'Nein'}
                           </span>
                         </div>
                       </div>

                       {/* Expand Button */}
                       <div className="flex justify-end">
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => toggleTranscript(log.id)}
                           className="flex items-center gap-2"
                         >
                           <span className="font-medium">Details</span>
                           {expandedTranscripts.has(log.id) ? (
                             <ChevronDown className="h-4 w-4" />
                           ) : (
                             <ChevronRight className="h-4 w-4" />
                           )}
                         </Button>
                       </div>
                     </div>
                     
                     {/* Expandable Details Section */}
                     {expandedTranscripts.has(log.id) && (
                       <div className="border-t border-muted/50 pt-4 space-y-4">
                         {/* Summary */}
                         {log.Zusammenfassung && (
                           <div>
                             <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Zusammenfassung</p>
                             <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                               <p className="text-sm leading-relaxed">{log.Zusammenfassung}</p>
                             </div>
                           </div>
                         )}

                         {/* Transcript */}
                         {log.transcript && (
                           <div>
                             <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Transkript</p>
                             <div className="p-3 bg-muted/30 rounded-md border border-muted">
                               <p className="text-sm leading-relaxed whitespace-pre-wrap">{log.transcript}</p>
                             </div>
                           </div>
                         )}

                          {/* Usage */}
                          {log.Verbrauch && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Verbrauch</p>
                              <div className="p-3 bg-muted/30 rounded-md border border-muted">
                                <p className="text-sm">
                                  <span className="font-semibold">{Math.ceil(log.Verbrauch / 60)}</span> Minuten
                                </p>
                              </div>
                            </div>
                          )}
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