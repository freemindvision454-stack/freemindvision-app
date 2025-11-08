import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Upload as UploadIcon, Video, X, Image as ImageIcon, Sparkles, Zap, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useTranslations } from "@/lib/i18n/useTranslations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function Upload() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const t = useTranslations();
  
  // Effets vidéo style TikTok - avec traductions
  const videoFilters = [
    { id: "none", name: t.upload.noEffect, filter: "" },
    { id: "grayscale", name: t.upload.blackWhite, filter: "grayscale(100%)" },
    { id: "sepia", name: t.upload.sepia, filter: "sepia(100%)" },
    { id: "vintage", name: t.upload.vintage, filter: "sepia(50%) contrast(110%)" },
    { id: "bright", name: t.upload.bright, filter: "brightness(120%) saturate(120%)" },
    { id: "contrast", name: t.upload.contrast, filter: "contrast(130%)" },
    { id: "saturate", name: t.upload.saturate, filter: "saturate(150%)" },
    { id: "neon", name: t.upload.neon, filter: "brightness(110%) saturate(200%) contrast(120%) hue-rotate(15deg)" },
    { id: "cool", name: t.upload.cool, filter: "brightness(105%) saturate(90%) hue-rotate(200deg)" },
    { id: "warm", name: t.upload.warm, filter: "brightness(105%) saturate(120%) hue-rotate(-10deg)" },
    { id: "blur", name: t.upload.blur, filter: "blur(2px) brightness(105%)" },
    { id: "sharpen", name: t.upload.sharpen, filter: "contrast(150%) brightness(105%)" },
    { id: "huerotate", name: t.upload.huerotate, filter: "hue-rotate(90deg) saturate(130%)" },
    { id: "invert", name: t.upload.invert, filter: "invert(100%) hue-rotate(180deg)" },
    { id: "dramatic", name: t.upload.dramatic, filter: "contrast(140%) saturate(140%) brightness(90%)" },
    { id: "pastel", name: t.upload.pastel, filter: "brightness(115%) saturate(70%) contrast(85%)" },
    { id: "cinematic", name: t.upload.cinematic, filter: "sepia(25%) contrast(115%) saturate(120%) brightness(95%)" },
    { id: "faded", name: t.upload.faded, filter: "brightness(110%) saturate(50%) contrast(80%)" },
    { id: "vibrant", name: t.upload.vibrant, filter: "saturate(200%) brightness(110%) contrast(120%)" },
    { id: "monochrome", name: t.upload.monochrome, filter: "grayscale(100%) contrast(120%)" },
  ];

  const speedOptions = [
    { id: "normal", name: t.upload.speed_normal, rate: 1.0 },
    { id: "slow", name: t.upload.speed_slow, rate: 0.5 },
    { id: "fast", name: t.upload.speed_fast, rate: 2.0 },
  ];
  
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>("");
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  
  // Effets vidéo
  const [selectedFilter, setSelectedFilter] = useState("none");
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  // Appliquer le filtre et la vitesse à la vidéo
  useEffect(() => {
    if (videoPreviewRef.current) {
      const filter = videoFilters.find(f => f.id === selectedFilter);
      if (filter) {
        videoPreviewRef.current.style.filter = filter.filter;
      }
      videoPreviewRef.current.playbackRate = playbackSpeed;
    }
  }, [selectedFilter, playbackSpeed]);

  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await apiRequest("POST", "/api/videos", data);
    },
    onSuccess: () => {
      toast({
        title: t.upload.success,
        description: t.upload.successMessage,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: t.upload.error,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        toast({
          title: t.upload.fileTooLarge,
          description: t.upload.fileTooLargeMessage,
          variant: "destructive",
        });
        return;
      }
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!videoFile || !title) {
      toast({
        title: t.upload.missingInfo,
        description: t.upload.missingInfoMessage,
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("video", videoFile);
    if (thumbnailFile) {
      formData.append("thumbnail", thumbnailFile);
    }
    formData.append("title", title);
    formData.append("description", description);

    uploadMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 dark:from-gray-900 dark:via-background dark:to-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* En-tête avec logo */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-poppins font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              FreeMind Vision
            </h1>
          </div>
          <h2 className="text-2xl md:text-3xl font-poppins font-bold mb-2">
            {t.upload.title}
          </h2>
          <p className="text-muted-foreground text-lg">
            {t.upload.subtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Aperçu vidéo et sélection */}
            <div className="space-y-6">
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="font-poppins flex items-center gap-2">
                    <Video className="w-5 h-5 text-primary" />
                    {t.upload.selectVideo}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!videoFile ? (
                    <div
                      onClick={() => videoInputRef.current?.click()}
                      className="border-2 border-dashed border-primary/30 rounded-xl p-12 text-center cursor-pointer hover-elevate active-elevate-2 transition-all bg-gradient-to-br from-pink-50/50 to-purple-50/50 dark:from-pink-950/20 dark:to-purple-950/20"
                      data-testid="dropzone-video"
                    >
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <UploadIcon className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-xl font-poppins font-semibold mb-2">
                        {t.upload.chooseVideo}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {t.upload.videoFormats}
                      </p>
                      <Button type="button" variant="default" size="lg" className="font-poppins font-semibold">
                        <UploadIcon className="w-5 h-5 mr-2" />
                        {t.upload.selectVideo}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative rounded-xl overflow-hidden bg-black shadow-2xl">
                        <video
                          ref={videoPreviewRef}
                          src={videoPreview}
                          controls
                          className="w-full aspect-[9/16] object-contain"
                          data-testid="video-preview"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setVideoFile(null);
                            setVideoPreview("");
                            setSelectedFilter("none");
                            setPlaybackSpeed(1.0);
                          }}
                          className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center text-white hover-elevate active-elevate-2 shadow-lg"
                          data-testid="button-remove-video"
                        >
                          <X className="w-6 h-6" />
                        </button>
                        {selectedFilter !== "none" && (
                          <Badge className="absolute top-3 left-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white border-0 shadow-lg">
                            <Sparkles className="w-3 h-3 mr-1" />
                            {videoFilters.find(f => f.id === selectedFilter)?.name}
                          </Badge>
                        )}
                        {playbackSpeed !== 1.0 && (
                          <Badge className="absolute bottom-3 left-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white border-0 shadow-lg">
                            <Zap className="w-3 h-3 mr-1" />
                            {playbackSpeed}x
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm bg-primary/5 p-3 rounded-lg">
                        <Video className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="font-medium truncate">{videoFile.name}</span>
                        <span className="text-muted-foreground flex-shrink-0">
                          ({(videoFile.size / (1024 * 1024)).toFixed(2)} MB)
                        </span>
                      </div>
                    </div>
                  )}
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleVideoSelect}
                    className="hidden"
                    data-testid="input-video"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Effets et détails */}
            <div className="space-y-6">
              {/* Effets vidéo - Uniquement si vidéo sélectionnée */}
              {videoFile && (
                <Card className="border-2 border-primary/20">
                  <CardHeader>
                    <CardTitle className="font-poppins flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" />
                      {t.upload.effectsTitle}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="filters" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="filters" className="font-poppins">
                          <Sparkles className="w-4 h-4 mr-2" />
                          {t.upload.filters}
                        </TabsTrigger>
                        <TabsTrigger value="speed" className="font-poppins">
                          <Zap className="w-4 h-4 mr-2" />
                          {t.upload.speed}
                        </TabsTrigger>
                      </TabsList>

                      {/* Filtres */}
                      <TabsContent value="filters" className="space-y-3 mt-4">
                        <div className="grid grid-cols-2 gap-2">
                          {videoFilters.map((filter) => (
                            <button
                              key={filter.id}
                              type="button"
                              onClick={() => setSelectedFilter(filter.id)}
                              className={`p-3 rounded-lg border-2 transition-all font-poppins font-medium text-sm hover-elevate active-elevate-2 ${
                                selectedFilter === filter.id
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border hover:border-primary/50"
                              }`}
                              data-testid={`button-filter-${filter.id}`}
                            >
                              {filter.name}
                            </button>
                          ))}
                        </div>
                      </TabsContent>

                      {/* Vitesse */}
                      <TabsContent value="speed" className="space-y-3 mt-4">
                        <div className="grid grid-cols-3 gap-2">
                          {speedOptions.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => setPlaybackSpeed(option.rate)}
                              className={`p-3 rounded-lg border-2 transition-all font-poppins font-medium text-sm hover-elevate active-elevate-2 ${
                                playbackSpeed === option.rate
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border hover:border-primary/50"
                              }`}
                              data-testid={`button-speed-${option.id}`}
                            >
                              {option.name}
                            </button>
                          ))}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              )}

              {/* Détails vidéo */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="font-poppins">Détails de la vidéo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title" className="text-base font-poppins">
                      {t.upload.title_label} *
                    </Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={t.upload.titlePlaceholder}
                      maxLength={200}
                      className="mt-2 text-base"
                      data-testid="input-title"
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {title.length}/200 caractères
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-base font-poppins">
                      {t.upload.description_label}
                    </Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={t.upload.descriptionPlaceholder}
                      maxLength={500}
                      rows={4}
                      className="mt-2 resize-none text-base"
                      data-testid="input-description"
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {description.length}/500 caractères
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Miniature */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-poppins flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-primary" />
                    {t.upload.thumbnailOptional}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!thumbnailFile ? (
                    <div
                      onClick={() => thumbnailInputRef.current?.click()}
                      className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover-elevate active-elevate-2 transition-all"
                      data-testid="dropzone-thumbnail"
                    >
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                        <ImageIcon className="w-6 h-6 text-primary" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {t.upload.chooseThumbnail} (JPG, PNG)
                      </p>
                      <Button type="button" variant="outline" size="sm" className="font-poppins">
                        {t.upload.chooseThumbnail}
                      </Button>
                    </div>
                  ) : (
                    <div className="relative inline-block w-full">
                      <img
                        src={thumbnailPreview}
                        alt="Aperçu miniature"
                        className="w-full rounded-lg shadow-lg"
                        data-testid="thumbnail-preview"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setThumbnailFile(null);
                          setThumbnailPreview("");
                        }}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover-elevate active-elevate-2"
                        data-testid="button-remove-thumbnail"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                  <input
                    ref={thumbnailInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailSelect}
                    className="hidden"
                    data-testid="input-thumbnail"
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              size="lg"
              className="flex-1 font-poppins font-semibold text-lg h-14 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 shadow-lg"
              disabled={uploadMutation.isPending || !videoFile || !title}
              data-testid="button-upload"
            >
              {uploadMutation.isPending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {t.upload.uploading}
                </>
              ) : (
                <>
                  <UploadIcon className="w-5 h-5 mr-2" />
                  {t.upload.publishVideo}
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => setLocation("/")}
              className="font-poppins font-semibold text-lg h-14"
              data-testid="button-cancel"
            >
              {t.upload.cancel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
