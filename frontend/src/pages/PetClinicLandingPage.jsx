import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Zap, Menu, X, ArrowRight, PawPrint, Sparkles,
  Check, Calendar, Users, BarChart3, Shield, Star,
  MessageSquare, ChevronRight, Bot, Heart, Syringe,
  ClipboardList, TrendingUp, Phone
} from 'lucide-react';


const NAV_ITEMS = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Testimonials', href: '#testimonials' },
];

function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <nav data-testid="pet-navbar" className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-slate-200/60">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <Zap className="h-8 w-8 text-blue-600" />
          <span className="text-xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope' }}>Zap AI</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {NAV_ITEMS.map(i => (
            <a key={i.label} href={i.href} className="text-sm font-medium text-slate-600 hover:text-emerald-600">{i.label}</a>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Link to="/login"><Button variant="ghost" data-testid="nav-login-btn">Sign In</Button></Link>
          <Link to="/register"><Button data-testid="nav-signup-btn" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-6">Get Started</Button></Link>
        </div>
        <button className="md:hidden" onClick={() => setOpen(!open)} data-testid="mobile-menu-btn">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t px-6 py-4 space-y-3 bg-white">
          {NAV_ITEMS.map(i => (
            <a key={i.label} href={i.href} className="block text-sm font-medium text-slate-600" onClick={() => setOpen(false)}>{i.label}</a>
          ))}
          <div className="flex gap-2 pt-2">
            <Link to="/login" className="flex-1"><Button variant="outline" className="w-full">Sign In</Button></Link>
            <Link to="/register" className="flex-1"><Button className="w-full bg-emerald-600 text-white">Get Started</Button></Link>
          </div>
        </div>
      )}
    </nav>
  );
}

function HeroSection() {
  return (
    <section data-testid="pet-hero-section" className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 40%, #047857 100%)' }}>
      <div className="max-w-7xl mx-auto px-6 py-20 md:py-28">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-400/30 mb-6 rounded-full px-4 py-1.5">
              <PawPrint className="h-3.5 w-3.5 mr-1.5" /> Pet Clinic Solution
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.1]" style={{ fontFamily: 'Manrope' }}>
              Revolutionizing Pet Clinic Automation with Zap AI
            </h1>
            <p className="mt-6 text-lg text-emerald-100/80 leading-relaxed max-w-lg">
              Zap AI is your trusted partner in automating booking and customer service systems for pet clinics across Australia.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a href="mailto:demo@zapai.com?subject=Pet Clinic Demo Request">
                <Button data-testid="pet-hero-demo-btn" size="lg" className="bg-yellow-400 hover:bg-yellow-500 text-slate-900 rounded-full px-8 h-12 text-base font-semibold shadow-lg">
                  Book a Demo
                </Button>
              </a>
              <Link to="/register">
                <Button variant="outline" size="lg" data-testid="pet-hero-start-btn" className="border-emerald-400/40 text-white hover:bg-emerald-600/30 rounded-full px-8 h-12 text-base">
                  Get Started Free
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm">
                <Calendar className="h-5 w-5 text-emerald-300" />
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-yellow-400/20 backdrop-blur-sm">
                <Syringe className="h-5 w-5 text-yellow-300" />
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-yellow-400/20 backdrop-blur-sm">
                <PawPrint className="h-5 w-5 text-yellow-300" />
              </div>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?crop=entropy&cs=srgb&fm=jpg&q=85&w=600"
                alt="Happy dog at veterinary clinic"
                className="rounded-2xl w-full h-[420px] object-cover shadow-2xl"
              />
              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg border p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Check className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Today's appointments</p>
                  <p className="text-sm font-semibold text-slate-900">18 pets scheduled</p>
                </div>
              </div>
              <div className="absolute -top-3 -right-3 bg-white rounded-xl shadow-lg border p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <PawPrint className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Active patients</p>
                  <p className="text-sm font-semibold text-slate-900">340+ pets</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AIFeaturesSection() {
  const cards = [
    {
      image: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?crop=entropy&cs=srgb&fm=jpg&q=85&w=400',
      alt: 'Golden retriever at vet',
      label: 'Smart Booking',
    },
    {
      image: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?crop=entropy&cs=srgb&fm=jpg&q=85&w=400',
      alt: 'Dogs playing in park',
      label: 'AI Reminders',
    },
    {
      image: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?crop=entropy&cs=srgb&fm=jpg&q=85&w=400',
      alt: 'Cat at veterinary clinic',
      label: 'Pet Profiles',
    },
  ];

  return (
    <section data-testid="pet-ai-section" className="py-24 bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope' }}>
            Unlock the Power of AI<br />for Your Pet Clinic
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {cards.map((card, i) => (
            <div key={i} className="group relative rounded-2xl overflow-hidden shadow-md hover:shadow-xl"
              style={{ transition: 'box-shadow 0.3s ease' }}>
              <img
                src={card.image}
                alt={card.alt}
                className="w-full h-72 object-cover group-hover:scale-105"
                style={{ transition: 'transform 0.5s ease' }}
              />
              <div className="absolute top-4 left-4">
                <Badge className="bg-emerald-600 text-white border-emerald-700 rounded-lg px-3 py-1 text-xs font-semibold shadow-sm">
                  {card.label}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ElevateSection() {
  const benefits = [
    'Streamlined Booking',
    'Intelligent Chatbot',
    'Enhanced Customer Experience',
    'Increased Efficiency',
    'Business Growth',
  ];

  return (
    <section data-testid="pet-elevate-section" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="relative">
            <div className="w-full max-w-md mx-auto">
              <div className="bg-yellow-400 rounded-full w-[380px] h-[380px] md:w-[440px] md:h-[440px] mx-auto flex items-end justify-center overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?crop=entropy&cs=srgb&fm=jpg&q=85&w=500"
                  alt="Happy white dog"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 leading-tight" style={{ fontFamily: 'Manrope' }}>
              Elevate Your Pet Clinic with Zap AI
            </h2>
            <p className="mt-5 text-base text-slate-600 leading-relaxed">
              Zap AI's advanced algorithms and machine learning capabilities revolutionize pet clinic operations. Our intuitive booking system seamlessly handles appointment scheduling, vaccination reminders, and pet health tracking.
            </p>
            <div className="mt-8 space-y-3">
              {benefits.map((b, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Check className="h-3 w-3 text-emerald-600" />
                  </div>
                  <span className={`text-base font-medium ${i < benefits.length - 1 ? 'text-slate-900' : 'text-slate-400'}`}>{b}</span>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <Link to="/register">
                <Button data-testid="pet-elevate-cta" className="bg-yellow-400 hover:bg-yellow-500 text-slate-900 rounded-full px-8 h-11 text-base font-semibold shadow-sm">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TransformSection() {
  return (
    <section data-testid="pet-transform-section" className="py-24 bg-emerald-50/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 leading-tight" style={{ fontFamily: 'Manrope' }}>
              Transform Your Pet Clinic with Zap AI
            </h2>
            <p className="mt-5 text-base text-slate-600 leading-relaxed">
              Zap AI's comprehensive pet clinic solutions are designed to revolutionize the way you manage your business. From our intuitive booking system that seamlessly handles appointment scheduling to our intelligent chatbot that provides 24/7 customer support, our cutting-edge AI technology streamlines your operations.
            </p>
            <div className="mt-8">
              <a href="mailto:demo@zapai.com?subject=Pet Clinic Demo Request">
                <Button data-testid="pet-transform-cta" className="bg-yellow-400 hover:bg-yellow-500 text-slate-900 rounded-full px-8 h-11 text-base font-semibold shadow-sm">
                  Transform Now <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
          <div>
            <div className="bg-emerald-400 rounded-3xl overflow-hidden shadow-xl">
              <img
                src="https://images.unsplash.com/photo-1755516966419-5e480ec7c7e7?crop=entropy&cs=srgb&fm=jpg&q=85&w=600"
                alt="Veterinarian with dog"
                className="w-full h-[400px] object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    { icon: Calendar, title: 'Smart Booking', desc: 'Automated appointment scheduling with real-time availability for vets and groomers.' },
    { icon: Bot, title: 'AI Chatbot', desc: 'Customer service automation — answers questions and books appointments 24/7.' },
    { icon: BarChart3, title: 'AI Analytics', desc: 'Personalized recommendations and insights to grow your pet clinic business.' },
    { icon: Heart, title: 'Loyalty Programs', desc: 'Integrated marketing solutions to retain clients and reward repeat visits.' },
    { icon: Syringe, title: 'Vaccination Tracking', desc: 'Automated vaccination schedules and reminders for every pet patient.' },
    { icon: Users, title: 'Pet & Owner CRM', desc: 'Complete profiles linking pets to owners with full medical history and visit logs.' },
  ];

  return (
    <section id="features" data-testid="pet-features-section" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <div className="rounded-3xl overflow-hidden shadow-lg">
            <img
              src="https://images.unsplash.com/photo-1601758228041-f3b2795255f1?crop=entropy&cs=srgb&fm=jpg&q=85&w=600"
              alt="Golden retriever at veterinary clinic"
              className="w-full h-[420px] object-cover"
            />
          </div>
          <div>
            <div className="space-y-6">
              {features.map((f, i) => (
                <div key={i} className="flex items-start gap-4 group">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200"
                    style={{ transition: 'background-color 0.2s ease' }}>
                    <f.icon className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 mb-1">{f.title}</h3>
                    <p className="text-sm text-slate-500">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  const plans = [
    {
      name: 'Starter',
      revenue: '$400 - $800 / month',
      price: '$99',
      desc: 'Essential automation for busy pet clinics.',
      features: [
        'Missed call auto text response',
        'Appointment reminder automation',
        'New enquiry auto reply',
        'Automated booking link sent to clients',
        'Google Maps booking integration',
        'Google Calendar appointment view',
        'Workflow documentation provided',
        'Integration handled by our engineers',
        'No upfront integration cost',
      ],
      usage: '150 SMS included monthly',
      usageExtra: 'Additional SMS: $0.04 per message',
      cta: 'Start Automation',
      highlight: false,
    },
    {
      name: 'Growth',
      badge: 'MOST POPULAR',
      revenue: '$700 - $1,500 / month',
      price: '$149',
      desc: 'The automation system most pet clinics choose.',
      prefix: 'Everything in Starter plus:',
      features: [
        'Rebooking reminder automation',
        'Cancellation recovery messages',
        'Google review automation',
        'Inactive client reactivation campaigns',
        'Website AI enquiry assistant',
        'SMS + web chat automation',
        'Performance dashboard and booking insights',
        'Up to 3 automation workflows',
      ],
      usage: '500 SMS included monthly',
      usageExtra: 'Additional SMS: $0.04 per message',
      cta: 'Start Growing',
      highlight: true,
    },
    {
      name: 'Premium',
      revenue: '$1,500 - $3,000+ / month',
      price: '$299',
      desc: 'Advanced AI automation for high-volume clinics.',
      prefix: 'Everything in Growth plus:',
      features: [
        'AI phone answering assistant',
        'Call summary and call-to-booking automation',
        'Multi-channel messaging (SMS + WhatsApp)',
        'Customer feedback automation system',
        'Advanced analytics dashboard',
        'Customer behaviour insights',
        'Multi-location clinic support',
        'Advanced custom workflows',
      ],
      usage: '1500 SMS included monthly',
      usageExtra: 'Additional SMS: $0.04 per message',
      cta: 'Get Premium Automation',
      highlight: false,
    },
  ];

  return (
    <section id="pricing" data-testid="pet-pricing-section" className="py-24 bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-6">
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 mb-4 rounded-full">Pricing</Badge>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope' }}>
            AI Automation That Pays for Itself
          </h2>
          <p className="mt-4 text-base md:text-lg text-slate-600 max-w-2xl mx-auto">
            Recover missed bookings, reduce no-shows, and automate client communication. Most clinics generate $700-$1,500 extra value per month.
          </p>
          <p className="mt-2 text-sm text-emerald-600 font-medium">Launch promotion currently active. Early clinics save $50/month before standard pricing applies.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mt-12 items-start">
          {plans.map((plan, i) => (
            <Card
              key={i}
              data-testid={`pet-pricing-card-${plan.name.toLowerCase()}`}
              className={`rounded-xl overflow-hidden ${
                plan.highlight
                  ? 'border-2 border-emerald-600 shadow-xl shadow-emerald-600/10 relative lg:scale-105'
                  : 'border-slate-200/60'
              }`}
            >
              {plan.badge && (
                <div className="bg-emerald-600 text-white text-center py-2 text-xs font-bold tracking-wider">
                  <Star className="h-3 w-3 inline mr-1" />{plan.badge}
                </div>
              )}
              <div className="p-6">
                <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                <div className="mt-2">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Revenue Boost / Value Generated</p>
                  <p className="text-sm font-semibold text-green-600 mt-1">{plan.revenue}</p>
                </div>
                <div className="mt-3">
                  <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                  <span className="text-sm text-slate-500 ml-1">/ month</span>
                </div>
                <p className="mt-2 text-sm text-slate-500">{plan.desc}</p>
              </div>
              <CardContent className="pt-0">
                {plan.prefix && <p className="text-xs font-semibold text-slate-700 mb-3">{plan.prefix}</p>}
                <ul className="space-y-2.5">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-slate-600">
                      <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-500 font-medium">{plan.usage}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{plan.usageExtra}</p>
                </div>
                <Button
                  data-testid={`pet-pricing-cta-${plan.name.toLowerCase()}`}
                  className={`w-full mt-5 rounded-full h-11 font-medium ${
                    plan.highlight
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {plan.cta} <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const testimonials = [
    { name: 'Dr. Emily Ward', role: 'Veterinary Clinic Owner', text: 'Zap AI transformed our pet clinic. Automated reminders cut no-shows by 40%, and the AI chatbot handles after-hours enquiries perfectly.', avatar: 'EW' },
    { name: 'Mark Peterson', role: 'Multi-Location Vet', text: 'Managing 3 vets and 200+ pet patients was chaos. Now everything runs on autopilot. Best investment for our clinics.', avatar: 'MP' },
    { name: 'Dr. Lisa Chang', role: 'Small Animal Clinic', text: 'The vaccination tracking and automated rebooking have been game-changers. Our clients love the seamless experience.', avatar: 'LC' },
  ];

  return (
    <section id="testimonials" data-testid="pet-testimonials-section" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 mb-4 rounded-full">Testimonials</Badge>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope' }}>
            Trusted by pet clinics everywhere
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <Card key={i} className="rounded-xl border-slate-200/60 hover:shadow-md"
              style={{ transition: 'box-shadow 0.3s ease' }}>
              <CardContent className="p-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => <Star key={j} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700">{t.avatar}</div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section data-testid="pet-cta-section" className="py-24" style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 40%, #047857 100%)' }}>
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-white" style={{ fontFamily: 'Manrope' }}>
          Ready to Transform Your Pet Clinic?
        </h2>
        <p className="mt-4 text-base text-emerald-100/80 max-w-xl mx-auto">
          Join hundreds of pet clinics already using Zap AI to automate operations and grow their business.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link to="/register">
            <Button size="lg" data-testid="pet-cta-start-btn" className="bg-yellow-400 hover:bg-yellow-500 text-slate-900 rounded-full px-8 h-12 text-base font-semibold shadow-lg">
              Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <a href="mailto:demo@zapai.com?subject=Pet Clinic Demo Request">
            <Button variant="outline" size="lg" data-testid="pet-cta-demo-btn" className="border-emerald-400/40 text-white hover:bg-emerald-600/30 rounded-full px-8 h-12 text-base">
              Book Demo
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer data-testid="pet-footer" className="bg-slate-900 text-slate-400 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <Zap className="h-7 w-7 text-blue-500" />
              <span className="text-lg font-bold text-white" style={{ fontFamily: 'Manrope' }}>Zap AI</span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              AI-powered pet clinic management for modern veterinary practices.
            </p>
            <p className="text-xs text-slate-600 mt-4">&copy; 2026 Zap AI, Inc. All rights reserved.</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Quick Links</h4>
            <div className="space-y-2">
              <Link to="/" className="block text-sm hover:text-white">Home</Link>
              <a href="#features" className="block text-sm hover:text-white">Features</a>
              <a href="#pricing" className="block text-sm hover:text-white">Pricing</a>
              <a href="mailto:demo@zapai.com" className="block text-sm hover:text-white">Contact</a>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Company</h4>
            <div className="space-y-2">
              <a href="#" className="block text-sm hover:text-white">Our Story</a>
              <a href="#" className="block text-sm hover:text-white">Our Team</a>
              <a href="#" className="block text-sm hover:text-white">Careers</a>
              <a href="#" className="block text-sm hover:text-white">Partnerships</a>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Resources</h4>
            <div className="space-y-2">
              <a href="#" className="block text-sm hover:text-white">Blog</a>
              <a href="#" className="block text-sm hover:text-white">FAQs</a>
              <a href="#" className="block text-sm hover:text-white">Case Studies</a>
              <a href="#" className="block text-sm hover:text-white">Terms of Service</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function PetClinicLandingPage() {
  return (
    <div data-testid="pet-clinic-landing-page" className="min-h-screen bg-white">
      <Navbar />
      <HeroSection />
      <AIFeaturesSection />
      <ElevateSection />
      <TransformSection />
      <FeaturesSection />
      <PricingSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </div>
  );
}
