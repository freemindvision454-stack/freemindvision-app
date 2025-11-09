import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { registerSchema, type RegisterInput } from "@shared/authSchemas";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function SignupPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
    },
  });

  const onSubmit = async (data: RegisterInput) => {
    try {
      setIsLoading(true);
      await apiRequest("/api/auth/register", "POST", data);
      
      toast({
        title: "Inscription réussie !",
        description: "Bienvenue sur FreeMind Vision",
      });
      
      setTimeout(() => setLocation("/"), 500);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de l'inscription",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4">
            <h1 className="text-4xl font-black bg-gradient-to-r from-pink-600 to-violet-600 bg-clip-text text-transparent">
              FreeMind Vision
            </h1>
          </div>
          <CardTitle className="text-2xl">Créer un compte</CardTitle>
          <CardDescription>
            Rejoignez la communauté mondiale des créateurs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prénom</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="John"
                          disabled={isLoading}
                          data-testid="input-firstname"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Doe"
                          disabled={isLoading}
                          data-testid="input-lastname"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="john@example.com"
                        disabled={isLoading}
                        data-testid="input-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="••••••••••••"
                        disabled={isLoading}
                        data-testid="input-password"
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Min 12 caractères, majuscules, minuscules, chiffres et caractères spéciaux
                    </p>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmer le mot de passe</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="••••••••••••"
                        disabled={isLoading}
                        data-testid="input-confirm-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-signup"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                S'inscrire
              </Button>

              <div className="text-center text-sm">
                Déjà un compte ?{" "}
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto font-normal"
                  onClick={() => setLocation("/login")}
                  data-testid="link-login"
                >
                  Se connecter
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
