import { useRef } from 'react'
import { 
  Building2, 
  Map, 
  Database, 
  BrainCircuit, 
  ChevronRight, 
  ShieldCheck, 
  Wallet,
  FileText
} from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { Button } from './components/ui/Button'
import { Card } from './components/ui/Card'

gsap.registerPlugin(useGSAP, ScrollTrigger)

function App() {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()

    mm.add(
      {
        reduceMotion: "(prefers-reduced-motion: reduce)",
        all: "(min-width: 0px)"
      },
      (context) => {
        const { reduceMotion } = context.conditions as { reduceMotion: boolean }

        if (reduceMotion) return

        // 1. Hero Entrance Sequence
        const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } })

        heroTl
          .from('.hero-badge', {
            y: -30,
            opacity: 0,
            duration: 0.7
          })
          .from('.hero-title', {
            y: 40,
            opacity: 0,
            duration: 0.9
          }, '-=0.4')
          .from('.hero-desc', {
            y: 30,
            opacity: 0,
            duration: 0.8
          }, '-=0.6')
          .from('.hero-actions', {
            y: 20,
            opacity: 0,
            duration: 0.7
          }, '-=0.5')

        // 2. Slow Ambient Material 3 Background Blob Animations (Hero Section)
        // Orb 1: Primary Purple Blob
        gsap.to('.hero-blob-1', {
          x: '30%',
          y: '20%',
          scale: 1.25,
          rotation: 45,
          duration: 9,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        })

        // Orb 2: Secondary Lavender Blob
        gsap.to('.hero-blob-2', {
          x: '-25%',
          y: '-30%',
          scale: 1.3,
          rotation: -60,
          duration: 11,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        })

        // Orb 3: Tertiary Mauve Center Pulse
        gsap.to('.hero-blob-3', {
          scale: 1.5,
          opacity: 0.3,
          duration: 7,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        })

        // 3. ScrollTrigger: Features Section Stagger Entrance
        gsap.fromTo('.features-header',
          { y: 40, autoAlpha: 0 },
          {
            scrollTrigger: {
              trigger: '#features',
              start: 'top 85%',
            },
            y: 0,
            autoAlpha: 1,
            duration: 0.8,
            ease: 'power3.out'
          }
        )

        gsap.fromTo('.module-card',
          { y: 50, autoAlpha: 0 },
          {
            scrollTrigger: {
              trigger: '#features',
              start: 'top 75%',
            },
            y: 0,
            autoAlpha: 1,
            duration: 0.8,
            stagger: 0.15,
            ease: 'power3.out'
          }
        )

        // 4. ScrollTrigger: Resettlement Process Steps
        gsap.fromTo('.process-header',
          { y: 40, autoAlpha: 0 },
          {
            scrollTrigger: {
              trigger: '#how-it-works',
              start: 'top 85%',
            },
            y: 0,
            autoAlpha: 1,
            duration: 0.8,
            ease: 'power3.out'
          }
        )

        gsap.fromTo('.process-step',
          { x: -40, autoAlpha: 0 },
          {
            scrollTrigger: {
              trigger: '.process-steps-container',
              start: 'top 80%',
            },
            x: 0,
            autoAlpha: 1,
            duration: 0.7,
            stagger: 0.2,
            ease: 'power3.out'
          }
        )
      }
    )
  }, { scope: containerRef })

  return (
    <div ref={containerRef} className="min-h-screen bg-md-background">
      {/* Navigation */}
      <nav className="px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-md-primary flex items-center justify-center text-md-on-primary font-bold text-lg">
            FCR
          </div>
          <span className="font-bold text-xl text-md-on-surface">FCR-SCS</span>
        </div>
        <div className="hidden md:flex items-center gap-6">
          <a href="#features" className="text-md-on-surface hover:text-md-primary transition-colors">Features</a>
          <a href="#how-it-works" className="text-md-on-surface hover:text-md-primary transition-colors">How it Works</a>
          <Button variant="outlined" size="sm">Login</Button>
          <Button variant="filled" size="sm">Register</Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-4 py-8 md:px-8 max-w-7xl mx-auto">
        <div className="relative bg-md-surface-container rounded-3xl md:rounded-3xl p-8 md:p-16 overflow-hidden">
          {/* Atmospheric Material 3 Ambient Blur Shapes */}
          <div className="hero-blob-1 absolute w-[450px] h-[450px] rounded-full bg-md-primary/30 blur-3xl top-0 left-0 -translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
          <div className="hero-blob-2 absolute w-[400px] h-[400px] rounded-full bg-md-secondary-container/80 blur-3xl bottom-0 right-0 translate-x-1/4 translate-y-1/4 pointer-events-none"></div>
          <div className="hero-blob-3 absolute w-[350px] h-[350px] rounded-full bg-md-tertiary/20 blur-3xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
          
          <div className="relative z-10 max-w-3xl">
            <div className="hero-badge inline-block px-4 py-1.5 rounded-full bg-md-secondary-container text-md-on-secondary-container text-sm font-medium mb-6">
              Empowering Communities in VM2026
            </div>
            <h1 className="hero-title text-4xl md:text-6xl font-bold leading-tight mb-6">
              Fair Compensation & Resettlement
            </h1>
            <p className="hero-desc text-lg md:text-xl text-md-on-surface-variant mb-10 max-w-2xl">
              A transparent, secure, and AI-driven smart contract system designed to support equitable land acquisition and relocation for communities affected by tourism infrastructure development.
            </p>
            <div className="hero-actions flex flex-wrap gap-4">
              <Button size="lg" className="gap-2">
                Get Started <ChevronRight size={20} />
              </Button>
              <Button variant="tonal" size="lg">
                View Public Ledger
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features/Modules Section */}
      <section id="features" className="py-20 px-6 max-w-7xl mx-auto">
        <div className="features-header text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Core System Modules</h2>
          <p className="text-md-on-surface-variant max-w-2xl mx-auto">
            Our comprehensive digital platform replaces paper-based workflows, introducing transparency and accountability through four integrated components.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Feature 1 */}
          <Card interactive elevation="sm" className="module-card flex flex-col h-full">
            <div className="w-14 h-14 rounded-2xl bg-md-primary/10 flex items-center justify-center text-md-primary mb-6 group-hover:scale-110 transition-transform duration-300">
              <Building2 size={28} />
            </div>
            <h3 className="text-xl font-bold mb-3">User & Dashboard</h3>
            <p className="text-md-on-surface-variant text-sm flex-grow">
              Centralized platform for administrators, government officers, and community members to track claims and statistics.
            </p>
          </Card>

          {/* Feature 2 */}
          <Card interactive elevation="sm" className="module-card flex flex-col h-full md:-translate-y-4 shadow-md ring-2 ring-md-primary/10">
            <div className="w-14 h-14 rounded-2xl bg-md-tertiary/10 flex items-center justify-center text-md-tertiary mb-6 group-hover:scale-110 transition-transform duration-300">
              <Map size={28} />
            </div>
            <h3 className="text-xl font-bold mb-3">Land Acquisition</h3>
            <p className="text-md-on-surface-variant text-sm flex-grow">
              Digital assessment of physical assets, buildings, and crop values by field officers to ensure precise valuation records.
            </p>
          </Card>

          {/* Feature 3 */}
          <Card interactive elevation="sm" className="module-card flex flex-col h-full">
            <div className="w-14 h-14 rounded-2xl bg-md-secondary-container flex items-center justify-center text-md-on-secondary-container mb-6 group-hover:scale-110 transition-transform duration-300">
              <ShieldCheck size={28} />
            </div>
            <h3 className="text-xl font-bold mb-3">Blockchain Ledger</h3>
            <p className="text-md-on-surface-variant text-sm flex-grow">
              Immutable Ethereum-based records of finalized compensation agreements protecting data integrity and privacy.
            </p>
          </Card>

          {/* Feature 4 */}
          <Card interactive elevation="sm" className="module-card flex flex-col h-full">
            <div className="w-14 h-14 rounded-2xl bg-[#6750A4]/10 flex items-center justify-center text-[#6750A4] mb-6 group-hover:scale-110 transition-transform duration-300">
              <BrainCircuit size={28} />
            </div>
            <h3 className="text-xl font-bold mb-3">AI Valuation</h3>
            <p className="text-md-on-surface-variant text-sm flex-grow">
              Machine learning models to forecast fair economic values of trade assets and livelihood replacement costs.
            </p>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 relative overflow-hidden bg-md-surface-container-low">
        {/* Background Decorative Blob */}
        <div className="blur-shape-secondary absolute w-[700px] h-[700px] rounded-full bg-md-secondary-container/60 blur-3xl top-1/2 right-0 translate-x-1/3 -translate-y-1/2 pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="process-header mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">The Resettlement Process</h2>
            <p className="text-md-on-surface-variant max-w-2xl">
              A streamlined, transparent digital workflow ensuring fairness at every step of the land acquisition process.
            </p>
          </div>

          <div className="process-steps-container space-y-6">
            {/* Step 1 */}
            <div className="process-step flex flex-col md:flex-row gap-6 items-start group">
              <div className="flex-shrink-0 w-16 h-16 rounded-full bg-md-surface-container flex items-center justify-center text-2xl font-bold text-md-primary shadow-sm group-hover:shadow-md transition-shadow relative">
                <div className="absolute inset-0 rounded-full bg-md-primary/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
                1
              </div>
              <Card interactive className="flex-grow bg-white/40 backdrop-blur-sm border border-white/20">
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="text-md-primary" size={24} />
                  <h4 className="text-xl font-bold">Case Registration</h4>
                </div>
                <p className="text-md-on-surface-variant">Government officers register new acquisition cases with comprehensive field data and digital identities of displaced residents.</p>
              </Card>
            </div>

            {/* Step 2 */}
            <div className="process-step flex flex-col md:flex-row gap-6 items-start group">
              <div className="flex-shrink-0 w-16 h-16 rounded-full bg-md-surface-container flex items-center justify-center text-2xl font-bold text-md-primary shadow-sm group-hover:shadow-md transition-shadow relative">
                <div className="absolute inset-0 rounded-full bg-md-primary/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
                2
              </div>
              <Card interactive className="flex-grow bg-white/40 backdrop-blur-sm border border-white/20">
                <div className="flex items-center gap-3 mb-2">
                  <BrainCircuit className="text-md-primary" size={24} />
                  <h4 className="text-xl font-bold">AI Assessment & Review</h4>
                </div>
                <p className="text-md-on-surface-variant">AI models estimate fair value considering physical and livelihood loss, assisting valuers in finalising objective compensation figures.</p>
              </Card>
            </div>

            {/* Step 3 */}
            <div className="process-step flex flex-col md:flex-row gap-6 items-start group">
              <div className="flex-shrink-0 w-16 h-16 rounded-full bg-md-surface-container flex items-center justify-center text-2xl font-bold text-md-primary shadow-sm group-hover:shadow-md transition-shadow relative">
                <div className="absolute inset-0 rounded-full bg-md-primary/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
                3
              </div>
              <Card interactive className="flex-grow bg-white/40 backdrop-blur-sm border border-white/20">
                <div className="flex items-center gap-3 mb-2">
                  <Wallet className="text-md-primary" size={24} />
                  <h4 className="text-xl font-bold">Settlement & Verification</h4>
                </div>
                <p className="text-md-on-surface-variant">Secure bank transfers are executed off-chain. The system verifies payment completion to prevent delays.</p>
              </Card>
            </div>
            
            {/* Step 4 */}
            <div className="process-step flex flex-col md:flex-row gap-6 items-start group">
              <div className="flex-shrink-0 w-16 h-16 rounded-full bg-md-primary flex items-center justify-center text-2xl font-bold text-md-on-primary shadow-md relative">
                <div className="absolute inset-0 rounded-full bg-md-primary/40 blur-lg opacity-100"></div>
                4
              </div>
              <Card interactive className="flex-grow bg-white/40 backdrop-blur-sm border border-white/20">
                <div className="flex items-center gap-3 mb-2">
                  <Database className="text-md-primary" size={24} />
                  <h4 className="text-xl font-bold">Immutable Audit Trail</h4>
                </div>
                <p className="text-md-on-surface-variant">Cryptographic hashes of agreements are committed to the Ethereum blockchain, ensuring permanent, tamper-resistant records.</p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA / Footer */}
      <footer className="bg-md-on-surface text-md-background py-20 px-6 text-center relative overflow-hidden">
        {/* Subtle, non-spinning ambient glow for footer */}
        <div className="absolute w-[800px] h-[800px] rounded-full bg-md-primary/20 blur-3xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div className="max-w-3xl mx-auto relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Ensure Fair Compensation Today</h2>
          <p className="text-md-outline mb-10 text-lg">
            Join the digital transformation of land acquisition management. Check your case status or register as a new administrator.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" className="w-full sm:w-auto bg-md-primary-container text-md-on-primary hover:bg-white text-black transition-colors">
              Check Claim Status
            </Button>
            <Button variant="outlined" size="lg" className="w-full sm:w-auto border-md-outline text-white hover:bg-white/10">
              Admin Portal
            </Button>
          </div>
          <div className="mt-20 pt-8 border-t border-white/10 text-sm text-md-outline flex flex-col md:flex-row justify-between items-center gap-4">
            <p>&copy; 2026 FCR-SCS. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Contact Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
