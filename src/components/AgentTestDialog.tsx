import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, MicOff, Phone, PhoneOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AgentTestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  agent: any;
}

class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  constructor(private onAudioData: (audioData: Float32Array) => void) {}

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.audioContext = new AudioContext({ sampleRate: 24000 });
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        this.onAudioData(new Float32Array(inputData));
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }

  stop() {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

const encodeAudioForAPI = (float32Array: Float32Array): string => {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  const uint8Array = new Uint8Array(int16Array.buffer);
  let binary = '';
  const chunkSize = 0x8000;
  
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(binary);
};

const createWavFromPCM = (pcmData: Uint8Array) => {
  const int16Data = new Int16Array(pcmData.length / 2);
  for (let i = 0; i < pcmData.length; i += 2) {
    int16Data[i / 2] = (pcmData[i + 1] << 8) | pcmData[i];
  }
  
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);
  
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + int16Data.byteLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, int16Data.byteLength, true);

  const wavArray = new Uint8Array(wavHeader.byteLength + int16Data.byteLength);
  wavArray.set(new Uint8Array(wavHeader), 0);
  wavArray.set(new Uint8Array(int16Data.buffer), wavHeader.byteLength);
  
  return wavArray;
};

class AudioQueue {
  private queue: Uint8Array[] = [];
  private isPlaying = false;
  private audioContext: AudioContext;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  async addToQueue(audioData: Uint8Array) {
    this.queue.push(audioData);
    if (!this.isPlaying) {
      await this.playNext();
    }
  }

  private async playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioData = this.queue.shift()!;

    try {
      const wavData = createWavFromPCM(audioData);
      const audioBuffer = await this.audioContext.decodeAudioData(wavData.buffer);
      
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      source.onended = () => this.playNext();
      source.start(0);
    } catch (error) {
      console.error('Error playing audio:', error);
      this.playNext();
    }
  }
}

export function AgentTestDialog({ isOpen, onClose, agent }: AgentTestDialogProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioQueue | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) {
      disconnect();
    }
    return () => disconnect();
  }, [isOpen]);

  const connect = async () => {
    if (!agent?.elevenlabs_agent_id) {
      toast({
        title: "Fehler",
        description: "Agent ID nicht gefunden",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    
    try {
      // Initialize audio context
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      audioQueueRef.current = new AudioQueue(audioContextRef.current);

      // Connect to WebSocket
      const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agent.elevenlabs_agent_id}`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setIsConnecting(false);
      };

      wsRef.current.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        console.log('Received message:', data);

        if (data.type === 'session.created') {
          // Send session update after session created
          const sessionUpdate = {
            type: 'session.update',
            session: {
              modalities: ['text', 'audio'],
              instructions: agent.prompt || 'You are a helpful assistant.',
              voice: 'alloy',
              input_audio_format: 'pcm16',
              output_audio_format: 'pcm16',
              input_audio_transcription: {
                model: 'whisper-1'
              },
              turn_detection: {
                type: 'server_vad',
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 1000
              },
              temperature: 0.8,
              max_response_output_tokens: 'inf'
            }
          };
          wsRef.current?.send(JSON.stringify(sessionUpdate));
        } else if (data.type === 'response.audio.delta') {
          // Play audio
          const binaryString = atob(data.delta);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          await audioQueueRef.current?.addToQueue(bytes);
        } else if (data.type === 'response.audio_transcript.delta') {
          // Update transcript
          setTranscript(prev => prev + data.delta);
        } else if (data.type === 'response.audio_transcript.done') {
          setTranscript(prev => prev + "\n\n");
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast({
          title: "Verbindungsfehler",
          description: "Fehler beim Verbinden mit dem Agent",
          variant: "destructive",
        });
        setIsConnecting(false);
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        setIsRecording(false);
        setIsConnecting(false);
      };

    } catch (error) {
      console.error('Connection error:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Starten der Verbindung",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    audioQueueRef.current = null;
    setIsConnected(false);
    setIsRecording(false);
    setTranscript("");
  };

  const toggleRecording = async () => {
    if (!isConnected || !wsRef.current) return;

    if (isRecording) {
      // Stop recording
      if (audioRecorderRef.current) {
        audioRecorderRef.current.stop();
        audioRecorderRef.current = null;
      }
      setIsRecording(false);
    } else {
      // Start recording
      try {
        audioRecorderRef.current = new AudioRecorder((audioData) => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            const encoded = encodeAudioForAPI(audioData);
            wsRef.current.send(JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: encoded
            }));
          }
        });
        await audioRecorderRef.current.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Microphone error:', error);
        toast({
          title: "Mikrofon-Fehler",
          description: "Mikrofon-Zugang konnte nicht gestartet werden",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Agent "{agent?.name}" testen</DialogTitle>
          <DialogDescription>
            Sprechen Sie direkt mit Ihrem Agent über WebSocket-Verbindung
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="flex justify-center gap-4">
            {!isConnected ? (
              <Button 
                onClick={connect} 
                disabled={isConnecting}
                size="lg"
                variant="default"
              >
                <Phone className="mr-2 h-5 w-5" />
                {isConnecting ? "Verbindet..." : "Verbindung starten"}
              </Button>
            ) : (
              <>
                <Button 
                  onClick={toggleRecording}
                  size="lg" 
                  variant={isRecording ? "destructive" : "default"}
                >
                  {isRecording ? (
                    <>
                      <MicOff className="mr-2 h-5 w-5" />
                      Aufnahme stoppen
                    </>
                  ) : (
                    <>
                      <Mic className="mr-2 h-5 w-5" />
                      Aufnahme starten
                    </>
                  )}
                </Button>
                <Button 
                  onClick={disconnect}
                  size="lg" 
                  variant="outline"
                >
                  <PhoneOff className="mr-2 h-5 w-5" />
                  Verbindung beenden
                </Button>
              </>
            )}
          </div>

          {isConnected && (
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-3">Unterhaltung:</h4>
                <div className="min-h-[200px] max-h-[300px] overflow-y-auto bg-muted/30 p-3 rounded text-sm">
                  {transcript || "Starten Sie die Aufnahme und sprechen Sie mit dem Agent..."}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Schließen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}