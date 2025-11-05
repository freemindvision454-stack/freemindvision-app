import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Send, Bell, Shield } from "lucide-react";

export default function Messages() {
  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <MessageCircle className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Coming Soon</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-poppins font-bold mb-4 bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
            Direct Messages
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Connect with your fans and fellow creators through private messaging. Build relationships and collaborate.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Card className="hover-elevate transition-all">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <MessageCircle className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Private Chats</CardTitle>
              <CardDescription>
                Send direct messages to other users with full privacy and encryption
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover-elevate transition-all">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Bell className="w-4 h-4 text-primary" />
              </div>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Get instant notifications when you receive new messages or replies
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover-elevate transition-all">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Spam Protection</CardTitle>
              <CardDescription>
                Advanced filters to protect you from spam and unwanted messages
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-poppins font-bold mb-4">Phase 2 Feature</h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Direct messaging is currently in development and will be available in the next major update. 
              You'll be able to chat with creators and fans securely.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" disabled>
                <Send className="w-4 h-4 mr-2" />
                Send Message
              </Button>
              <Button size="lg" variant="outline" disabled>
                View Inbox
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
