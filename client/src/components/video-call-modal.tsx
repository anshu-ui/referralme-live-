import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  Monitor, 
  Users,
  Clock,
  AlertCircle
} from "lucide-react";
import { videoCallManager } from "../lib/videoCall";
import { MentorshipSession } from "../lib/firestore";

interface VideoCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: MentorshipSession;
  userRole: "mentor" | "mentee";
}

export default function VideoCallModal({ 
  isOpen, 
  onClose, 
  session, 
  userRole 
}: VideoCallModalProps) {
  const [isInCall, setIsInCall] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [callStatus, setCallStatus] = useState<string>("not_started");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if call is already in progress
    const status = videoCallManager.getCallStatus();
    if (status) {
      setIsInCall(true);
      setCallStatus(status);
    }
  }, []);

  const handleJoinCall = async () => {
    if (!session.meetingUrl) {
      return;
    }

    setIsLoading(true);
    try {
      const userName = userRole === "mentor" ? session.mentorName : session.menteeName;
      const userEmail = userRole === "mentor" ? session.mentorEmail : session.menteeEmail;

      await videoCallManager.joinCall(session.meetingUrl, {
        roomName: `mentorship-${session.id}`,
        userName,
        userEmail,
        duration: session.duration
      });

      setIsInCall(true);
      setCallStatus("joined");
      
    } catch (error) {
      console.error("Error joining video call:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveCall = async () => {
    try {
      await videoCallManager.leaveCall();
      setIsInCall(false);
      setCallStatus("ended");
      
      
      onClose();
    } catch (error) {
      console.error("Error leaving video call:", error);
    }
  };

  const toggleVideo = async () => {
    try {
      await videoCallManager.toggleCamera();
      setIsVideoOn(!isVideoOn);
    } catch (error) {
      console.error("Error toggling video:", error);
    }
  };

  const toggleAudio = async () => {
    try {
      await videoCallManager.toggleMicrophone();
      setIsAudioOn(!isAudioOn);
    } catch (error) {
      console.error("Error toggling audio:", error);
    }
  };

  const openInNewWindow = () => {
    if (session.meetingUrl) {
      window.open(session.meetingUrl, '_blank', 'width=1200,height=800');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-blue-600" />
            Mentorship Video Call
          </DialogTitle>
          <DialogDescription>
            {userRole === "mentor" ? "Conduct" : "Join"} your scheduled mentorship session
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Session Info */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Session Type:</span>
                <Badge variant="outline">{session.title}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Duration:</span>
                <span className="font-medium">{session.duration} minutes</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  {userRole === "mentor" ? "Mentee:" : "Mentor:"}
                </span>
                <span className="font-medium">
                  {userRole === "mentor" ? session.menteeName : session.mentorName}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Status:</span>
                <Badge variant="default" className="bg-green-600">
                  {session.status === "confirmed" ? "Ready to Start" : session.status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Call Status */}
          {!isInCall && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Monitor className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800">Ready to Join</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Click the button below to join your video call. Make sure your camera and microphone are working.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {isInCall && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-800">In Call</h4>
                    <p className="text-sm text-green-700 mt-1">
                      Your video call is active. Use the controls below to manage your audio and video.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Video Call Controls */}
          {!isInCall ? (
            <div className="flex gap-3">
              <Button 
                onClick={openInNewWindow}
                variant="outline" 
                className="flex-1"
                disabled={!session.meetingUrl}
              >
                <Monitor className="h-4 w-4 mr-2" />
                Open in New Window
              </Button>
              <Button 
                onClick={handleJoinCall}
                className="flex-1"
                disabled={isLoading || !session.meetingUrl}
              >
                <Video className="h-4 w-4 mr-2" />
                {isLoading ? "Joining..." : "Join Call"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2 justify-center">
                <Button
                  variant={isVideoOn ? "default" : "destructive"}
                  size="sm"
                  onClick={toggleVideo}
                >
                  {isVideoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                </Button>
                <Button
                  variant={isAudioOn ? "default" : "destructive"}
                  size="sm"
                  onClick={toggleAudio}
                >
                  {isAudioOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleLeaveCall}
                >
                  <Phone className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 text-center">
                Use the controls above to manage your call
              </p>
            </div>
          )}

          {/* Help Text */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-gray-600 mt-0.5" />
              <div className="text-xs text-gray-600">
                <p className="font-medium mb-1">Need help?</p>
                <ul className="space-y-0.5">
                  <li>• Make sure your browser allows camera and microphone access</li>
                  <li>• Use Chrome, Firefox, or Safari for best experience</li>
                  <li>• Check your internet connection if video is lagging</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}