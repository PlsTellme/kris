import React, { useState } from 'react';
import { useConversation } from '@elevenlabs/react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, MicOff, Volume2, VolumeX, Phone, PhoneOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";

interface AgentTestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  agent: any;
}

export function AgentTestDialog({ isOpen, onClose, agent }: AgentTestDialogProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const conversation = useConversation({
    onConnect: () => {
      setIsConnected(true);
      setIsLoading(false);
      toast({
        title: "Verbunden",
        description: "Agent ist bereit",
      });
    },
    onDisconnect: () => {
      setIsConnected(false);
      setIsLoading(false);
      toast({
        title: "Getrennt",
        description: "Verbindung beendet",
      });
    },
    onError: (error) => {
      console.error('Conversation error:', error);
      setIsLoading(false);
      toast({
        title: "Fehler",
        description: "Verbindungsproblem",
        variant: "destructive",
      });
    },
  });

  const handleStartConversation = async () => {
    if (!agent?.elevenlabs_agent_id) {
      toast({
        title: "Fehler",
        description: "Agent ID nicht gefunden",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Get API key from Supabase secrets
      const { data: secretData, error: secretError } = await supabase.functions.invoke('get-secret', {
        body: { secret_name: 'ELEVENLABS_API_KEY' }
      });

      if (secretError || !secretData?.value) {
        throw new Error('ElevenLabs API Key nicht konfiguriert');
      }

      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agent.elevenlabs_agent_id}`,
        {
          method: 'GET',
          headers: {
            'xi-api-key': secretData.value,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Fehler beim Abrufen der Signed URL');
      }

      const data = await response.json();
      await conversation.startSession({ 
        signedUrl: data.signed_url 
      });
    } catch (error: any) {
      console.error('Error starting conversation:', error);
      setIsLoading(false);
      toast({
        title: "Fehler",
        description: error.message || "Mikrofon-Berechtigung erforderlich oder Konfigurationsfehler",
        variant: "destructive",
      });
    }
  };

  const handleEndConversation = async () => {
    try {
      await conversation.endSession();
    } catch (error) {
      console.error('Error ending conversation:', error);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = async (newVolume: number) => {
    setVolume(newVolume);
    try {
      await conversation.setVolume({ volume: newVolume });
    } catch (error) {
      console.error('Error setting volume:', error);
    }
  };

  const handleClose = () => {
    if (isConnected) {
      handleEndConversation();
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Agent "{agent?.name}" testen</DialogTitle>
          <DialogDescription>
            Sprechen Sie direkt mit Ihrem Agent
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Connection Status */}
          <div className="flex items-center justify-center">
            <div className={`w-3 h-3 rounded-full mr-2 transition-all duration-500 ${
              isConnected ? 'bg-green-500 shadow-lg shadow-green-500/50 animate-pulse' : 'bg-gray-400'
            }`} />
            <span className="text-sm text-muted-foreground">
              {isConnected ? 'Verbunden' : isLoading ? 'Verbindet...' : 'Bereit'}
            </span>
          </div>

          {/* Main Controls */}
          <div className="space-y-4">
            {!isConnected ? (
              <Button 
                onClick={handleStartConversation}
                disabled={isLoading}
                className="w-full h-12 bg-primary hover:bg-primary/90 rounded-full text-base font-medium"
              >
                <Phone className="w-5 h-5 mr-2" />
                {isLoading ? "Verbindet..." : "Gespräch starten"}
              </Button>
            ) : (
              <div className="space-y-4">
                <Button 
                  onClick={handleEndConversation}
                  variant="destructive"
                  className="w-full h-12 rounded-full text-base font-medium hover:shadow-lg transition-all duration-300"
                >
                  <PhoneOff className="w-5 h-5 mr-2" />
                  Gespräch beenden
                </Button>
                
                {/* Controls Row */}
                <div className="flex items-center justify-between space-x-4">
                  <Button
                    onClick={toggleMute}
                    variant={isMuted ? "destructive" : "secondary"}
                    className="w-12 h-12 rounded-full p-0 transition-all duration-300"
                  >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </Button>
                  
                  <div className="flex items-center space-x-2 flex-1">
                    <VolumeX className="w-4 h-4 text-muted-foreground" />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="flex-1 accent-primary rounded-full"
                    />
                    <Volume2 className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Speaking Animation */}
          {isConnected && conversation.isSpeaking && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center space-x-1">
                  <div className="w-2 h-8 bg-primary rounded-full animate-pulse"></div>
                  <div className="w-2 h-6 bg-primary/80 rounded-full animate-pulse" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-10 bg-primary rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-2 h-4 bg-primary/80 rounded-full animate-pulse" style={{animationDelay: '0.3s'}}></div>
                </div>
                <p className="text-sm text-primary/80 mt-2">Agent spricht...</p>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              Schließen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}