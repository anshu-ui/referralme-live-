import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Wand2, Copy, CheckCircle } from 'lucide-react';

interface JobDescriptionGeneratorProps {
  onGenerated: (description: string, requirements: string) => void;
}

export default function AIJobDescriptionGenerator({ onGenerated }: JobDescriptionGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    jobTitle: '',
    company: '',
    location: '',
    experience: '',
    keySkills: '',
    additionalInfo: ''
  });
  const [generatedContent, setGeneratedContent] = useState({
    description: '',
    requirements: ''
  });
  const [copied, setCopied] = useState(false);

  const generateJobDescription = async () => {
    setIsGenerating(true);
    
    // Simulate AI generation with professional templates
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const { jobTitle, company, location, experience, keySkills, additionalInfo } = formData;
    
    const description = `About the Role:
We are looking for a talented ${jobTitle} to join our dynamic team at ${company} in ${location}. This is an excellent opportunity for a professional with ${experience} of experience to make a significant impact in a fast-growing company.

Key Responsibilities:
• Lead and execute ${jobTitle.toLowerCase()} initiatives and projects
• Collaborate with cross-functional teams to deliver high-quality solutions
• Drive innovation and implement best practices in ${keySkills.split(',')[0]?.trim() || 'your field'}
• Mentor junior team members and contribute to team growth
• Participate in strategic planning and decision-making processes

What We Offer:
• Competitive salary and comprehensive benefits package
• Flexible working arrangements and professional development opportunities
• Collaborative work environment with cutting-edge technology
• Career advancement opportunities in a rapidly growing company
• Health insurance, retirement plans, and performance bonuses

${additionalInfo ? `Additional Information:\n${additionalInfo}` : ''}`;

    const requirements = `Required Qualifications:
• ${experience} of hands-on experience in ${jobTitle.toLowerCase()} role
• Strong proficiency in ${keySkills}
• Bachelor's degree in relevant field or equivalent practical experience
• Excellent problem-solving and analytical skills
• Strong communication and collaboration abilities

Preferred Qualifications:
• Experience with modern development tools and methodologies
• Previous experience in ${company.includes('startup') ? 'startup' : 'similar'} environment
• Leadership experience and team management skills
• Continuous learning mindset and adaptability to new technologies
• Portfolio of successful projects and achievements

Technical Skills:
${keySkills.split(',').map(skill => `• ${skill.trim()}`).join('\n')}

Location: ${location}
Experience Level: ${experience}
Employment Type: Full-time`;

    setGeneratedContent({ description, requirements });
    setIsGenerating(false);
  };

  const handleUseGenerated = () => {
    onGenerated(generatedContent.description, generatedContent.requirements);
    setIsOpen(false);
    setGeneratedContent({ description: '', requirements: '' });
    setFormData({
      jobTitle: '',
      company: '',
      location: '',
      experience: '',
      keySkills: '',
      additionalInfo: ''
    });
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium px-6 py-2 shadow-md hover:shadow-lg transition-all">
          <Wand2 className="h-4 w-4 mr-2" />
          Generate Job Description with AI
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-purple-600" />
            AI Job Description Generator
          </DialogTitle>
        </DialogHeader>
        
        {!generatedContent.description ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="jobTitle">Job Title *</Label>
                <Input
                  id="jobTitle"
                  placeholder="e.g. Senior Frontend Developer"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="company">Company *</Label>
                <Input
                  id="company"
                  placeholder="e.g. TechCorp Inc"
                  value={formData.company}
                  onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  placeholder="e.g. San Francisco, CA"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="experience">Experience Level *</Label>
                <Input
                  id="experience"
                  placeholder="e.g. 3-5 years"
                  value={formData.experience}
                  onChange={(e) => setFormData(prev => ({ ...prev, experience: e.target.value }))}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="keySkills">Key Skills (comma separated) *</Label>
              <Input
                id="keySkills"
                placeholder="e.g. React, TypeScript, Node.js, AWS"
                value={formData.keySkills}
                onChange={(e) => setFormData(prev => ({ ...prev, keySkills: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="additionalInfo">Additional Information (Optional)</Label>
              <Textarea
                id="additionalInfo"
                placeholder="Any specific requirements, benefits, or company culture details..."
                value={formData.additionalInfo}
                onChange={(e) => setFormData(prev => ({ ...prev, additionalInfo: e.target.value }))}
                rows={3}
              />
            </div>
            
            <Button 
              onClick={generateJobDescription}
              disabled={!formData.jobTitle || !formData.company || !formData.location || !formData.experience || !formData.keySkills || isGenerating}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating with AI...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate Job Description
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-lg font-semibold">Generated Job Description</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(generatedContent.description)}
                >
                  {copied ? <CheckCircle className="h-4 w-4 mr-1 text-green-600" /> : <Copy className="h-4 w-4 mr-1" />}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              <Textarea
                value={generatedContent.description}
                onChange={(e) => setGeneratedContent(prev => ({ ...prev, description: e.target.value }))}
                rows={12}
                className="font-mono text-sm"
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-lg font-semibold">Generated Requirements</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(generatedContent.requirements)}
                >
                  {copied ? <CheckCircle className="h-4 w-4 mr-1 text-green-600" /> : <Copy className="h-4 w-4 mr-1" />}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              <Textarea
                value={generatedContent.requirements}
                onChange={(e) => setGeneratedContent(prev => ({ ...prev, requirements: e.target.value }))}
                rows={10}
                className="font-mono text-sm"
              />
            </div>
            
            <div className="flex gap-3">
              <Button 
                onClick={handleUseGenerated}
                className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
              >
                Use This Job Description
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setGeneratedContent({ description: '', requirements: '' })}
                className="flex-1"
              >
                Generate New
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}