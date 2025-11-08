import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Send, MessageCircle, Image as ImageIcon, Video, Mic, Paperclip, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  content: string | null;
  messageType: string;
  mediaUrl: string | null;
  mediaThumbnail: string | null;
  mediaDuration: number | null;
  isRead: boolean;
  createdAt: string;
}

interface Conversation {
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    profileImageUrl: string | null;
  };
  lastMessage: Message | null;
  unreadCount: number;
}

export default function Messages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<Conversation["user"] | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<number | null>(null);
  const recordingRecipientRef = useRef<string | null>(null);

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/messages/conversations"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages", selectedUser?.id],
    enabled: !!selectedUser,
    refetchInterval: 3000, // Refresh every 3 seconds
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { recipientId: string; content: string }) => {
      return await apiRequest("POST", "/api/messages", data);
    },
    onSuccess: () => {
      setMessageContent("");
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedUser?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
    },
  });

  const sendMediaMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/messages/media", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to send media");
      return response.json();
    },
    onSuccess: () => {
      setMessageContent("");
      setSelectedFile(null);
      setFilePreview(null);
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedUser?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le média",
        variant: "destructive",
      });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (senderId: string) => {
      return await apiRequest("PATCH", `/api/messages/${senderId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
    },
  });

  useEffect(() => {
    if (selectedUser && messages.some(m => !m.isRead && m.recipientId === user?.id)) {
      markAsReadMutation.mutate(selectedUser.id);
    }
  }, [messages, selectedUser, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cleanup recording resources on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximale est de 50MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    
    // Create preview for images/videos
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (selectedFile) {
      const formData = new FormData();
      formData.append("media", selectedFile);
      formData.append("recipientId", selectedUser.id);
      if (messageContent.trim()) {
        formData.append("content", messageContent.trim());
      }
      sendMediaMutation.mutate(formData);
    } else if (messageContent.trim()) {
      sendMessageMutation.mutate({
        recipientId: selectedUser.id,
        content: messageContent.trim(),
      });
    }
  };

  const startRecording = async () => {
    if (!selectedUser) return;
    
    try {
      // Store current recipient to prevent misrouting if user switches conversations
      recordingRecipientRef.current = selectedUser.id;
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });
        
        // Send the audio to the originally selected recipient
        if (recordingRecipientRef.current) {
          const formData = new FormData();
          formData.append("media", audioFile);
          formData.append("recipientId", recordingRecipientRef.current);
          sendMediaMutation.mutate(formData);
        }

        // Clean up
        stream.getTracks().forEach(track => track.stop());
        setRecordingTime(0);
        recordingRecipientRef.current = null;
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start timer
      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'accéder au microphone",
        variant: "destructive",
      });
      recordingRecipientRef.current = null;
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const getUserDisplayName = (user: Conversation["user"]) => {
    return user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.email.split("@")[0];
  };

  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return (
    <div className="container mx-auto p-4 h-[calc(100vh-80px)]">
      <div className="flex items-center gap-3 mb-6">
        <MessageCircle className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-poppins font-bold" data-testid="heading-messages">
          Messagerie
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100%-80px)]">
        {/* Conversations List */}
        <Card className="md:col-span-1" data-testid="card-conversations">
          <CardHeader>
            <CardTitle>Conversations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-280px)]">
              {conversations.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground" data-testid="text-no-conversations">
                  Aucune conversation
                </div>
              ) : (
                conversations.map((conversation, index) => (
                  <div
                    key={conversation.user.id}
                    className={`p-4 cursor-pointer hover-elevate border-b ${
                      selectedUser?.id === conversation.user.id ? "bg-primary/5" : ""
                    }`}
                    onClick={() => setSelectedUser(conversation.user)}
                    data-testid={`item-conversation-${index}`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={conversation.user.profileImageUrl || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getUserDisplayName(conversation.user)[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium truncate" data-testid={`text-conversation-name-${index}`}>
                            {getUserDisplayName(conversation.user)}
                          </p>
                          {conversation.unreadCount > 0 && (
                            <Badge variant="destructive" className="ml-2">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                        {conversation.lastMessage && (
                          <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                            {conversation.lastMessage.messageType === 'image' && (
                              <><ImageIcon className="w-3 h-3 inline" /> Image</>
                            )}
                            {conversation.lastMessage.messageType === 'video' && (
                              <><Video className="w-3 h-3 inline" /> Vidéo</>
                            )}
                            {conversation.lastMessage.messageType === 'audio' && (
                              <><Mic className="w-3 h-3 inline" /> Audio</>
                            )}
                            {conversation.lastMessage.messageType === 'text' && conversation.lastMessage.content && (
                              <>
                                {conversation.lastMessage.content.substring(0, 30)}
                                {conversation.lastMessage.content.length > 30 ? "..." : ""}
                              </>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="md:col-span-2" data-testid="card-chat">
          {!selectedUser ? (
            <CardContent className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground" data-testid="text-select-conversation">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Sélectionnez une conversation pour commencer</p>
              </div>
            </CardContent>
          ) : (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={selectedUser.profileImageUrl || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getUserDisplayName(selectedUser)[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <CardTitle data-testid="text-chat-with">
                    {getUserDisplayName(selectedUser)}
                  </CardTitle>
                </div>
              </CardHeader>
              <ScrollArea className="h-[calc(100vh-420px)] p-4">
                <div className="space-y-4">
                  {sortedMessages.map((message, index) => {
                    const isOwn = message.senderId === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                        data-testid={`item-message-${index}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg overflow-hidden ${
                            message.messageType !== 'text' ? 'p-0' : 'p-3'
                          } ${
                            isOwn
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          {message.messageType === 'image' && message.mediaUrl && (
                            <img 
                              src={message.mediaUrl} 
                              alt="Image" 
                              className="w-full h-auto max-h-96 object-cover"
                              data-testid={`img-message-${index}`}
                            />
                          )}
                          {message.messageType === 'video' && message.mediaUrl && (
                            <video 
                              src={message.mediaUrl} 
                              controls 
                              className="w-full h-auto max-h-96"
                              data-testid={`video-message-${index}`}
                            />
                          )}
                          {message.messageType === 'audio' && message.mediaUrl && (
                            <audio 
                              src={message.mediaUrl} 
                              controls 
                              className="w-full"
                              data-testid={`audio-message-${index}`}
                            />
                          )}
                          {message.content && (
                            <p className={`text-sm ${message.messageType !== 'text' ? 'p-3' : ''}`} data-testid={`text-message-content-${index}`}>
                              {message.content}
                            </p>
                          )}
                          <p className={`text-xs opacity-70 ${message.messageType !== 'text' ? 'px-3 pb-2' : 'mt-1'}`}>
                            {formatDistanceToNow(new Date(message.createdAt), {
                              addSuffix: true,
                              locale: fr,
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              <form onSubmit={handleSendMessage} className="border-t p-4">
                {/* File Preview */}
                {selectedFile && (
                  <div className="mb-3 p-3 bg-muted rounded-lg flex items-center gap-3">
                    {filePreview && selectedFile.type.startsWith('image/') && (
                      <img src={filePreview} alt="Preview" className="w-16 h-16 object-cover rounded" />
                    )}
                    {filePreview && selectedFile.type.startsWith('video/') && (
                      <video src={filePreview} className="w-16 h-16 object-cover rounded" />
                    )}
                    {selectedFile.type.startsWith('audio/') && (
                      <Mic className="w-8 h-8 text-primary" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon"
                      onClick={handleRemoveFile}
                      data-testid="button-remove-file"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {/* Recording Indicator */}
                {isRecording && (
                  <div className="mb-3 p-3 bg-destructive/10 border border-destructive rounded-lg flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
                      <span className="text-sm font-medium text-destructive">
                        Enregistrement... {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,audio/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    data-testid="input-file"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sendMediaMutation.isPending || isRecording}
                    data-testid="button-attach-media"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant={isRecording ? "destructive" : "outline"}
                    size="icon"
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={sendMediaMutation.isPending || !!selectedFile}
                    data-testid="button-record-audio"
                  >
                    <Mic className="w-4 h-4" />
                  </Button>
                  <Input
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="Tapez votre message..."
                    className="flex-1"
                    disabled={isRecording}
                    data-testid="input-message"
                  />
                  <Button
                    type="submit"
                    disabled={(!messageContent.trim() && !selectedFile) || sendMessageMutation.isPending || sendMediaMutation.isPending || isRecording}
                    data-testid="button-send-message"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
