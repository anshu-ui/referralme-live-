import { useState, useEffect } from "react";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { ScrollArea } from "../components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { 
  Plus, Heart, MessageCircle, Share2, MoreHorizontal, 
  TrendingUp, Briefcase, HelpCircle, Lightbulb,
  Clock, Eye, ThumbsUp, Filter, Search
} from "lucide-react";

interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: "seeker" | "referrer";
  authorAvatar?: string;
  title: string;
  content: string;
  type: "experience" | "job_posting" | "tip" | "question";
  tags: string[];
  likes: number;
  commentsCount: number;
  views: number;
  isLiked: boolean;
  createdAt: Date;
}

interface CommunityPostsProps {
  userRole?: "seeker" | "referrer";
}

export default function CommunityPosts({ userRole }: CommunityPostsProps) {
  const { user } = useFirebaseAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [newPost, setNewPost] = useState({
    title: "",
    content: "",
    type: "experience" as const,
    tags: ""
  });

  // Generate sample community posts
  useEffect(() => {
    const samplePosts: CommunityPost[] = [
      {
        id: "1",
        authorId: "user1",
        authorName: "Sarah Chen",
        authorRole: "referrer",
        authorAvatar: "",
        title: "5 Common Mistakes in Technical Interviews",
        content: "After conducting 50+ technical interviews this year, I've noticed these recurring patterns that candidates should avoid...",
        type: "tip",
        tags: ["interview", "technical", "tips"],
        likes: 24,
        commentsCount: 8,
        views: 156,
        isLiked: false,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        id: "2",
        authorId: "user2",
        authorName: "Mike Rodriguez",
        authorRole: "seeker",
        authorAvatar: "",
        title: "Just got my dream job at Google! Here's how I prepared",
        content: "After 8 months of preparation and 15 applications, I finally landed a role at Google. Here's my complete journey...",
        type: "experience",
        tags: ["success", "google", "preparation"],
        likes: 87,
        commentsCount: 23,
        views: 342,
        isLiked: true,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        id: "3",
        authorId: "user3",
        authorName: "Alex Thompson",
        authorRole: "referrer",
        authorAvatar: "",
        title: "Frontend Developer Opening at TechCorp",
        content: "We're looking for a passionate React developer to join our team. 3+ years experience required...",
        type: "job_posting",
        tags: ["react", "frontend", "remote"],
        likes: 12,
        commentsCount: 5,
        views: 89,
        isLiked: false,
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000)
      },
      {
        id: "4",
        authorId: "user4",
        authorName: "Emma Wilson",
        authorRole: "seeker",
        authorAvatar: "",
        title: "How to negotiate salary as a new graduate?",
        content: "I'm a recent CS graduate with an offer. The salary seems low compared to market rates. Any advice on negotiation?",
        type: "question",
        tags: ["salary", "negotiation", "newgrad"],
        likes: 15,
        commentsCount: 12,
        views: 78,
        isLiked: false,
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000)
      }
    ];
    setPosts(samplePosts);
  }, []);

  const filteredPosts = posts.filter(post => {
    const matchesFilter = filter === "all" || post.type === filter;
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const handleCreatePost = () => {
    if (!newPost.title.trim() || !newPost.content.trim()) {
      return;
    }

    const post: CommunityPost = {
      id: Date.now().toString(),
      authorId: user?.uid || "",
      authorName: user?.displayName || user?.email || "Anonymous",
      authorRole: userRole || "seeker",
      authorAvatar: user?.photoURL || "",
      title: newPost.title,
      content: newPost.content,
      type: newPost.type,
      tags: newPost.tags.split(",").map(tag => tag.trim()).filter(Boolean),
      likes: 0,
      commentsCount: 0,
      views: 1,
      isLiked: false,
      createdAt: new Date()
    };

    setPosts(prev => [post, ...prev]);
    setNewPost({ title: "", content: "", type: "experience", tags: "" });
    setIsCreatePostOpen(false);

  };

  const handleLike = (postId: string) => {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { 
            ...post, 
            likes: post.isLiked ? post.likes - 1 : post.likes + 1,
            isLiked: !post.isLiked 
          }
        : post
    ));
  };

  const getPostTypeIcon = (type: string) => {
    switch (type) {
      case "experience": return <TrendingUp className="h-4 w-4" />;
      case "job_posting": return <Briefcase className="h-4 w-4" />;
      case "tip": return <Lightbulb className="h-4 w-4" />;
      case "question": return <HelpCircle className="h-4 w-4" />;
      default: return <MessageCircle className="h-4 w-4" />;
    }
  };

  const getPostTypeColor = (type: string) => {
    switch (type) {
      case "experience": return "bg-green-100 text-green-800";
      case "job_posting": return "bg-blue-100 text-blue-800";
      case "tip": return "bg-yellow-100 text-yellow-800";
      case "question": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header with Create Post */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Community</h2>
          <p className="text-gray-600">Connect, share experiences, and learn from the community</p>
        </div>
        <Dialog open={isCreatePostOpen} onOpenChange={setIsCreatePostOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Post
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Post</DialogTitle>
              <DialogDescription>
                Share your experience, ask questions, or post job opportunities
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Post Type</label>
                <Select value={newPost.type} onValueChange={(value: any) => setNewPost(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="experience">Experience Share</SelectItem>
                    <SelectItem value="tip">Career Tip</SelectItem>
                    <SelectItem value="question">Ask Question</SelectItem>
                    <SelectItem value="job_posting">Job Posting</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  placeholder="Enter post title..."
                  value={newPost.title}
                  onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Content</label>
                <Textarea
                  placeholder="Share your thoughts..."
                  value={newPost.content}
                  onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                  rows={4}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Tags (comma separated)</label>
                <Input
                  placeholder="e.g. react, interview, remote"
                  value={newPost.tags}
                  onChange={(e) => setNewPost(prev => ({ ...prev, tags: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreatePostOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreatePost}>
                  Post
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Posts</SelectItem>
            <SelectItem value="experience">Experiences</SelectItem>
            <SelectItem value="tip">Career Tips</SelectItem>
            <SelectItem value="question">Questions</SelectItem>
            <SelectItem value="job_posting">Job Postings</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageCircle className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No posts found</h3>
              <p className="text-gray-500 text-center mb-6">
                {searchQuery || filter !== "all" 
                  ? "Try adjusting your filters or search terms" 
                  : "Be the first to share something with the community!"}
              </p>
              {!searchQuery && filter === "all" && (
                <Button onClick={() => setIsCreatePostOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Post
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredPosts.map((post) => (
            <Card key={post.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                {/* Post Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={post.authorAvatar} />
                      <AvatarFallback>
                        {post.authorName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{post.authorName}</span>
                        <Badge variant="outline" className="text-xs">
                          {post.authorRole}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(post.createdAt)}
                      </div>
                    </div>
                  </div>
                  
                  <Badge className={`${getPostTypeColor(post.type)} flex items-center gap-1`}>
                    {getPostTypeIcon(post.type)}
                    {post.type.replace("_", " ")}
                  </Badge>
                </div>

                {/* Post Content */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{post.title}</h3>
                  <p className="text-gray-700 line-clamp-3">{post.content}</p>
                </div>

                {/* Tags */}
                {post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {post.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Post Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-6">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center gap-2 ${post.isLiked ? 'text-red-500' : 'text-gray-500'}`}
                    >
                      <Heart className={`h-4 w-4 ${post.isLiked ? 'fill-current' : ''}`} />
                      {post.likes}
                    </Button>
                    
                    <Button variant="ghost" size="sm" className="flex items-center gap-2 text-gray-500">
                      <MessageCircle className="h-4 w-4" />
                      {post.commentsCount}
                    </Button>
                    
                    <Button variant="ghost" size="sm" className="flex items-center gap-2 text-gray-500">
                      <Share2 className="h-4 w-4" />
                      Share
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Eye className="h-4 w-4" />
                    {post.views} views
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}