import { useState, useEffect } from "react";
import { getJobPostings, JobPosting } from "../lib/firestore";
import { Briefcase, MapPin, DollarSign, ChevronRight, ExternalLink } from "lucide-react";
import { Link } from "wouter";

export default function LiveJobsSection() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const allJobs = await getJobPostings();
        // Get the latest 6 jobs
        setJobs(allJobs.slice(0, 6));
      } catch (error) {
        console.error("Error fetching live jobs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (jobs.length === 0) return null;

  return (
    <section id="live-jobs" className="py-20 bg-slate-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            Live Feed
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Live Referral Opportunities</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Real-time job openings from top companies. Get referred directly by employees.
          </p>
        </div>

        <div className="relative">
          {/* Scrolling Container */}
          <div className="flex animate-scroll hover:pause-scroll gap-6 py-4">
            {/* Double the jobs for infinite scroll effect */}
            {[...jobs, ...jobs].map((job, index) => (
              <div 
                key={`${job.id}-${index}`}
                className="flex-shrink-0 w-[300px] md:w-[350px] bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-blue-50 rounded-xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Briefcase size={24} />
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 bg-green-50 text-green-700 rounded-full">
                    Active
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-slate-900 mb-1 truncate">{job.title}</h3>
                <p className="text-blue-600 font-semibold mb-4">{job.company}</p>
                
                <div className="space-y-2 mb-6 text-slate-500 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} />
                    <span>{job.location}</span>
                  </div>
                  {job.salary && (
                    <div className="flex items-center gap-2">
                      <DollarSign size={16} />
                      <span>{job.salary}</span>
                    </div>
                  )}
                </div>

                <Link href={`/job-details/${job.id}`}>
                  <span className="w-full py-3 px-4 bg-slate-900 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors cursor-pointer">
                    Apply Now <ChevronRight size={18} />
                  </span>
                </Link>
              </div>
            ))}
          </div>
          
          {/* REMOVED: Blur white box gradients (overlays) from here */}
        </div>

        <div className="mt-12 text-center">
          <Link href="/seeker-dashboard">
            <span className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline cursor-pointer">
              View All Jobs <ExternalLink size={18} />
            </span>
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(-300px * ${jobs.length} - 1.5rem * ${jobs.length})); }
        }
        
        @media (min-width: 768px) {
          @keyframes scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(calc(-350px * ${jobs.length} - 1.5rem * ${jobs.length})); }
          }
        }

        .animate-scroll {
          animation: scroll 40s linear infinite;
          width: max-content;
        }

        .pause-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
}