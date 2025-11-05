import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Video, DollarSign, Globe, Users, Sparkles, TrendingUp } from "lucide-react";
import logoUrl from "@assets/1762348677561_1762361963790.jpg";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-primary/10" />
        
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/15 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="relative z-10 container mx-auto px-4 py-20 text-center">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <img 
              src={logoUrl} 
              alt="FreeMind Vision Logo" 
              className="h-32 md:h-40 w-auto object-contain animate-in fade-in zoom-in duration-700"
            />
          </div>

          <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Global Creator Platform</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-poppins font-bold mb-6 bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
            FreeMind Vision
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-4 max-w-2xl mx-auto">
            Create. Share. Earn.
          </p>
          
          <p className="text-base md:text-lg text-muted-foreground mb-12 max-w-3xl mx-auto">
            Join the global community where creativity meets opportunity. Share your videos, connect with millions, and monetize your passion with YimiCoins.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              className="text-lg h-14 px-8 rounded-full font-poppins font-semibold"
              onClick={() => window.location.href = "/api/login"}
              data-testid="button-get-started"
            >
              Get Started Free
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg h-14 px-8 rounded-full font-poppins font-semibold"
              onClick={() => window.location.href = "/api/login"}
              data-testid="button-login"
            >
              Log In
            </Button>
          </div>

          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-poppins font-bold text-primary mb-1">60%</div>
              <div className="text-sm text-muted-foreground">Creator Earnings</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-poppins font-bold text-primary mb-1">100+</div>
              <div className="text-sm text-muted-foreground">Countries</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-poppins font-bold text-primary mb-1">24/7</div>
              <div className="text-sm text-muted-foreground">Live Support</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-poppins font-bold text-primary mb-1">0$</div>
              <div className="text-sm text-muted-foreground">Setup Fee</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-card/50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-poppins font-bold mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built for creators, designed for success. All the tools you need to grow your audience and monetize your content.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <Card className="hover-elevate transition-all">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Video className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-poppins font-semibold mb-2">Upload & Share</h3>
                <p className="text-muted-foreground">
                  Upload short videos in seconds. Share your creativity with a global audience instantly.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-poppins font-semibold mb-2">Earn Real Money</h3>
                <p className="text-muted-foreground">
                  Keep 60% of all earnings. Get paid in FCFA, USD, or your preferred currency through Mobile Money, PayPal, or bank transfer.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Globe className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-poppins font-semibold mb-2">Global Reach</h3>
                <p className="text-muted-foreground">
                  Connect with audiences worldwide. Automatic translation helps you reach every corner of the globe.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-poppins font-semibold mb-2">Virtual Gifts</h3>
                <p className="text-muted-foreground">
                  Fans can support you with YimiCoins virtual gifts. Every gift converts to real earnings in your dashboard.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-poppins font-semibold mb-2">Analytics Dashboard</h3>
                <p className="text-muted-foreground">
                  Track views, engagement, and earnings in real-time. Make data-driven decisions to grow your channel.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-poppins font-semibold mb-2">Build Community</h3>
                <p className="text-muted-foreground">
                  Engage with comments, likes, and shares. Build a loyal fanbase that supports your creative journey.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-poppins font-bold mb-4">
              Start Earning in 3 Simple Steps
            </h2>
          </div>

          <div className="space-y-12">
            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="flex-shrink-0 w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-poppins font-bold">
                1
              </div>
              <div>
                <h3 className="text-2xl font-poppins font-semibold mb-2">Create Your Account</h3>
                <p className="text-muted-foreground text-lg">
                  Sign up with email, Google, or GitHub. Setup takes less than 60 seconds. No credit card required.
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="flex-shrink-0 w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-poppins font-bold">
                2
              </div>
              <div>
                <h3 className="text-2xl font-poppins font-semibold mb-2">Upload Your Videos</h3>
                <p className="text-muted-foreground text-lg">
                  Share your creativity. Upload videos, add descriptions, and let the world discover your talent.
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="flex-shrink-0 w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-poppins font-bold">
                3
              </div>
              <div>
                <h3 className="text-2xl font-poppins font-semibold mb-2">Get Paid</h3>
                <p className="text-muted-foreground text-lg">
                  Receive gifts from fans, track earnings in real-time, withdraw anytime via Mobile Money, PayPal, or bank transfer.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center mt-16">
            <Button 
              size="lg" 
              className="text-lg h-14 px-10 rounded-full font-poppins font-semibold"
              onClick={() => window.location.href = "/api/login"}
              data-testid="button-join-now"
            >
              Join FreeMind Vision Now
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-card border-t">
        <div className="container mx-auto text-center">
          <div className="mb-4">
            <h3 className="text-2xl font-poppins font-bold text-primary mb-2">FreeMind Vision</h3>
            <p className="text-muted-foreground">Empowering creators worldwide</p>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2025 FreeMind Vision. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
