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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function SignupPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [birthDay, setBirthDay] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthYear, setBirthYear] = useState("");

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      phoneNumber: "",
      dateOfBirth: "",
      country: "",
      city: "",
      gender: undefined,
    },
  });

  const updateDateOfBirth = (day: string, month: string, year: string) => {
    setBirthDay(day);
    setBirthMonth(month);
    setBirthYear(year);
    
    if (day && month && year) {
      const formattedMonth = month.padStart(2, '0');
      const formattedDay = day.padStart(2, '0');
      const dateString = `${year}-${formattedMonth}-${formattedDay}`;
      
      const date = new Date(dateString);
      const isValidDate = date.getFullYear() === parseInt(year) && 
                         date.getMonth() === parseInt(month) - 1 && 
                         date.getDate() === parseInt(day);
      
      if (isValidDate) {
        form.setValue("dateOfBirth", dateString, { shouldValidate: true });
        form.clearErrors("dateOfBirth");
      } else {
        form.setValue("dateOfBirth", "", { shouldValidate: true });
        form.setError("dateOfBirth", { 
          type: "manual", 
          message: "Date invalide. Vérifiez le jour et le mois sélectionnés." 
        });
      }
    } else {
      form.setValue("dateOfBirth", "", { shouldValidate: true });
    }
  };

  const onSubmit = async (data: RegisterInput) => {
    try {
      setIsLoading(true);
      await apiRequest("POST", "/api/auth/register", data);
      
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
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numéro de téléphone</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="tel"
                        placeholder="+221 77 123 45 67"
                        disabled={isLoading}
                        data-testid="input-phone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pays</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Sénégal"
                          disabled={isLoading}
                          data-testid="input-country"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ville</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Dakar"
                          disabled={isLoading}
                          data-testid="input-city"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={() => (
                    <FormItem>
                      <FormLabel>Date de naissance</FormLabel>
                      <div className="grid grid-cols-3 gap-2">
                        <Select 
                          value={birthDay} 
                          onValueChange={(day) => updateDateOfBirth(day, birthMonth, birthYear)} 
                          disabled={isLoading}
                        >
                          <SelectTrigger data-testid="select-birth-day">
                            <SelectValue placeholder="Jour" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                              <SelectItem key={day} value={day.toString()} data-testid={`option-day-${day}`}>
                                {day}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <Select 
                          value={birthMonth} 
                          onValueChange={(month) => updateDateOfBirth(birthDay, month, birthYear)} 
                          disabled={isLoading}
                        >
                          <SelectTrigger data-testid="select-birth-month">
                            <SelectValue placeholder="Mois" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1" data-testid="option-month-1">Janvier</SelectItem>
                            <SelectItem value="2" data-testid="option-month-2">Février</SelectItem>
                            <SelectItem value="3" data-testid="option-month-3">Mars</SelectItem>
                            <SelectItem value="4" data-testid="option-month-4">Avril</SelectItem>
                            <SelectItem value="5" data-testid="option-month-5">Mai</SelectItem>
                            <SelectItem value="6" data-testid="option-month-6">Juin</SelectItem>
                            <SelectItem value="7" data-testid="option-month-7">Juillet</SelectItem>
                            <SelectItem value="8" data-testid="option-month-8">Août</SelectItem>
                            <SelectItem value="9" data-testid="option-month-9">Septembre</SelectItem>
                            <SelectItem value="10" data-testid="option-month-10">Octobre</SelectItem>
                            <SelectItem value="11" data-testid="option-month-11">Novembre</SelectItem>
                            <SelectItem value="12" data-testid="option-month-12">Décembre</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Select 
                          value={birthYear} 
                          onValueChange={(year) => updateDateOfBirth(birthDay, birthMonth, year)} 
                          disabled={isLoading}
                        >
                          <SelectTrigger data-testid="select-birth-year">
                            <SelectValue placeholder="Année" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - 13 - i).map((year) => (
                              <SelectItem key={year} value={year.toString()} data-testid={`option-year-${year}`}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Genre</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                        <FormControl>
                          <SelectTrigger data-testid="select-gender">
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male" data-testid="option-male">Homme</SelectItem>
                          <SelectItem value="female" data-testid="option-female">Femme</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••••••"
                          disabled={isLoading}
                          data-testid="input-password"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={isLoading}
                          data-testid="button-toggle-password"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
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
                      <div className="relative">
                        <Input
                          {...field}
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••••••"
                          disabled={isLoading}
                          data-testid="input-confirm-password"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          disabled={isLoading}
                          data-testid="button-toggle-confirm-password"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
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
                <button
                  type="button"
                  className="text-primary hover:underline font-normal"
                  onClick={() => setLocation("/login")}
                  data-testid="link-login"
                >
                  Se connecter
                </button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
