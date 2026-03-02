"use client";

import Link from "next/link";
import { Search, MapPin, Calendar, Users, Heart, Star, ChevronRight, CheckCircle, Headphones, CreditCard, Cuboid as Cube } from "lucide-react";
import { useState, useEffect } from "react";

const heroImages = [
  "/backgrounghome.jpg",
  "/backgrounghome1.jpg",
  "/backgroundhome2.jpg",
  "/backgroundhome3.jpg",
  "/backgroundhome4.jpg",
  "/backgroundhome5.jpg",
  "/backgroundhome6.jpg",
  "/backgroundhome7.jpg",
  "/backgroundhome8.jpg",
  "/backrgroundhome9.jpg",
];

export default function HomePage() {
  const [currentBg, setCurrentBg] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % heroImages.length);
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-light min-h-screen pb-0">
      {/* Hero Section */}
      <section className="relative pt-32 pb-48 px-6 text-white min-h-[600px] flex items-center justify-center">
        {/* Background Images Slideshow */}
        {heroImages.map((img, i) => (
          <div
            key={img}
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000"
            style={{
              backgroundImage: `url('${img}')`,
              opacity: i === currentBg ? 1 : 0,
            }}
          />
        ))}
        <div className="absolute inset-0 z-[1] bg-dark/40" />

        <div className="w-full max-w-5xl mx-auto text-center relative z-10">
          <h1 className="font-heading font-bold text-5xl md:text-6xl lg:text-7xl leading-tight mb-4 drop-shadow-md">
            Découvrez l'Afrique<br />autrement
          </h1>
          <p className="text-white/90 text-lg md:text-xl mb-12 max-w-2xl mx-auto font-medium drop-shadow">
            Réservez des hébergements uniques et vivez des expériences authentiques.
          </p>

          {/* Search Bar Widget */}
          <div className="bg-white rounded-full p-2 max-w-4xl mx-auto shadow-card flex flex-col md:flex-row items-center divide-y md:divide-y-0 md:divide-x divide-gray-200">
            <div className="flex-1 px-6 py-3 w-full text-left">
              <p className="text-[11px] font-bold text-dark uppercase tracking-wide">Destination</p>
              <div className="flex items-center gap-2 mt-1">
                <MapPin size={16} className="text-primary" />
                <input type="text" placeholder="Où allez-vous ?" className="w-full text-sm font-medium text-dark outline-none bg-transparent placeholder:text-gray-400" />
              </div>
            </div>
            <div className="flex-1 px-6 py-3 w-full text-left">
              <p className="text-[11px] font-bold text-dark uppercase tracking-wide">Arrivée</p>
              <div className="flex items-center gap-2 mt-1">
                <Calendar size={16} className="text-primary" />
                <input type="text" placeholder="Ajouter des dates" className="w-full text-sm font-medium text-dark outline-none bg-transparent placeholder:text-gray-400" />
              </div>
            </div>
            <div className="flex-1 px-6 py-3 w-full text-left">
              <p className="text-[11px] font-bold text-dark uppercase tracking-wide">Départ</p>
              <div className="flex items-center gap-2 mt-1">
                <Calendar size={16} className="text-primary" />
                <input type="text" placeholder="Ajouter des dates" className="w-full text-sm font-medium text-dark outline-none bg-transparent placeholder:text-gray-400" />
              </div>
            </div>
            <div className="flex-1 px-6 py-3 w-full text-left flex justify-between items-center">
              <div>
                <p className="text-[11px] font-bold text-dark uppercase tracking-wide">Voyageurs</p>
                <div className="flex items-center gap-2 mt-1">
                  <Users size={16} className="text-primary" />
                  <input type="text" placeholder="Ajouter des voyageurs" className="w-full text-sm font-medium text-dark outline-none bg-transparent placeholder:text-gray-400" />
                </div>
              </div>
              <button className="bg-primary hover:bg-primary-600 text-white p-4 rounded-full transition-colors flex items-center gap-2 font-bold text-sm shadow-md">
                <Search size={18} />
                <span className="hidden lg:inline">Rechercher</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-16 space-y-20 -mt-20 relative z-20">
        
        {/* Destinations Populaires */}
        <section>
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="font-heading font-bold text-dark text-2xl md:text-3xl">Destinations populaires</h2>
              <p className="text-gray-500 text-sm mt-1">Explorez les lieux les plus prisés par nos voyageurs</p>
            </div>
            <Link href="/recherche" className="hidden md:flex items-center gap-1 text-primary text-sm font-bold hover:underline">
              Voir tout <ChevronRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { id: 1, name: "Lomé, Togo 🇹🇬", count: "120+", bg: "https://images.unsplash.com/photo-1518182170-4e36502ff7d8?q=80&w=600&auto=format&fit=crop" },
              { id: 2, name: "Dakar, Sénégal 🇸🇳", count: "240+", bg: "https://images.unsplash.com/photo-1546527581-22467d3dd10f?q=80&w=600&auto=format&fit=crop" },
              { id: 3, name: "Abidjan, CI 🇨🇮", count: "180+", bg: "https://images.unsplash.com/photo-1627448887968-3e58282f1eb8?q=80&w=600&auto=format&fit=crop" },
              { id: 4, name: "Marrakech, Maroc 🇲🇦", count: "300+", bg: "https://images.unsplash.com/photo-1539020140153-e479b8c22e70?q=80&w=600&auto=format&fit=crop" },
            ].map((dest) => (
              <Link key={dest.id} href={`/recherche?dest=${dest.id}`} className="block relative h-48 md:h-64 rounded-[2rem] overflow-hidden group shadow-sm">
                <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: `url('${dest.bg}')` }} />
                <div className="absolute inset-0 bg-gradient-to-t from-dark/80 via-dark/20 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <h3 className="text-white font-heading font-bold text-lg leading-tight">{dest.name}</h3>
                  <p className="text-white/80 text-xs mt-1 font-medium">{dest.count} hébergements</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Categories / Tabs */}
        <section className="flex flex-wrap items-center gap-4">
          {[
            { id: "hotels", label: "Hôtels", count: "400+ propriétés", icon: "h-6 w-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs", iconChar: "H" },
            { id: "apparts", label: "Appartements", count: "600+ propriétés", icon: "h-6 w-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold text-xs", iconChar: "A" },
            { id: "villas", label: "Villas", count: "150+ propriétés", icon: "h-6 w-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-xs", iconChar: "V" },
          ].map((cat) => (
            <div key={cat.id} className="bg-white px-6 py-4 rounded-full border border-gray-100 shadow-sm flex items-center gap-4 cursor-pointer hover:border-primary/30 transition-colors">
              <div className={cat.icon}>{cat.iconChar}</div>
              <div>
                <p className="font-bold text-dark text-sm leading-none">{cat.label}</p>
                <p className="text-xs text-gray-500 mt-1">{cat.count}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Hébergements recommandés */}
        <section>
          <div className="mb-8">
            <h2 className="font-heading font-bold text-dark text-2xl md:text-3xl">Hébergements recommandés</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { id: 1, name: "Villa Hibiscus", loc: "Assinie, Côte d'Ivoire", price: "125 000 XOF", rating: "4.8", img: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=800&auto=format&fit=crop", badge: "360°" },
              { id: 2, name: "Riad Jasmin", loc: "Marrakech, Maroc", price: "85 000 XOF", rating: "4.9", img: "https://images.unsplash.com/photo-1539020140153-e479b8c22e70?q=80&w=800&auto=format&fit=crop", badge: "Nouveau" },
              { id: 3, name: "Lalib Appart Hotel", loc: "Yaoundé, Cameroun", price: "45 000 XOF", rating: "4.6", img: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=800&auto=format&fit=crop", badge: "360°" },
              { id: 4, name: "Serengeti Lodge", loc: "Serengeti, Tanzanie", price: "250 000 XOF", rating: "5.0", img: "https://images.unsplash.com/photo-1516426122078-c23e76319801?q=80&w=800&auto=format&fit=crop", badge: "Populaire" },
              { id: 5, name: "Loft Plateau", loc: "Dakar, Sénégal", price: "60 000 XOF", rating: "4.7", img: "https://images.unsplash.com/photo-1502672260266-1c1e55240c5f?q=80&w=800&auto=format&fit=crop", badge: "360°" },
              { id: 6, name: "Maison de Pierre", loc: "Kigali, Rwanda", price: "55 000 XOF", rating: "4.9", img: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=800&auto=format&fit=crop", badge: "" },
              { id: 7, name: "Suite Océan", loc: "Cap Skirring, Sénégal", price: "90 000 XOF", rating: "4.8", img: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?q=80&w=800&auto=format&fit=crop", badge: "" },
              { id: 8, name: "Bungalow Lagon", type: "Maison", loc: "Zanzibar", price: "180 000 XOF", rating: "4.9", img: "https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?q=80&w=800&auto=format&fit=crop", badge: "Superhôte" },
            ].map((prop) => (
              <Link key={prop.id} href={`/hebergements/${prop.id}`} className="group block">
                <div className="relative aspect-[4/3] rounded-3xl overflow-hidden mb-3">
                  <img src={prop.img} alt={prop.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  {prop.badge && (
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full text-dark shadow-sm">
                      {prop.badge}
                    </div>
                  )}
                  <button className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full text-gray-400 hover:text-red-500 hover:bg-white shadow-sm transition-colors">
                    <Heart size={16} />
                  </button>
                </div>
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="font-heading font-bold text-dark text-[15px]">{prop.name}</h3>
                    <div className="flex items-center gap-1 text-dark">
                      <Star size={12} className="fill-accent text-accent" />
                      <span className="text-xs font-bold">{prop.rating}</span>
                    </div>
                  </div>
                  <p className="text-gray-500 text-xs mt-0.5">{prop.loc}</p>
                  <p className="mt-2 text-sm">
                    <span className="font-bold text-primary">{prop.price}</span>
                    <span className="text-gray-400 text-xs"> / nuit</span>
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Pourquoi choisir AfriStay */}
        <section className="py-12 bg-orange-50/50 rounded-[3rem] px-8 text-center mt-12">
          <h2 className="font-heading font-bold text-dark text-3xl mb-3">Pourquoi choisir AfriStay ?</h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-sm mb-16">
            Nous nous engageons à rendre votre voyage en Afrique aussi simple et mémorable que possible.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { title: "Paiement flexible", desc: "Payez par carte bancaire ou Mobile Money en toute sécurité.", icon: CreditCard, color: "text-orange-500", bg: "bg-orange-100" },
              { title: "Visite virtuelle 360°", desc: "Explorez les logements comme si vous y étiez avant de réserver.", icon: Cube, color: "text-blue-500", bg: "bg-blue-100" },
              { title: "Expériences complètes", desc: "Plus qu'un lit, découvrez des activités locales authentiques.", icon: CheckCircle, color: "text-green-500", bg: "bg-green-100" },
              { title: "Support 24/7", desc: "Une équipe dédiée disponible à tout moment pour vous aider.", icon: Headphones, color: "text-purple-500", bg: "bg-purple-100" },
            ].map((feat, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 shadow-sm ${feat.bg} ${feat.color}`}>
                  <feat.icon size={26} strokeWidth={2} />
                </div>
                <h3 className="font-bold text-dark text-lg mb-2">{feat.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed max-w-[200px]">{feat.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Témoignages */}
        <section className="relative pt-12">
          <div className="text-center mb-12">
            <h2 className="font-heading font-bold text-dark text-3xl">Ce que disent nos voyageurs</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10 mb-[-60px]">
            {[
              { name: "Sarah B.", loc: "France", quote: '"Une expérience incroyable à Abidjan. La plateforme est très intuitive et nous avons trouvé la villa idéale pour nos vacances en famille. Je recommande à 100%!"', rating: 5, avatar: "https://i.pravatar.cc/150?u=sarah" },
              { name: "Maxence D.", loc: "Belgique", quote: '"AfriStay m\'a permis de découvrir des endroits cachés au Sénégal que je n\'aurais jamais trouvés autrement. Le support est top !"', rating: 5, avatar: "https://i.pravatar.cc/150?u=max" },
              { name: "Aminata T.", loc: "Côte d'Ivoire", quote: '"Les paiements par mobile money nous ont sauvés ! C\'est ce qui manquait aux autres plateformes. Le service est rapide et très fiable."', rating: 5, avatar: "https://i.pravatar.cc/150?u=ami" },
            ].map((review, i) => (
              <div key={i} className="bg-white rounded-3xl p-8 shadow-card border border-gray-100 flex flex-col justify-between">
                <div>
                  <div className="flex gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map(star => <Star key={star} size={14} className="fill-accent text-accent" />)}
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed mb-8 italic">{review.quote}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                    <img src={review.avatar} alt={review.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="font-bold text-dark text-sm leading-tight">{review.name}</p>
                    <p className="text-xs text-gray-500">{review.loc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* CTA Footer Section */}
      <section className="bg-primary pt-32 pb-16 px-6 relative mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
          <div className="text-white max-w-xl">
            <h2 className="font-heading font-bold text-3xl md:text-4xl mb-4">Devenez hôte AfriStay</h2>
            <p className="text-white/90 text-sm leading-relaxed mb-8">
              Gagnez un revenu complémentaire en partageant votre logement. Rejoignez notre communauté d'hôtes passionnés et faites découvrir votre région.
            </p>
          </div>
          <button className="bg-white text-primary hover:bg-gray-50 px-8 py-4 rounded-full font-bold transition-colors shadow-lg flex-shrink-0">
            Commencer maintenant
          </button>
        </div>
        
        {/* Simple Footer directly integrated or relies on Layout, but mockups show links here */}
        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/20 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm text-white/80">
          <div>
            <img src="/logo.png" alt="AfriStay" className="h-8 w-auto object-contain brightness-0 invert mb-4" onError={(e) => { e.currentTarget.src = 'https://i.ibb.co/3WfK91p/afristay.png' }} />
            <ul className="space-y-2">
               <li><a href="#" className="hover:text-white">Qui sommes-nous</a></li>
               <li><a href="#" className="hover:text-white">Carrières</a></li>
               <li><a href="#" className="hover:text-white">Investisseurs</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4">Découvrir</h4>
            <ul className="space-y-2">
               <li><a href="#" className="hover:text-white">Hébergements</a></li>
               <li><a href="#" className="hover:text-white">Expériences</a></li>
               <li><a href="#" className="hover:text-white">Blog voyage</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4">Hôte</h4>
            <ul className="space-y-2">
               <li><a href="#" className="hover:text-white">Devenir hôte</a></li>
               <li><a href="#" className="hover:text-white">Ressources hôte</a></li>
               <li><a href="#" className="hover:text-white">Forum de la communauté</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4">Support</h4>
            <ul className="space-y-2">
               <li><a href="#" className="hover:text-white">Centre d'aide</a></li>
               <li><a href="#" className="hover:text-white">Annulation</a></li>
               <li><a href="#" className="hover:text-white">Confidentialité</a></li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
