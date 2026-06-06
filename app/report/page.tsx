'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { diagnoseIssue } from '@/app/actions';
import { MOCK_ARTISANS } from '@/lib/mock-db';
import { useFixMateStore } from '@/lib/store';
import Image from 'next/image';
import { Zap, Camera, ChevronLeft, Bot, BadgeAlert, AlertTriangle, Info, MapPin, ShieldCheck, Star } from 'lucide-react';
import LocationAutocomplete from '@/components/LocationAutocomplete';

export default function ReportPage() {
  const router = useRouter();
  const setDiagnosisState = useFixMateStore((s) => s.setDiagnosis);
  
  const [description, setDescription] = useState('');
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<any | null>(null);
  const [recommendedArtisans, setRecommendedArtisans] = useState<any[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setImageFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!description && !imagePreview) return;
    
    setIsAnalyzing(true);
    
    try {
      const result = await diagnoseIssue(description, imagePreview);
      setDiagnosisResult(result);
      setDiagnosisState(result);
      
      const matched = MOCK_ARTISANS.filter(
        a => a.category.toLowerCase() === result.artisan_category?.toLowerCase()
      );
      setRecommendedArtisans(matched.length > 0 ? matched : MOCK_ARTISANS.slice(0, 3));
      
    } catch (error) {
      console.error(error);
      alert("Failed to analyze issue. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleBook = (artisan: any) => {
     useFixMateStore.getState().setSelectedArtisan(artisan);
     router.push('/booking');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white px-6 py-4 flex items-center border-b shadow-sm mb-4">
        <Link href="/" className="text-gray-500 hover:text-gray-800 mr-4 font-bold flex items-center gap-1">
           <ChevronLeft className="w-5 h-5"/> Back
        </Link>
        <span className="text-xl font-bold text-gray-900 tracking-tight">FixMate Diagnostic</span>
      </header>

      <main className="flex-1 flex flex-col items-center py-10 px-6 max-w-2xl mx-auto w-full">
        
        {!diagnosisResult ? (
          <div className="bg-white p-6 md:p-8 rounded-none shadow-sm border border-gray-200 w-full animate-fade-in-up">
            <div className="relative w-full h-32 flex items-center justify-center mb-6">
              <div className="absolute w-24 h-24 bg-green-50 rounded-none -z-10"></div>
              <Zap className="w-16 h-16 text-gray-800" strokeWidth={1} />
              <Camera className="w-8 h-8 text-green-700 absolute bottom-4 ml-12 bg-white rounded-none p-1 border border-gray-100" strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2 text-center">What seems to be the problem?</h2>
            <p className="text-gray-600 mb-6 text-center">Describe the issue or upload a photo. AI will analyze it instantly.</p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload Photo</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-none p-8 text-center bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors relative overflow-hidden"
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto rounded-none object-contain" />
                ) : (
                  <>
                    <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 font-medium">Tap to upload a photo</p>
                    <p className="text-xs text-gray-400 mt-1">Supported formats: JPG, PNG</p>
                  </>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleImageChange}
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Describe the issue</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-gray-300 rounded-none p-4 text-gray-800 focus:ring-2 focus:ring-green-700 focus:border-green-700 outline-none transition-all resize-none h-32"
                placeholder="e.g. My generator is shutting off after 5 minutes..."
              ></textarea>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Where do you need the artisan? (Optional)</label>
              <LocationAutocomplete placeholder="e.g. 10 Awolowo Road, Ikoyi" />
            </div>

            <button 
              onClick={handleAnalyze}
              disabled={isAnalyzing || (!description && !imagePreview)}
              className="w-full py-4 bg-green-700 text-white font-bold rounded-none shadow hover:bg-green-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                   <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-none animate-spin"></span>
                   <span>Analyzing Workspace...</span>
                </>
              ) : (
                <>
                  <span>Analyze Issue</span>
                  <Zap className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="w-full space-y-6">
            <div className="bg-white p-6 rounded-none shadow-sm border border-gray-200 animate-fade-in-up">
               <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 rounded-none bg-green-50 flex items-center justify-center text-green-700 border border-green-100">
                   <Bot className="w-5 h-5"/>
                 </div>
                 <div>
                   <h2 className="text-xl font-bold text-gray-900">Diagnosis</h2>
                   <p className="text-sm text-gray-500">Analysis complete</p>
                 </div>
               </div>
               
               <div className="bg-gray-50 border border-gray-200 rounded-none p-4 mb-4">
                  <h3 className="font-semibold text-gray-900 mb-1">{diagnosisResult.issue_title}</h3>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="px-2 py-1 bg-white text-xs font-medium text-gray-700 rounded-none border border-gray-200 shadow-sm">
                      Category: {diagnosisResult.artisan_category}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-none border shadow-sm ${
                      diagnosisResult.urgency === 'High' ? 'bg-red-50 text-red-700 border-red-200' : 
                      diagnosisResult.urgency === 'Medium' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                      'bg-green-50 text-green-700 border-green-200'
                    }`}>
                      Urgency: {diagnosisResult.urgency}
                    </span>
                    <span className="px-2 py-1 bg-white text-xs font-medium text-green-700 rounded-none border border-green-200 shadow-sm flex items-center gap-1">
                      <Info className="w-3 h-3" /> Est: ₦{diagnosisResult.estimated_cost_naira}
                    </span>
                  </div>
               </div>

               {diagnosisResult.safety_warning && (
                 <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-none mb-4">
                   <div className="flex items-start gap-2 text-red-800">
                     <AlertTriangle className="w-5 h-5 shrink-0" />
                     <div>
                       <h4 className="font-bold text-sm">Safety Warning</h4>
                       <p className="text-sm mt-1">{diagnosisResult.safety_warning}</p>
                     </div>
                   </div>
                 </div>
               )}
               
               {diagnosisResult.follow_up_questions && diagnosisResult.follow_up_questions.length > 0 && (
                 <div className="mt-4 border-t pt-4">
                   <h4 className="text-sm font-semibold text-gray-700 mb-2">Follow up questions for the artisan:</h4>
                   <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                     {diagnosisResult.follow_up_questions.map((q: string, i: number) => (
                       <li key={i}>{q}</li>
                     ))}
                   </ul>
                 </div>
               )}
            </div>

            <h3 className="text-lg font-bold text-gray-900 px-1 mt-6">Recommended Artisans</h3>
            <div className="space-y-4">
              {recommendedArtisans.map((artisan, idx) => (
                <div key={artisan.id} className="bg-white p-5 rounded-none shadow-sm border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in-up" style={{animationDelay: `${idx * 0.1}s`}}>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                       <Image unoptimized src={artisan.avatar} alt={artisan.name} width={60} height={60} className="rounded-none bg-gray-200 object-cover border border-gray-200" />
                       {artisan.isVerified && (
                         <div className="absolute -bottom-1 -right-1 bg-green-700 text-white rounded-none w-5 h-5 flex items-center justify-center text-xs shadow-sm border border-white" title="Verified">
                           <ShieldCheck className="w-3 h-3" />
                         </div>
                       )}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 flex items-center gap-2">
                        {artisan.name}
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-none font-medium">{artisan.category}</span>
                      </h4>
                      <div className="text-sm text-gray-500 mt-1 flex items-center gap-3">
                        <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-gray-400" /> {artisan.score}% Trust</span>
                        <span>•</span>
                        <span>{artisan.completedJobs} jobs</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {artisan.location}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3">
                    <span className="font-bold text-gray-900">{artisan.rate}</span>
                    <button 
                      onClick={() => handleBook(artisan)}
                      className="px-5 py-2 bg-gray-900 text-white text-sm font-bold rounded-none shadow-sm hover:bg-gray-800 transition-colors"
                    >
                      Select & Book
                    </button>
                  </div>
                </div>
              ))}
              
              {recommendedArtisans.length === 0 && (
                <div className="text-center p-8 bg-gray-100 rounded-none text-gray-500 text-sm border border-gray-200">
                  No specific artisans found for this category. Showing general workers soon.
                </div>
              )}
            </div>
            
            <div className="pt-6 flex justify-center">
               <button 
                 onClick={() => { setDiagnosisResult(null); setDescription(''); setImagePreview(null); setImageFile(null); }}
                 className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors"
               >
                 Start Over
               </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


