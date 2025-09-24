import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Phone, 
  CheckCircle, 
  TrendingUp, 
  Clock, 
  Filter, 
  Search,
  Calendar
} from "lucide-react";

export default function Dashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Übersicht über alle Ihre Telefonagenten-Aktivitäten</p>
      </div>

      <div className="text-center py-16">
        <Phone className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Noch keine Anrufdaten vorhanden</h3>
        <p className="text-muted-foreground mb-6">
          Sobald Sie Ihren ersten Agent erstellt und Anrufe getätigt haben, werden hier Ihre Statistiken und Call-Daten angezeigt.
        </p>
      </div>
    </div>
  );
}