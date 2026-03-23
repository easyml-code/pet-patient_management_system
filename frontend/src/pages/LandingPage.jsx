import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import {
  Zap, Menu, X, ArrowRight, Stethoscope, PawPrint,
  Sparkles, Check, Calendar, Users, BarChart3, Shield,
  MessageSquare, Clock, ChevronRight, Send
} from 'lucide-react';
import { toast } from 'sonner';


function DemoModal({ open, onOpenChange }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      toast.error('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    // Simulate submission
    setTimeout(() => {
      setSubmitting(false);
      toast.success('Demo request submitted! We\'ll be in touch shortly.');
      setForm({ name: '', email: '', phone: '', message: '' });
      onOpenChange(false);
    }, 1000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
            Book a Demo
          </DialogTitle>
          <DialogDescription>
            Fill in your details and we'll schedule a personalized demo for your clinic.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="demo-name">Name <span className="text-red-500">*</span></Label>
            <Input
              id="demo-name"
              name="name"
              placeholder="Your full name"
              value={form.name}
              onChange={handleChange}
              data-testid="demo-name-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="demo-email">Email <span className="text-red-500">*</span></Label>
            <Input
              id="demo-email"
              name="email"
              type="email"
              placeholder="you@clinic.com"
              value={form.email}
              onChange={handleChange}
              data-testid="demo-email-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="demo-phone">Phone <span className="text-red-500">*</span></Label>
            <Input
              id="demo-phone"
              name="phone"
              type="tel"
              placeholder="+61 4XX XXX XXX"
              value={form.phone}
              onChange={handleChange}
              data-testid="demo-phone-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="demo-message">Message</Label>
            <Textarea
              id="demo-message"
              name="message"
              placeholder="Tell us about your clinic and what you're looking for..."
              rows={3}
              value={form.message}
              onChange={handleChange}
              data-testid="demo-message-input"
            />
          </div>
          <Button
            type="submit"
            disabled={submitting}
            data-testid="demo-submit-btn"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-full h-11 font-medium"
          >
            {submitting ? 'Submitting...' : 'Submit Enquiry'} {!submitting && <Send className="ml-2 h-4 w-4" />}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}


function Navbar({ onBookDemo }) {
  const [open, setOpen] = useState(false);
  return (
    <nav data-testid="landing-navbar" className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-slate-200/60">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <Zap className="h-8 w-8 text-blue-600" />
          <span className="text-xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope' }}>Zap AI</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          <a href="#solutions" className="text-sm font-medium text-slate-600 hover:text-blue-600">Solutions</a>
          <a href="#why-zap" className="text-sm font-medium text-slate-600 hover:text-blue-600">Why Zap AI</a>
          <a href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-blue-600">How It Works</a>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Button data-testid="nav-book-demo-btn" onClick={onBookDemo} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6">
            Book a Demo
          </Button>
        </div>
        <button className="md:hidden" onClick={() => setOpen(!open)} data-testid="mobile-menu-btn">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t px-6 py-4 space-y-3 bg-white">
          <a href="#solutions" className="block text-sm font-medium text-slate-600" onClick={() => setOpen(false)}>Solutions</a>
          <a href="#why-zap" className="block text-sm font-medium text-slate-600" onClick={() => setOpen(false)}>Why Zap AI</a>
          <a href="#how-it-works" className="block text-sm font-medium text-slate-600" onClick={() => setOpen(false)}>How It Works</a>
          <div className="pt-2">
            <Button onClick={() => { setOpen(false); onBookDemo(); }} className="w-full bg-blue-600 text-white">Book a Demo</Button>
          </div>
        </div>
      )}
    </nav>
  );
}

function HeroSection() {
  return (
    <section data-testid="hero-section" className="relative overflow-hidden bg-gradient-to-b from-blue-50/60 to-white">
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32">
        <div className="text-center max-w-3xl mx-auto">
          <Badge className="bg-blue-100 text-blue-700 border-blue-200 mb-6 rounded-full px-4 py-1.5">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" /> AI-Powered Clinic Automation
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-[1.1]" style={{ fontFamily: 'Manrope' }}>
            The Operating System<br />
            for <span className="text-blue-600">Modern Clinics</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Automate bookings, eliminate no-shows, and streamline patient communication — whether you run a human clinic or a pet clinic.
          </p>
          <div className="mt-8 flex justify-center">
            <a href="#solutions">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8 h-12 text-base shadow-lg shadow-blue-600/25">
                Explore Solutions <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
          </div>
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-slate-500">
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-green-500" /> No setup fees</span>
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-green-500" /> Cancel anytime</span>
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-green-500" /> 14-day free trial</span>
          </div>
        </div>
      </div>
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-blue-100/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-100/30 rounded-full blur-3xl pointer-events-none" />
    </section>
  );
}

function SolutionsSection() {
  const solutions = [
    {
      icon: PawPrint,
      title: 'Pet Clinic Management Solution',
      description: 'Purpose-built for veterinary clinics — manage pet profiles, owner records, vaccination schedules, appointment booking, and AI-powered customer communication all in one platform.',
      image: 'https://images.unsplash.com/photo-1755516966419-5e480ec7c7e7?crop=entropy&cs=srgb&fm=jpg&q=85&w=600',
      imageAlt: 'Veterinarian with a happy dog',
      features: ['Pet & Owner Profiles', 'Vaccination Tracking', 'Smart Scheduling', 'AI Chatbot'],
      link: '/pet-clinic',
      color: 'emerald',
      bgGradient: 'from-emerald-50 to-green-50/50',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      badgeBg: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      btnClass: 'bg-emerald-600 hover:bg-emerald-700',
    },
    {
      icon: Stethoscope,
      title: 'Human Clinic Management Solution',
      description: 'Designed for general practice, dental, dermatology, and specialty clinics — manage multi-doctor schedules, patient records, insurance, and automated follow-ups effortlessly.',
      image: 'https://images.unsplash.com/photo-1645066928295-2506defde470?crop=entropy&cs=srgb&fm=jpg&q=85&w=600',
      imageAlt: 'Doctor in a modern clinic',
      features: ['Patient Records', 'Multi-Doctor Scheduling', 'Auto Reminders', 'Analytics'],
      link: '/human-clinic',
      color: 'blue',
      bgGradient: 'from-blue-50 to-indigo-50/50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      badgeBg: 'bg-blue-100 text-blue-700 border-blue-200',
      btnClass: 'bg-blue-600 hover:bg-blue-700',
    },
  ];

  return (
    <section id="solutions" data-testid="solutions-section" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <Badge className="bg-blue-100 text-blue-700 border-blue-200 mb-4 rounded-full">Our Solutions</Badge>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope' }}>
            Choose Your Clinic Solution
          </h2>
          <p className="mt-4 text-base md:text-lg text-slate-600 max-w-2xl mx-auto">
            Two specialized platforms, each tailored to the unique workflows of your clinic type.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {solutions.map((s, i) => (
            <Link key={i} to={s.link} className="group block">
              <Card
                data-testid={`solution-card-${i}`}
                className={`overflow-hidden rounded-2xl border-slate-200/60 hover:shadow-xl hover:border-${s.color}-200 bg-gradient-to-br ${s.bgGradient}`}
                style={{ transition: 'box-shadow 0.3s ease, border-color 0.3s ease' }}
              >
                <div className="h-56 md:h-64 overflow-hidden">
                  <img
                    src={s.image}
                    alt={s.imageAlt}
                    className="w-full h-full object-cover group-hover:scale-105"
                    style={{ transition: 'transform 0.5s ease' }}
                  />
                </div>
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-11 h-11 rounded-lg ${s.iconBg} flex items-center justify-center`}>
                      <s.icon className={`h-5 w-5 ${s.iconColor}`} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>{s.title}</h3>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed mb-5">{s.description}</p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {s.features.map((f, j) => (
                      <Badge key={j} className={`${s.badgeBg} rounded-full text-xs`}>{f}</Badge>
                    ))}
                  </div>
                  <Button className={`${s.btnClass} text-white rounded-full px-6 h-10 text-sm font-medium shadow-sm group-hover:shadow-md`}
                    style={{ transition: 'box-shadow 0.3s ease' }}>
                    Explore Solution <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-0.5" style={{ transition: 'transform 0.2s ease' }} />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhyZapSection() {
  const reasons = [
    { icon: Sparkles, title: 'AI-Powered Automation', desc: 'Recover missed bookings, reduce no-shows by 40%, and automate patient communication — all hands-free.' },
    { icon: Clock, title: 'Save 15+ Hours/Week', desc: 'Eliminate manual booking, reminders, and follow-ups. Focus on patient care, not admin work.' },
    { icon: Calendar, title: 'Smart Scheduling', desc: 'Doctor-wise calendars with real-time availability, drag-drop management, and online booking.' },
    { icon: MessageSquare, title: '24/7 AI Assistant', desc: 'Website chat widget that books appointments, answers FAQs, and captures leads while you sleep.' },
    { icon: BarChart3, title: 'Actionable Analytics', desc: 'Track utilization, no-show rates, revenue trends, and staff performance in real time.' },
    { icon: Shield, title: 'Enterprise Security', desc: 'Isolated multi-tenant data, role-based access, and encrypted patient records.' },
  ];

  return (
    <section id="why-zap" data-testid="why-zap-section" className="py-24 bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <Badge className="bg-blue-100 text-blue-700 border-blue-200 mb-4 rounded-full">Why Zap AI</Badge>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope' }}>
            Built for clinics that want to grow
          </h2>
          <p className="mt-4 text-base md:text-lg text-slate-600 max-w-2xl mx-auto">
            From booking to billing, patient management to performance tracking — everything in one AI-powered platform.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reasons.map((r, i) => (
            <Card key={i} className="group rounded-xl border-slate-200/60 hover:border-blue-200 hover:shadow-md bg-white"
              style={{ transition: 'box-shadow 0.3s ease, border-color 0.3s ease' }}>
              <CardContent className="p-6">
                <div className="w-11 h-11 rounded-lg bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-100"
                  style={{ transition: 'background-color 0.2s ease' }}>
                  <r.icon className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">{r.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{r.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    { num: '01', title: 'Choose Your Solution', desc: 'Select Pet Clinic or Human Clinic management — each tailored to your specific workflows.' },
    { num: '02', title: 'We Set It Up', desc: 'Our engineers handle integration with your existing systems. No technical skills needed.' },
    { num: '03', title: 'Go Live in Days', desc: 'Start accepting bookings, sending reminders, and recovering missed revenue automatically.' },
  ];

  return (
    <section id="how-it-works" data-testid="how-it-works-section" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <Badge className="bg-blue-100 text-blue-700 border-blue-200 mb-4 rounded-full">How It Works</Badge>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope' }}>
            Up and running in 3 simple steps
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-xl font-bold mx-auto mb-6 shadow-lg shadow-blue-600/20">
                {step.num}
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3" style={{ fontFamily: 'Manrope' }}>{step.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection({ onBookDemo }) {
  return (
    <section data-testid="cta-section" className="py-24 bg-blue-600">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-white" style={{ fontFamily: 'Manrope' }}>
          Ready to Automate Your Clinic?
        </h2>
        <p className="mt-4 text-base text-blue-100 max-w-xl mx-auto">
          Book a free demo and see how Zap AI can recover missed bookings and streamline your operations.
        </p>
        <div className="mt-8">
          <Button size="lg" onClick={onBookDemo} data-testid="cta-book-demo-btn" className="bg-white text-blue-600 hover:bg-blue-50 rounded-full px-8 h-12 text-base font-semibold shadow-lg">
            Book a Demo <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer data-testid="footer" className="bg-slate-900 text-slate-400 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <Zap className="h-7 w-7 text-blue-500" />
              <span className="text-lg font-bold text-white" style={{ fontFamily: 'Manrope' }}>Zap AI</span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              AI-powered clinic management for modern healthcare and veterinary practices.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Solutions</h4>
            <div className="space-y-2">
              <Link to="/pet-clinic" className="block text-sm hover:text-white">Pet Clinic</Link>
              <Link to="/human-clinic" className="block text-sm hover:text-white">Human Clinic</Link>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Company</h4>
            <div className="space-y-2">
              <a href="#" className="block text-sm hover:text-white">About</a>
              <a href="#" className="block text-sm hover:text-white">Careers</a>
              <a href="#" className="block text-sm hover:text-white">Contact</a>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Resources</h4>
            <div className="space-y-2">
              <a href="#" className="block text-sm hover:text-white">Blog</a>
              <a href="#" className="block text-sm hover:text-white">FAQs</a>
              <a href="#" className="block text-sm hover:text-white">Terms of Service</a>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs">&copy; 2026 Zap AI, Inc. All rights reserved.</p>
          <div className="flex gap-6 text-xs">
            <a href="#" className="hover:text-white">Privacy Policy</a>
            <a href="#" className="hover:text-white">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  const [demoOpen, setDemoOpen] = useState(false);
  const openDemo = () => setDemoOpen(true);

  return (
    <div data-testid="landing-page" className="min-h-screen bg-white">
      <Navbar onBookDemo={openDemo} />
      <HeroSection />
      <SolutionsSection />
      <WhyZapSection />
      <HowItWorksSection />
      <CTASection onBookDemo={openDemo} />
      <Footer />
      <DemoModal open={demoOpen} onOpenChange={setDemoOpen} />
    </div>
  );
}
