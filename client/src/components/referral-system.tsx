import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { 
  Users, 
  Share2, 
  Gift, 
  Copy, 
  Mail, 
  CheckCircle, 
  Clock, 
  Calendar,
  Star,
  Trophy,
  Target,
  Zap
} from "lucide-react";
import { 
  initializeReferralCode, 
  sendReferralInvitation, 
  getUserReferralStats, 
  getUserReferralInvitations,
  FirestoreUser,
  ReferralInvite
} from "../lib/firestore";

interface ReferralSystemProps {
  user: FirestoreUser;
  userRole?: "seeker" | "referrer";
}

export default function ReferralSystem({ user, userRole }: ReferralSystemProps) {
  const [referralCode, setReferralCode] = useState("");
  const [referralStats, setReferralStats] = useState({
    totalReferred: 0,
    successfulReferrals: 0,
    rewardPointsEarned: 0,
    premiumDaysEarned: 0,
  });
  const [referralInvitations, setReferralInvitations] = useState<ReferralInvite[]>([]);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadReferralData = async () => {
      try {
        // Initialize referral code if not exists
        const code = await initializeReferralCode(user.uid, user.displayName || user.email);
        setReferralCode(code);

        // Load referral stats
        const stats = await getUserReferralStats(user.uid);
        if (stats) {
          setReferralStats(stats.stats);
        }

        // Load referral invitations
        const invitations = await getUserReferralInvitations(user.uid);
        setReferralInvitations(invitations);
      } catch (error) {
        console.error("Error loading referral data:", error);
      }
    };

    if (user?.uid) {
      loadReferralData();
    }
  }, [user]);

  const handleCopyReferralCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
    } catch (error) {
    }
  };

  const handleSendInvitation = async () => {
    if (!inviteEmail) {
      return;
    }

    setIsLoading(true);
    try {
      await sendReferralInvitation(
        user.uid,
        user.displayName || user.email,
        user.email,
        inviteEmail,
        inviteName
      );


      setInviteEmail("");
      setInviteName("");
      setIsInviteDialogOpen(false);

      // Refresh invitations list
      const invitations = await getUserReferralInvitations(user.uid);
      setReferralInvitations(invitations);
    } catch (error) {
      console.error("Error sending invitation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "expired": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const referralLink = `${window.location.origin}?ref=${referralCode}`;

  return (
    <div className="space-y-6">
      {/* Referral Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Referral Program
              </CardTitle>
              <CardDescription>
                Earn rewards by inviting friends to join ReferralMe
              </CardDescription>
            </div>
            <Badge className="bg-blue-100 text-blue-800">
              {referralStats.premiumDaysEarned} Premium Days Earned
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{referralStats.totalReferred}</div>
              <div className="text-sm text-gray-600">Total Referred</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{referralStats.successfulReferrals}</div>
              <div className="text-sm text-gray-600">Successful</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{referralStats.rewardPointsEarned}</div>
              <div className="text-sm text-gray-600">Points Earned</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{referralStats.premiumDaysEarned}</div>
              <div className="text-sm text-gray-600">Premium Days</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral Code & Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-green-600" />
            Your Referral Code
          </CardTitle>
          <CardDescription>
            Share your unique code to earn rewards when friends join
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Label htmlFor="referralCode">Referral Code</Label>
              <div className="flex gap-2">
                <Input
                  id="referralCode"
                  value={referralCode}
                  readOnly
                  className="font-mono text-lg"
                />
                <Button onClick={handleCopyReferralCode} variant="outline" size="sm">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="referralLink">Referral Link</Label>
            <div className="flex gap-2">
              <Input
                id="referralLink"
                value={referralLink}
                readOnly
                className="text-sm"
              />
              <Button 
                onClick={() => navigator.clipboard.writeText(referralLink)}
                variant="outline" 
                size="sm"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex-1">
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invitation
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send Referral Invitation</DialogTitle>
                  <DialogDescription>
                    Invite someone to join ReferralMe and earn 7 premium days when they sign up
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="inviteName">Name (Optional)</Label>
                    <Input
                      id="inviteName"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      placeholder="Friend's name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="inviteEmail">Email Address</Label>
                    <Input
                      id="inviteEmail"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="friend@example.com"
                    />
                  </div>
                  <Button 
                    onClick={handleSendInvitation} 
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? "Sending..." : "Send Invitation"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button 
              variant="outline" 
              onClick={() => navigator.share?.({
                title: "Join ReferralMe",
                text: `Join me on ReferralMe - the best platform for job referrals! Use my code: ${referralCode}`,
                url: referralLink
              })}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rewards Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-purple-600" />
            Referral Rewards
          </CardTitle>
          <CardDescription>
            Earn these rewards for successful referrals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-medium">Friend Signs Up</div>
                <div className="text-sm text-gray-600">You earn 7 premium days</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Star className="h-5 w-5 text-blue-600" />
              <div>
                <div className="font-medium">Friend Gets First Job</div>
                <div className="text-sm text-gray-600">You earn 30 premium days + bonus features</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <Trophy className="h-5 w-5 text-purple-600" />
              <div>
                <div className="font-medium">Refer 10 Friends</div>
                <div className="text-sm text-gray-600">Unlock lifetime premium features</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral Invitations */}
      {referralInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-orange-600" />
              Sent Invitations
            </CardTitle>
            <CardDescription>
              Track your referral invitations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {referralInvitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <Mail className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {invitation.inviteeName || invitation.inviteeEmail}
                      </div>
                      <div className="text-sm text-gray-600">
                        {invitation.inviteeName && invitation.inviteeEmail}
                      </div>
                      <div className="text-xs text-gray-500">
                        Sent {invitation.createdAt.toDate().toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(invitation.status)}>
                      {invitation.status}
                    </Badge>
                    {invitation.status === "accepted" && (
                      <Zap className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}