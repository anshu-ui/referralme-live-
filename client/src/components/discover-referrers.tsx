import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Search, Filter, TrendingUp, Award, Users, Star, UserCheck } from "lucide-react";
import { trackEvent } from "../lib/analytics";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import VerificationBadge from "./verification-badge";

interface DiscoverReferrersProps {
  onReferrerSelect: (referrerId: string) => void;
}

export default function DiscoverReferrers({ onReferrerSelect }: DiscoverReferrersProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBy, setFilterBy] = useState("all");
  const [sortBy, setSortBy] = useState("impact_score");
  const [realReferrers, setRealReferrers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobCounts, setJobCounts] = useState<Record<string, number>>({});
  const [referralCounts, setReferralCounts] = useState<Record<string, number>>({});

  // Real-time Firebase data for job counts
  useEffect(() => {
    const jobsQuery = query(collection(db, "jobPostings"));
    
    const unsubscribeJobs = onSnapshot(jobsQuery, (snapshot) => {
      const counts: Record<string, number> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const referrerId = data.referrerId || data.userId;
        if (referrerId) {
          counts[referrerId] = (counts[referrerId] || 0) + 1;
        }
      });
      setJobCounts(counts);
    });

    return () => unsubscribeJobs();
  }, []);

  // Real-time Firebase data for referral counts
  useEffect(() => {
    const referralsQuery = query(collection(db, "referralRequests"));
    
    const unsubscribeReferrals = onSnapshot(referralsQuery, (snapshot) => {
      const counts: Record<string, number> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const referrerId = data.referrerId;
        if (referrerId && (data.status === 'accepted' || data.status === 'completed')) {
          counts[referrerId] = (counts[referrerId] || 0) + 1;
        }
      });
      setReferralCounts(counts);
    });

    return () => unsubscribeReferrals();
  }, []);

  // Real-time Firebase data for referrers
  useEffect(() => {
    const referrersQuery = query(
      collection(db, "users"),
      where("role", "==", "referrer"),
      limit(20)
    );

    const unsubscribe = onSnapshot(referrersQuery, (snapshot) => {
      const referrerData = snapshot.docs.map(doc => {
        const data = doc.data();
        const referrerId = doc.id;
        return {
          id: referrerId,
          name: data.displayName || data.email?.split('@')[0] || "Anonymous",
          email: data.email,
          photoURL: data.photoURL,
          jobTitle: data.jobTitle || data.designation || "Professional",
          company: data.company || "Company",
          bio: data.bio || "Professional helping others find great opportunities",
          reputationLevel: "rising" as const, // Default level for real users
          impactScore: Math.floor(Math.random() * 500) + 100, // Will be calculated from real activity
          jobsPosted: jobCounts[referrerId] || 0, // Real count from job postings
          referralsGiven: referralCounts[referrerId] || 0, // Real count from completed referrals
          testimonialCount: 0,
          averageRating: 4.5,
          profileViews: Math.floor(Math.random() * 100) + 10,
          achievements: ["New Member"], // Will be calculated from real achievements
          isVerified: data.isVerified || false, // Add verification status
          createdAt: data.createdAt,
        };
      });
      
      setRealReferrers(referrerData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching referrers:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [jobCounts, referralCounts]); // Re-run when counts update

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    trackEvent('search_referrers', 'discovery', query);
  };

  const filteredReferrers = realReferrers.filter(referrer => {
    const matchesSearch = referrer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         referrer.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         referrer.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterBy === "all") return matchesSearch;
    if (filterBy === "legend") return matchesSearch && referrer.reputationLevel === "legend";
    if (filterBy === "expert") return matchesSearch && referrer.reputationLevel === "expert";
    if (filterBy === "high_impact") return matchesSearch && referrer.impactScore > 2000;
    
    return matchesSearch;
  });

  const sortedReferrers = [...filteredReferrers].sort((a, b) => {
    switch (sortBy) {
      case "impact_score":
        return b.impactScore - a.impactScore;
      case "placements":
        return b.successfulPlacements - a.successfulPlacements;
      case "rating":
        return b.averageRating - a.averageRating;
      case "recent":
        return b.profileViews - a.profileViews; // Using views as proxy for recent activity
      default:
        return 0;
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Discover Top Referrers</h2>
        <p className="text-gray-600">Connect with industry professionals who are actively helping careers grow</p>
      </div>

      {/* Real-Time Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center p-4">
          <Users className="h-6 w-6 mx-auto text-blue-600 mb-2" />
          <div className="text-xl font-bold">{realReferrers.length}</div>
          <div className="text-xs text-gray-600">Active Referrers</div>
        </Card>
        <Card className="text-center p-4">
          <Award className="h-6 w-6 mx-auto text-green-600 mb-2" />
          <div className="text-xl font-bold">0</div>
          <div className="text-xs text-gray-600">Successful Placements</div>
        </Card>
        <Card className="text-center p-4">
          <Star className="h-6 w-6 mx-auto text-yellow-600 mb-2" />
          <div className="text-xl font-bold">-</div>
          <div className="text-xs text-gray-600">Average Rating</div>
        </Card>
        <Card className="text-center p-4">
          <TrendingUp className="h-6 w-6 mx-auto text-purple-600 mb-2" />
          <div className="text-xl font-bold">-</div>
          <div className="text-xs text-gray-600">Success Rate</div>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, company, or role..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={filterBy} onValueChange={setFilterBy}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Referrers</SelectItem>
                  <SelectItem value="legend">Legends Only</SelectItem>
                  <SelectItem value="expert">Experts</SelectItem>
                  <SelectItem value="high_impact">High Impact</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="impact_score">Impact Score</SelectItem>
                  <SelectItem value="placements">Placements</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="recent">Most Active</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        {!loading && realReferrers.length > 0 && (
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">
              {filteredReferrers.length} Referrer{filteredReferrers.length !== 1 ? 's' : ''} Found
            </h3>
            {filterBy !== "all" && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Filter className="h-3 w-3" />
                {filterBy.replace("_", " ")}
              </Badge>
            )}
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading real referrers...</p>
          </div>
        )}
        
        {!loading && realReferrers.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <UserCheck className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No referrers yet</h3>
              <p className="text-gray-600">
                Be among the first to connect! Real referrers will appear here as they join the platform.
              </p>
            </CardContent>
          </Card>
        )}
        
        {!loading && filteredReferrers.length === 0 && realReferrers.length > 0 && (
          <Card className="text-center py-8">
            <CardContent>
              <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No referrers match your search</h3>
              <p className="text-gray-600">Try adjusting your search terms or filters</p>
            </CardContent>
          </Card>
        )}
        
        {!loading && filteredReferrers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReferrers.map((referrer) => (
              <Card key={referrer.id} className="cursor-pointer hover:shadow-lg transition-shadow duration-300" onClick={() => onReferrerSelect(referrer.id)}>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={referrer.photoURL || undefined} />
                      <AvatarFallback>
                        {referrer.name?.charAt(0) || "R"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{referrer.name}</CardTitle>
                        <VerificationBadge isVerified={referrer.isVerified} size="sm" />
                      </div>
                      <p className="text-sm text-gray-600">{referrer.jobTitle} at {referrer.company}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {referrer.reputationLevel}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-gray-700 mb-4 line-clamp-2">
                    {referrer.bio}
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-lg font-bold text-blue-600">{referrer.jobsPosted || 0}</div>
                      <div className="text-xs text-gray-600">Jobs Posted</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-green-600">{referrer.referralsGiven || 0}</div>
                      <div className="text-xs text-gray-600">Referrals Given</div>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-between items-center">
                    <div className="flex flex-wrap gap-1">
                      {referrer.achievements?.slice(0, 2).map((achievement: string) => (
                        <Badge key={achievement} variant="secondary" className="text-xs">
                          {achievement}
                        </Badge>
                      ))}
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onReferrerSelect(referrer.id);
                      }}
                    >
                      View Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Load More */}
      {!loading && filteredReferrers.length > 0 && (
        <div className="text-center">
          <Button variant="outline">
            Load More Referrers
          </Button>
        </div>
      )}
    </div>
  );
}