import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Upload as UploadIcon, Video, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

export default function Upload() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>("");
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await apiRequest("POST", "/api/videos", data);
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Your video has been uploaded successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) { // 100MB limit
        toast({
          title: "File Too Large",
          description: "Please select a video under 100MB",
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
        title: "Missing Information",
        description: "Please provide a video and title",
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
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-poppins font-bold mb-2">Upload Video</h1>
          <p className="text-muted-foreground">
            Share your creativity with the world
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Video Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="font-poppins">Video File</CardTitle>
            </CardHeader>
            <CardContent>
              {!videoFile ? (
                <div
                  onClick={() => videoInputRef.current?.click()}
                  className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover-elevate transition-all"
                  data-testid="dropzone-video"
                >
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <UploadIcon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-poppins font-semibold mb-2">
                    Choose a video to upload
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    MP4, WebM, or MOV (max 100MB)
                  </p>
                  <Button type="button" variant="outline">
                    Select File
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-lg overflow-hidden bg-black">
                    <video
                      src={videoPreview}
                      controls
                      className="w-full max-h-96 object-contain"
                      data-testid="video-preview"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setVideoFile(null);
                        setVideoPreview("");
                      }}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover-elevate"
                      data-testid="button-remove-video"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Video className="w-4 h-4 text-primary" />
                    <span className="font-medium">{videoFile.name}</span>
                    <span className="text-muted-foreground">
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

          {/* Video Details */}
          <Card>
            <CardHeader>
              <CardTitle className="font-poppins">Video Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give your video a catchy title..."
                  maxLength={200}
                  className="mt-1.5"
                  data-testid="input-title"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {title.length}/200 characters
                </p>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell viewers about your video..."
                  maxLength={500}
                  rows={4}
                  className="mt-1.5 resize-none"
                  data-testid="input-description"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {description.length}/500 characters
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Thumbnail */}
          <Card>
            <CardHeader>
              <CardTitle className="font-poppins">Thumbnail (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              {!thumbnailFile ? (
                <div
                  onClick={() => thumbnailInputRef.current?.click()}
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover-elevate transition-all"
                  data-testid="dropzone-thumbnail"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <ImageIcon className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Add a custom thumbnail (JPG, PNG)
                  </p>
                  <Button type="button" variant="outline" size="sm">
                    Choose Image
                  </Button>
                </div>
              ) : (
                <div className="relative inline-block">
                  <img
                    src={thumbnailPreview}
                    alt="Thumbnail preview"
                    className="max-w-sm rounded-lg"
                    data-testid="thumbnail-preview"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setThumbnailFile(null);
                      setThumbnailPreview("");
                    }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover-elevate"
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

          {/* Submit Button */}
          <div className="flex gap-4">
            <Button
              type="submit"
              size="lg"
              className="flex-1 font-poppins font-semibold"
              disabled={uploadMutation.isPending || !videoFile || !title}
              data-testid="button-upload"
            >
              {uploadMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <UploadIcon className="w-5 h-5 mr-2" />
                  Publish Video
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => setLocation("/")}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
