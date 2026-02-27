// Video Calling Integration using Daily.co
import DailyIframe from '@daily-co/daily-js';

export interface VideoCallOptions {
  roomName: string;
  userName: string;
  userEmail: string;
  duration?: number; // in minutes
}

export interface VideoRoom {
  url: string;
  roomName: string;
  created: boolean;
}

export class VideoCallManager {
  private callFrame: any = null;
  private roomUrl: string = '';

  constructor() {
    // Initialize Daily
  }

  // Create a video call room
  async createRoom(sessionId: string, duration: number = 60): Promise<VideoRoom> {
    try {
      // For now, we'll use a simple room naming convention
      // In production, you'd call your backend to create a Daily.co room
      const roomName = `mentorship-${sessionId}-${Date.now()}`;
      const roomUrl = `https://referralme.daily.co/${roomName}`;
      
      return {
        url: roomUrl,
        roomName,
        created: true
      };
    } catch (error) {
      console.error('Error creating video room:', error);
      throw error;
    }
  }

  // Join a video call
  async joinCall(roomUrl: string, options: VideoCallOptions): Promise<void> {
    try {
      // Create call frame
      this.callFrame = DailyIframe.createFrame({
        showLeaveButton: true,
        iframeStyle: {
          position: 'fixed',
          top: '0',
          left: '0',
          width: '100%',
          height: '100%',
          zIndex: '9999',
          border: 'none',
          backgroundColor: '#000'
        }
      });

      this.roomUrl = roomUrl;

      // Join the call
      await this.callFrame.join({
        url: roomUrl,
        userName: options.userName,
        userData: {
          email: options.userEmail
        }
      });

      // Set up event listeners
      this.setupEventListeners();

    } catch (error) {
      console.error('Error joining video call:', error);
      throw error;
    }
  }

  // Leave the video call
  async leaveCall(): Promise<void> {
    try {
      if (this.callFrame) {
        await this.callFrame.leave();
        this.callFrame.destroy();
        this.callFrame = null;
      }
    } catch (error) {
      console.error('Error leaving video call:', error);
    }
  }

  // Setup event listeners for the call
  private setupEventListeners(): void {
    if (!this.callFrame) return;

    this.callFrame.on('left-meeting', () => {
      console.log('User left the meeting');
      this.callFrame.destroy();
      this.callFrame = null;
    });

    this.callFrame.on('error', (error: any) => {
      console.error('Video call error:', error);
    });

    this.callFrame.on('participant-joined', (event: any) => {
      console.log('Participant joined:', event.participant);
    });

    this.callFrame.on('participant-left', (event: any) => {
      console.log('Participant left:', event.participant);
    });
  }

  // Get current call status
  getCallStatus(): any {
    if (!this.callFrame) return null;
    return this.callFrame.meetingState();
  }

  // Toggle camera
  async toggleCamera(): Promise<void> {
    if (this.callFrame) {
      await this.callFrame.setLocalVideo(!this.callFrame.localVideo());
    }
  }

  // Toggle microphone
  async toggleMicrophone(): Promise<void> {
    if (this.callFrame) {
      await this.callFrame.setLocalAudio(!this.callFrame.localAudio());
    }
  }
}

// Global video call manager instance
export const videoCallManager = new VideoCallManager();