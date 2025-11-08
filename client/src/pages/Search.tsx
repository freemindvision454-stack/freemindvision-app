import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon, Play, Heart, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Video, User } from "@shared/schema";
import { Link } from "wouter";

interface VideoWithCreator extends Video {
  creator: User;
  isLiked?: boolean;
  commentCount?: number;
}

export default function Search() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  const { data: searchResults, isLoading } = useQuery<VideoWithCreator[]>({
    queryKey: ["/api/videos/search", { q: activeSearch }],
    queryFn: async () => {
      const response = await fetch(`/api/videos/search?q=${encodeURIComponent(activeSearch)}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: activeSearch.length > 0,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveSearch(searchQuery.trim());
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Search Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher des vidéos, créateurs, hashtags..."
                className="pl-10 h-12 text-base"
                data-testid="input-search"
              />
            </div>
            <Button 
              type="submit" 
              size="lg"
              className="px-6"
              data-testid="button-search"
            >
              Rechercher
            </Button>
          </form>
        </div>
      </div>

      {/* Search Results */}
      <div className="container mx-auto px-4 py-6">
        {!activeSearch && (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <SearchIcon className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-poppins font-bold mb-2">
              Recherchez des vidéos incroyables
            </h2>
            <p className="text-muted-foreground">
              Recherchez par titre, créateur, ou hashtag
            </p>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground">Recherche en cours...</p>
            </div>
          </div>
        )}

        {activeSearch && !isLoading && searchResults && searchResults.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <SearchIcon className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-poppins font-bold mb-2">
              Aucun résultat trouvé
            </h2>
            <p className="text-muted-foreground">
              Essayez une autre recherche
            </p>
          </div>
        )}

        {searchResults && searchResults.length > 0 && (
          <div>
            <h3 className="text-lg font-poppins font-semibold mb-4">
              {searchResults.length} résultat{searchResults.length > 1 ? 's' : ''} trouvé{searchResults.length > 1 ? 's' : ''}
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {searchResults.map((video) => (
                <Link key={video.id} href="/">
                  <Card 
                    className="overflow-hidden hover-elevate active-elevate-2 cursor-pointer transition-all"
                    data-testid={`video-card-${video.id}`}
                  >
                    {/* Video Thumbnail */}
                    <div className="relative aspect-[9/16] bg-muted group">
                      <video
                        src={video.videoUrl}
                        className="w-full h-full object-cover"
                        preload="metadata"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
                      
                      {/* Play Icon Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center">
                          <Play className="w-8 h-8 text-white fill-white ml-1" />
                        </div>
                      </div>

                      {/* Stats Overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Play className="w-4 h-4" />
                            <span>{video.views.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart className="w-4 h-4" />
                            <span>{video.likes.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Video Info */}
                    <div className="p-3">
                      <h4 className="font-poppins font-semibold text-sm line-clamp-2 mb-2">
                        {video.title}
                      </h4>

                      {/* Creator Info */}
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={video.creator.profileImageUrl || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            {video.creator.firstName?.[0] || video.creator.email?.[0] || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {video.creator.firstName && video.creator.lastName
                              ? `${video.creator.firstName} ${video.creator.lastName}`
                              : video.creator.email?.split("@")[0] || "Creator"}
                          </p>
                          {video.creator.isCreator && (
                            <p className="text-xs text-muted-foreground">Creator</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
