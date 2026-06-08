"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LocationAutocomplete from "@/components/LocationAutocomplete";
import { saveArtisanApplication } from "@/lib/demo-db";
import { ARTISAN_CATEGORIES, ArtisanCategory } from "@/lib/types";

export default function ArtisanRegisterPage() {
  const router = useRouter();
  const [location, setLocation] = useState("Ikeja, Lagos");
  const [category, setCategory] = useState<ArtisanCategory>("Plumber");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    saveArtisanApplication({
      fullName: String(form.get("fullName") || ""),
      phone: String(form.get("phone") || ""),
      category,
      location,
      yearsExperience: Number(form.get("yearsExperience") || 0),
      verificationId: String(form.get("verificationId") || "Verification placeholder"),
      skills: String(form.get("skills") || "").split(",").map((skill) => skill.trim()).filter(Boolean),
      serviceRadiusKm: Number(form.get("serviceRadiusKm") || 5),
      opayPhone: String(form.get("opayPhone") || ""),
    });
    router.push("/artisan/dashboard");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white px-4 sm:px-6 py-4 flex items-center border-b shadow-sm mb-4">
        <Link href="/" className="text-gray-500 hover:text-gray-800 mr-4 font-bold flex items-center gap-1">Back</Link>
        <span className="text-xl font-bold text-gray-900 tracking-tight">Artisan Onboarding</span>
      </header>

      <main className="flex-1 flex flex-col items-center py-6 sm:py-10 px-4 sm:px-6 max-w-lg mx-auto w-full animate-fade-in-up">
        <div className="bg-white p-6 sm:p-8 rounded-none shadow-sm border border-gray-200 w-full">
          <div className="relative w-full h-20 flex items-center justify-center mb-4">
            <div className="border border-green-200 bg-green-50 px-4 py-2 text-sm font-bold text-green-800">Verified artisan application</div>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2 text-center">Join Handijob</h1>
          <p className="text-gray-600 mb-6 text-center text-sm">Applications are saved for admin approval. Completed jobs carry a 10% artisan escrow fee.</p>

          <form onSubmit={submit} className="space-y-4">
            <Input name="fullName" label="Full Name" placeholder="e.g. Chinedu Okafor" />
            <Input name="phone" label="Phone Number" placeholder="080..." type="tel" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as ArtisanCategory)} className="w-full border border-gray-300 rounded-none p-3 text-gray-800 focus:ring-2 focus:ring-green-700 outline-none">
                {ARTISAN_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shop / Home Location</label>
              <LocationAutocomplete defaultValue={location} onPlaceSelect={(place) => setLocation(place.formatted_address || place.name)} />
            </div>
            <Input name="yearsExperience" label="Years of Experience" placeholder="5" type="number" />
            <Input name="verificationId" label="ID / Verification Placeholder" placeholder="NIN, CAC, trade association ID, or upload note" />
            <Input name="skills" label="Skills" placeholder="Pipe fitting, emergency repairs, installations" />
            <Input name="serviceRadiusKm" label="Service Radius (km)" placeholder="10" type="number" />
            <Input name="opayPhone" label="Bank / OPay Phone Placeholder" placeholder="080..." type="tel" />
            <button type="submit" className="w-full py-4 bg-gray-900 text-white font-bold rounded-none shadow hover:bg-gray-800">Apply for Verification</button>
          </form>
        </div>
      </main>
    </div>
  );
}

function Input({ name, label, placeholder, type = "text" }: { name: string; label: string; placeholder: string; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input name={name} type={type} required className="w-full border border-gray-300 rounded-none p-3 text-gray-800 focus:ring-2 focus:ring-green-700 focus:border-green-700 outline-none" placeholder={placeholder} />
    </div>
  );
}
