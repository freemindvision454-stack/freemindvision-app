import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, Radio, Users, Sparkles } from "lucide-react";

export default function Live() {
  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Radio className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-sm font-medium text-primary">Coming Soon</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-poppins font-bold mb-4 bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
            Live Streaming
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Go live with your audience in real-time. Share moments, connect with fans, and earn gifts during your streams.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Card className="hover-elevate transition-all">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Video className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>HD Streaming</CardTitle>
              <CardDescription>
                Stream in high quality with adaptive bitrate for the best viewer experience
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover-elevate transition-all">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Real-time Chat</CardTitle>
              <CardDescription>
                Interact with your viewers through live chat and respond to comments instantly
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover-elevate transition-all">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Live Gifts</CardTitle>
              <CardDescription>
                Receive gifts from viewers during your stream and earn money in real-time
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-poppins font-bold mb-4">Phase 2 Feature</h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Live streaming is currently in development and will be available in the next major update. 
              Stay tuned for announcements!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" disabled>
                <Radio className="w-4 h-4 mr-2" />
                Start Live Stream
              </Button>
              <Button size="lg" variant="outline" disabled>
                View Live Streams
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
