import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Crown, 
  User, 
  Clock, 
  CreditCard, 
  Settings as SettingsIcon,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  username: string;
  full_name?: string;
  subscription_type: string;
  minutes_used: number;
  minutes_limit: number;
}

export default function Settings() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
        } else {
          setProfile(data);
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (formData: FormData) => {
    setUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updates = {
        username: formData.get('username') as string,
        full_name: formData.get('full_name') as string,
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) {
        toast({
          title: "Fehler",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erfolgreich",
          description: "Profil wurde aktualisiert",
        });
        fetchProfile();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setUpdating(false);
    }
  };

  const upgradeToPremium = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ 
          subscription_type: 'premium',
          minutes_limit: 1000 // 1000 minutes for premium
        })
        .eq('user_id', user.id);

      if (error) {
        toast({
          title: "Fehler",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Willkommen bei Premium!",
          description: "Ihr Account wurde erfolgreich auf Premium upgradet",
        });
        fetchProfile();
      }
    } catch (error) {
      console.error('Error upgrading to premium:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <SettingsIcon className="w-8 h-8 animate-pulse mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Wird geladen...</p>
        </div>
      </div>
    );
  }

  const minutesUsedPercentage = profile && profile.minutes_limit > 0 
    ? (profile.minutes_used / profile.minutes_limit) * 100 
    : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Einstellungen</h1>
        <p className="text-muted-foreground">Verwalten Sie Ihr Konto und Ihre Einstellungen</p>
      </div>

      {/* Account Information */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Konto Informationen
          </CardTitle>
          <CardDescription>
            Verwalten Sie Ihre persönlichen Daten
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profile && (
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              await handleUpdateProfile(formData);
            }} className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="username">Benutzername</Label>
                <Input
                  id="username"
                  name="username"
                  defaultValue={profile.username}
                  disabled={updating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">Vollständiger Name</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  defaultValue={profile.full_name || ""}
                  disabled={updating}
                />
              </div>
              <Button type="submit" disabled={updating}>
                {updating ? "Wird gespeichert..." : "Änderungen speichern"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Subscription Status */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Abonnement Status
          </CardTitle>
          <CardDescription>
            Ihr aktueller Plan und Nutzung
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profile && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Badge 
                  variant={profile.subscription_type === 'premium' ? 'default' : 'secondary'}
                  className="text-sm"
                >
                  {profile.subscription_type === 'premium' ? (
                    <>
                      <Crown className="w-4 h-4 mr-1" />
                      Premium
                    </>
                  ) : (
                    'Free'
                  )}
                </Badge>
                {profile.subscription_type === 'premium' ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">Alle Features verfügbar</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-orange-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">Limitierte Features</span>
                  </div>
                )}
              </div>

              {profile.subscription_type === 'free' && (
                <Alert>
                  <Crown className="h-4 w-4" />
                  <AlertDescription>
                    Upgraden Sie auf Premium, um unbegrenzt Agenten zu erstellen und alle Features zu nutzen.
                  </AlertDescription>
                </Alert>
              )}

              {profile.subscription_type === 'premium' && (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Verbrauchte Minuten</span>
                      <span>{profile.minutes_used} von {profile.minutes_limit}</span>
                    </div>
                    <Progress value={minutesUsedPercentage} className="h-2" />
                  </div>
                  
                  {minutesUsedPercentage > 80 && (
                    <Alert>
                      <Clock className="h-4 w-4" />
                      <AlertDescription>
                        Sie haben bereits {Math.round(minutesUsedPercentage)}% Ihrer Minuten verbraucht.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscription Management */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Abonnement verwalten
          </CardTitle>
          <CardDescription>
            Ändern Sie Ihren Plan oder buchen Sie zusätzliche Minuten
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {profile?.subscription_type === 'free' ? (
              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-gradient-subtle">
                  <h3 className="font-semibold mb-2">Premium Features</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Unbegrenzt Agenten erstellen</li>
                    <li>• 1000 Minuten pro Monat inklusive</li>
                    <li>• Erweiterte Stimmenauswahl</li>
                    <li>• Prioritäts-Support</li>
                    <li>• Detaillierte Analytics</li>
                  </ul>
                </div>
                <Button onClick={upgradeToPremium} size="lg" className="bg-gradient-primary">
                  <Crown className="mr-2 h-4 w-4" />
                  Auf Premium upgraden - €29.99/Monat
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center p-6 bg-muted rounded-lg">
                  <Crown className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Premium Aktiv</h3>
                  <p className="text-muted-foreground">
                    Sie nutzen bereits alle Premium Features
                  </p>
                </div>
                <Button variant="outline" size="lg" className="w-full">
                  <Clock className="mr-2 h-4 w-4" />
                  Zusätzliche Minuten kaufen - €0.05/Min
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}