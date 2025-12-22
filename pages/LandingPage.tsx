import React from 'react';
import { useApp } from '../context/AppContext';
import { ViewState } from '../types';

export const LandingPage: React.FC = () => {
  const { setView } = useApp();

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const logos = [
      { name: "University of Cambridge", icon: "🏛️" },
      { name: "Department for Education", icon: "👑" },
      { name: "Ofsted Framework", icon: "📋" },
      { name: "University College London", icon: "🔬" },
      { name: "King's College", icon: "🦁" },
      { name: "National Curriculum", icon: "🇬🇧" },
      { name: "Oxford Education", icon: "🎓" },
      { name: "Cognitive Science Society", icon: "🧠" }
  ];

  return (
    <div className="min-h-screen bg-[#0b1527] text-white font-sans selection:bg-scholafy-accent selection:text-scholafy-panel overflow-x-hidden scroll-smooth">
      
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0b1527]/90 backdrop-blur-lg border-b border-white/5 shadow-2xl transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer group animate-in slide-in-from-top-2 duration-500" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
                <div className="w-8 h-8 md:w-10 md:h-10 bg-scholafy-accent rounded-lg flex items-center justify-center text-scholafy-navy font-bold text-lg md:text-xl shadow-[0_0_15px_rgba(243,197,0,0.3)] group-hover:scale-110 transition-transform">S</div>
                <span className="text-xl md:text-2xl font-bold tracking-tight">Scholafy</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-scholafy-muted animate-in slide-in-from-top-2 duration-700">
                <button onClick={() => scrollTo('science')} className="hover:text-white hover:text-scholafy-accent transition-colors">Flow Lock™</button>
                <button onClick={() => scrollTo('curriculum')} className="hover:text-white hover:text-scholafy-accent transition-colors">Mastery</button>
                <button onClick={() => scrollTo('mission')} className="hover:text-white hover:text-scholafy-accent transition-colors">Our Mission</button>
                <button onClick={() => scrollTo('pricing')} className="hover:text-white hover:text-scholafy-accent transition-colors">Pricing</button>
            </div>

            <button 
                onClick={() => setView(ViewState.ROLE_SELECT)}
                className="animate-in slide-in-from-top-2 duration-1000 bg-white/10 hover:bg-white/20 border border-white/10 px-4 md:px-6 py-1.5 md:py-2 rounded-full text-sm md:text-base font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg"
            >
                Login
            </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-28 pb-16 md:pt-52 md:pb-32 px-4 md:px-6 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[80px] md:blur-[120px] pointer-events-none animate-pulse-slow" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-scholafy-accent/5 rounded-full blur-[80px] md:blur-[120px] pointer-events-none animate-pulse-slow" style={{animationDelay: '1.5s'}} />

        <div className="max-w-5xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1 md:px-4 md:py-1.5 mb-6 md:mb-8 animate-fade-in-up" style={{animationDelay: '0.1s'}}>
                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-white/80">The Homeschool Revolution</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold leading-tight mb-6 md:mb-8 drop-shadow-lg animate-fade-in-up" style={{animationDelay: '0.3s'}}>
                The Curriculum is Ours.<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-scholafy-accent to-yellow-200">The Confidence is Yours.</span>
            </h1>
            
            <p className="text-lg md:text-2xl text-scholafy-muted max-w-2xl mx-auto mb-8 md:mb-12 leading-relaxed px-2 animate-fade-in-up" style={{animationDelay: '0.5s'}}>
                Homeschoolers have been an afterthought for too long. We built the only platform that uses <strong>Proprietary Flow Lock™</strong> technology to guarantee learning, so you can stop worrying if you're "doing enough".
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up" style={{animationDelay: '0.7s'}}>
                <button 
                    onClick={() => setView(ViewState.ROLE_SELECT)}
                    className="w-full sm:w-auto px-8 py-3 md:py-4 bg-scholafy-accent text-scholafy-panel font-bold text-base md:text-lg rounded-xl hover:bg-yellow-400 hover:scale-105 transition-all shadow-[0_0_30px_rgba(243,197,0,0.3)]"
                >
                    Start Your 14-Day Trial
                </button>
                <button onClick={() => scrollTo('science')} className="w-full sm:w-auto px-8 py-3 md:py-4 bg-white/5 text-white font-bold text-base md:text-lg rounded-xl hover:bg-white/10 border border-white/10 transition-all">
                    How Flow Lock™ Works
                </button>
            </div>
            <p className="mt-6 text-xs md:text-sm text-scholafy-muted/60 animate-fade-in-up" style={{animationDelay: '0.9s'}}>Do what you are good at as a parent. Let Scholafy do the rest.</p>
        </div>
      </section>

      {/* INSTITUTION CAROUSEL */}
      <section className="py-8 bg-[#0b1527] border-y border-white/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b1527] via-transparent to-[#0b1527] z-10 pointer-events-none"></div>
          
          <div className="flex overflow-hidden">
             {/* Track - We duplicate the list to ensure seamless looping */}
             <div className="flex gap-16 md:gap-24 animate-scroll px-12 items-center">
                 {[...logos, ...logos, ...logos].map((logo, idx) => (
                     <div key={idx} className="flex items-center gap-3 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300 flex-shrink-0 cursor-default group">
                         <span className="text-2xl md:text-3xl filter drop-shadow-lg group-hover:scale-110 transition-transform">{logo.icon}</span>
                         <span className="font-bold text-sm md:text-base tracking-tight whitespace-nowrap">{logo.name}</span>
                     </div>
                 ))}
             </div>
          </div>
          <div className="text-center mt-4 text-[10px] md:text-xs text-scholafy-muted uppercase tracking-widest opacity-40">
              Research-Backed Pedagogy aligned with UK National Standards
          </div>
      </section>

      {/* SECTION: The Science (Methodology) */}
      <section id="science" className="py-16 md:py-24 bg-[#08101f] relative">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
              <div className="text-center mb-12 md:mb-16">
                  <h2 className="text-scholafy-accent font-bold tracking-widest uppercase text-xs md:text-sm mb-2">Cognitive Science</h2>
                  <h3 className="text-2xl md:text-5xl font-bold text-white mb-4 md:mb-6">The "No-Drift" Protocol.</h3>
                  <p className="max-w-3xl mx-auto text-scholafy-muted text-base md:text-lg">
                      Passive video apps create an "illusion of competence". Our research-backed pedagogy manages cognitive load to ensure deep retention, not just shallow recognition.
                  </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                  <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-2xl relative overflow-hidden group hover:border-scholafy-accent/30 transition-colors hover:-translate-y-2 duration-300">
                      <div className="absolute top-0 right-0 p-16 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors"></div>
                      <div className="text-3xl md:text-4xl mb-4 md:mb-6 group-hover:scale-110 transition-transform origin-left">🔒</div>
                      <h4 className="text-lg md:text-xl font-bold mb-3">Proprietary Flow Lock™</h4>
                      <p className="text-scholafy-muted leading-relaxed text-sm md:text-base">
                          Our engine mechanically locks progress at critical cognitive thresholds. It diagnoses attention in real-time. If the concept isn't mastered, the video doesn't move. No gaps. No skipping.
                      </p>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-2xl relative overflow-hidden group hover:border-scholafy-accent/30 transition-colors hover:-translate-y-2 duration-300 delay-100">
                      <div className="absolute top-0 right-0 p-16 bg-yellow-500/5 rounded-full blur-2xl group-hover:bg-yellow-500/10 transition-colors"></div>
                      <div className="text-3xl md:text-4xl mb-4 md:mb-6 group-hover:scale-110 transition-transform origin-left">🧠</div>
                      <h4 className="text-lg md:text-xl font-bold mb-3">Cognitive Load Management</h4>
                      <p className="text-scholafy-muted leading-relaxed text-sm md:text-base">
                         We break statutory requirements into micro-skills. We use <strong>interleaved practice</strong> to force active retrieval from memory, cementing the neural pathway before anxiety sets in.
                      </p>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-2xl relative overflow-hidden group hover:border-scholafy-accent/30 transition-colors hover:-translate-y-2 duration-300 delay-200">
                      <div className="absolute top-0 right-0 p-16 bg-green-500/5 rounded-full blur-2xl group-hover:bg-green-500/10 transition-colors"></div>
                      <div className="text-3xl md:text-4xl mb-4 md:mb-6 group-hover:scale-110 transition-transform origin-left">📊</div>
                      <h4 className="text-lg md:text-xl font-bold mb-3">Forensic Diagnosis</h4>
                      <p className="text-scholafy-muted leading-relaxed text-sm md:text-base">
                          Eliminate the "Mastery Gap". Our diagnostics precisely identify if your child is Working Towards, Expected, or Greater Depth standard. You get the data a Headteacher would kill for.
                      </p>
                  </div>
              </div>
          </div>
      </section>

      {/* SECTION: The Mission (New) */}
      <section id="mission" className="py-20 md:py-32 bg-scholafy-card relative overflow-hidden group">
          <div className="absolute inset-0 bg-blue-600/5 group-hover:bg-blue-600/10 transition-colors duration-700"></div>
          <div className="max-w-4xl mx-auto px-4 md:px-6 relative z-10 text-center">
              <h2 className="text-scholafy-accent font-bold tracking-widest uppercase text-xs md:text-sm mb-4">Why We Built This</h2>
              <h3 className="text-3xl md:text-5xl font-bold text-white mb-8 leading-tight">Educational software is usually built for schools, then sold to you as an afterthought.</h3>
              <p className="text-xl md:text-2xl text-scholafy-muted mb-10 leading-relaxed font-light">
                  That's why it fails at home. You don't need a digital classroom management tool. You need a <strong>co-pilot</strong>. 
                  Scholafy was built from the ground up to solve the specific anxieties of the homeschooling pioneer: <em className="text-white not-italic">"Is my child on track? Am I failing them?"</em>
              </p>
              <div className="inline-block border-l-4 border-scholafy-accent pl-6 text-left transform hover:translate-x-2 transition-transform duration-300">
                  <p className="text-white italic text-lg md:text-xl">
                      "We aim to remove the overwhelm. Accurately diagnose where your child sits against the National Curriculum, let the Flow Lock™ handle the pedagogy, and get back to enjoying being a parent."
                  </p>
                  <p className="text-scholafy-muted mt-2 font-bold uppercase text-xs tracking-widest">— The Scholafy Team</p>
              </div>
          </div>
      </section>

      {/* SECTION: Curriculum */}
      <section id="curriculum" className="py-16 md:py-24 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
              <div className="flex flex-col lg:flex-row items-start gap-12 md:gap-16">
                  <div className="flex-1 sticky top-24">
                      <h2 className="text-scholafy-accent font-bold tracking-widest uppercase text-xs md:text-sm mb-2">Diagnostic Precision</h2>
                      <h3 className="text-2xl md:text-4xl font-bold mb-6">Leave "Year Groups" Behind.<br/>Focus on Mastery.</h3>
                      <p className="text-scholafy-muted text-base md:text-lg mb-8">
                          The stress of "falling behind" disappears when you have accurate data. Our system adapts. If they need to revisit Year 3 fractions while crushing Year 5 geometry, Scholafy handles it seamlessly.
                      </p>
                      
                      <div className="space-y-4">
                          <SubjectRow 
                            subject="Mathematics" 
                            desc="Concrete, Pictorial, Abstract. From Number Bonds to Algebra." 
                            color="bg-blue-500" 
                          />
                          <SubjectRow 
                            subject="English" 
                            desc="Systematic Synthetic Phonics to Advanced Comprehension." 
                            color="bg-yellow-500" 
                          />
                          <SubjectRow 
                            subject="Science" 
                            desc="Empirical enquiry. Biology, Chemistry, and Physics foundations." 
                            color="bg-green-500" 
                          />
                      </div>
                  </div>
                  
                  <div className="flex-1 w-full">
                      {/* Interactive-looking Curriculum Card */}
                      <div className="bg-scholafy-card border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl relative hover:border-scholafy-accent/30 transition-colors duration-500 group">
                          <div className="absolute -top-3 -right-3 md:-top-4 md:-right-4 bg-scholafy-accent text-scholafy-panel font-bold px-3 py-1 md:px-4 md:py-2 rounded-lg shadow-lg transform rotate-3 z-10 text-xs md:text-sm group-hover:rotate-6 transition-transform">
                              SATs Ready
                          </div>
                          
                          <div className="space-y-6">
                              <div className="border-b border-white/10 pb-4">
                                  <div className="flex justify-between items-center mb-2">
                                      <span className="font-bold text-base md:text-lg text-blue-400">📐 Mathematics (Mastery)</span>
                                      <span className="text-xs text-white/50">142 Lessons</span>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                      {['Fractions & Decimals', 'Properties of Shape', 'Multi-step Problems', 'Prime Numbers'].map(tag => (
                                          <span key={tag} className="bg-blue-500/10 text-blue-300 text-[10px] md:text-xs px-2 py-1 rounded border border-blue-500/20">{tag}</span>
                                      ))}
                                  </div>
                              </div>

                              <div className="border-b border-white/10 pb-4">
                                  <div className="flex justify-between items-center mb-2">
                                      <span className="font-bold text-base md:text-lg text-yellow-400">📝 English (Mastery)</span>
                                      <span className="text-xs text-white/50">98 Lessons</span>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                      {['Relative Clauses', 'Modal Verbs', 'Parenthesis', 'Persuasive Writing'].map(tag => (
                                          <span key={tag} className="bg-yellow-500/10 text-yellow-300 text-[10px] md:text-xs px-2 py-1 rounded border border-yellow-500/20">{tag}</span>
                                      ))}
                                  </div>
                              </div>

                              <div>
                                  <div className="flex justify-between items-center mb-2">
                                      <span className="font-bold text-base md:text-lg text-green-400">🧪 Science (Mastery)</span>
                                      <span className="text-xs text-white/50">64 Lessons</span>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                      {['Forces & Gravity', 'Earth & Space', 'Materials', 'Life Cycles'].map(tag => (
                                          <span key={tag} className="bg-green-500/10 text-green-300 text-[10px] md:text-xs px-2 py-1 rounded border border-green-500/20">{tag}</span>
                                      ))}
                                  </div>
                              </div>
                          </div>

                          <div className="mt-8 bg-white/5 rounded-xl p-4 flex items-start md:items-center gap-4 group-hover:bg-white/10 transition-colors">
                              <div className="w-8 h-8 md:w-10 md:h-10 bg-scholafy-accent rounded-full flex-shrink-0 flex items-center justify-center text-scholafy-panel font-bold text-sm">✓</div>
                              <p className="text-xs md:text-sm text-scholafy-muted">
                                  <strong>Adaptive Difficulty:</strong> Students who ace the diagnostics get fast-tracked. No bored genius kids. No overwhelmed strugglers.
                              </p>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </section>

      {/* SECTION: Testimonials */}
      <section id="testimonials" className="py-16 md:py-24 bg-[#08101f] border-t border-white/5">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
              <div className="text-center mb-12 md:mb-16">
                  <h2 className="text-scholafy-accent font-bold tracking-widest uppercase text-xs md:text-sm mb-2">Social Proof</h2>
                  <h3 className="text-2xl md:text-5xl font-bold text-white">We Ended The "Did You Do It?" Argument.</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                  <TestimonialCard 
                    quote="Finally, an app that treats homeschooling seriously. The Flow Lock feature means I know he isn't just skipping through videos while I'm on a call."
                    author="Sarah J."
                    role="Parent of Year 4 Student"
                    stars={5}
                  />
                  <TestimonialCard 
                    quote="Most apps are 'games' disguised as learning. This is rigorous. It's hard. But my daughter is actually passing her mock papers now."
                    author="David P."
                    role="Ex-Teacher & Homeschooler"
                    stars={5}
                  />
                  <TestimonialCard 
                    quote="The live monitoring is scary good. I can see from work when he's stuck on a question and text him to help. It changed our relationship."
                    author="Marcus K."
                    role="Parent of Year 6 Student"
                    stars={5}
                  />
              </div>
          </div>
      </section>

      {/* SECTION: Pricing */}
      <section id="pricing" className="py-16 md:py-24 relative">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
              <div className="text-center mb-12 md:mb-16">
                  <h2 className="text-scholafy-accent font-bold tracking-widest uppercase text-xs md:text-sm mb-2">Invest in Certainty</h2>
                  <h3 className="text-2xl md:text-5xl font-bold text-white mb-6">Cheaper than a Tutor.<br/>Smarter than a Workbook.</h3>
                  <p className="text-scholafy-muted text-base md:text-lg">Cancel anytime. 14-day money-back guarantee.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
                  
                  {/* Basic */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 flex flex-col hover:-translate-y-2 transition-transform duration-300">
                      <h4 className="text-lg md:text-xl font-bold text-scholafy-muted mb-2">Basic</h4>
                      <div className="text-3xl md:text-4xl font-bold text-white mb-6">Free<span className="text-base md:text-lg text-white/50 font-normal"> / 14 days</span></div>
                      <ul className="space-y-4 mb-8 flex-1">
                          <li className="flex items-center gap-2 text-sm text-scholafy-muted"><span className="text-green-500">✓</span> Year 3 Maths Access</li>
                          <li className="flex items-center gap-2 text-sm text-scholafy-muted"><span className="text-green-500">✓</span> Basic Reporting</li>
                          <li className="flex items-center gap-2 text-sm text-scholafy-muted"><span className="text-green-500">✓</span> 1 Child Profile</li>
                      </ul>
                      <button onClick={() => setView(ViewState.ROLE_SELECT)} className="w-full py-3 rounded-lg border border-white/20 hover:bg-white/10 transition-colors font-bold">Start Trial</button>
                  </div>

                  {/* Scholar (Featured) */}
                  <div className="bg-scholafy-card border border-scholafy-accent rounded-2xl p-6 md:p-8 flex flex-col transform md:-translate-y-4 shadow-[0_0_50px_rgba(243,197,0,0.1)] relative hover:-translate-y-6 transition-transform duration-300">
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-scholafy-accent text-scholafy-panel text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider animate-pulse">Best Value</div>
                      <h4 className="text-lg md:text-xl font-bold text-scholafy-accent mb-2">Scholar</h4>
                      <div className="text-3xl md:text-4xl font-bold text-white mb-6">£29<span className="text-base md:text-lg text-white/50 font-normal"> / mo</span></div>
                      <p className="text-xs text-scholafy-muted mb-6">The complete accountability suite.</p>
                      <ul className="space-y-4 mb-8 flex-1">
                          <li className="flex items-center gap-2 text-sm text-white"><span className="text-scholafy-accent">✓</span> <strong>Unlimited</strong> Curriculum Access</li>
                          <li className="flex items-center gap-2 text-sm text-white"><span className="text-scholafy-accent">✓</span> Live "Parent Peek" Monitoring</li>
                          <li className="flex items-center gap-2 text-sm text-white"><span className="text-scholafy-accent">✓</span> Automated Teacher Feedback</li>
                          <li className="flex items-center gap-2 text-sm text-white"><span className="text-scholafy-accent">✓</span> <strong>Flow Lock™</strong> Technology</li>
                      </ul>
                      <button onClick={() => setView(ViewState.ROLE_SELECT)} className="w-full py-3 rounded-lg bg-scholafy-accent text-scholafy-panel hover:bg-yellow-400 transition-colors font-bold shadow-lg">Get Started</button>
                  </div>

                  {/* Institution */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 flex flex-col hover:-translate-y-2 transition-transform duration-300">
                      <h4 className="text-lg md:text-xl font-bold text-scholafy-muted mb-2">Tutors & Schools</h4>
                      <div className="text-3xl md:text-4xl font-bold text-white mb-6">Custom</div>
                      <ul className="space-y-4 mb-8 flex-1">
                          <li className="flex items-center gap-2 text-sm text-scholafy-muted"><span className="text-green-500">✓</span> Bulk Student Management</li>
                          <li className="flex items-center gap-2 text-sm text-scholafy-muted"><span className="text-green-500">✓</span> White-label Portal</li>
                          <li className="flex items-center gap-2 text-sm text-scholafy-muted"><span className="text-green-500">✓</span> API Integration</li>
                      </ul>
                      <button className="w-full py-3 rounded-lg border border-white/20 hover:bg-white/10 transition-colors font-bold">Contact Sales</button>
                  </div>

              </div>
          </div>
      </section>

      {/* Footer */}
      <footer className="py-12 md:py-16 bg-[#050a14] border-t border-white/5 text-sm">
          <div className="max-w-7xl mx-auto px-4 md:px-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-12">
              <div className="col-span-1 sm:col-span-2 md:col-span-1">
                  <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-scholafy-accent rounded flex items-center justify-center text-scholafy-navy font-bold">S</div>
                      <span className="text-xl font-bold">Scholafy</span>
                  </div>
                  <p className="text-scholafy-muted leading-relaxed mb-4">
                      Delegated teaching with absolute accountability. Built in London for the modern homeschooling family.
                  </p>
                  <p className="text-white font-bold italic">
                      "Do what you are good at as a parent. Let Scholafy do the rest."
                  </p>
              </div>
              
              <div>
                  <h4 className="font-bold text-white mb-4">Platform</h4>
                  <ul className="space-y-2 text-scholafy-muted">
                      <li><a href="#" className="hover:text-scholafy-accent transition-colors">The "Flow Lock™" Protocol</a></li>
                      <li><a href="#" className="hover:text-scholafy-accent transition-colors">Live Monitoring</a></li>
                      <li><a href="#" className="hover:text-scholafy-accent transition-colors">Curriculum Mapping</a></li>
                      <li><a href="#" className="hover:text-scholafy-accent transition-colors">Pricing</a></li>
                  </ul>
              </div>

              <div>
                  <h4 className="font-bold text-white mb-4">Resources</h4>
                  <ul className="space-y-2 text-scholafy-muted">
                      <li><a href="#" className="hover:text-scholafy-accent transition-colors">Help Center</a></li>
                      <li><a href="#" className="hover:text-scholafy-accent transition-colors">Homeschooling Guide</a></li>
                      <li><a href="#" className="hover:text-scholafy-accent transition-colors">Blog</a></li>
                      <li><a href="#" className="hover:text-scholafy-accent transition-colors">Community</a></li>
                  </ul>
              </div>

              <div>
                  <h4 className="font-bold text-white mb-4">Legal</h4>
                  <ul className="space-y-2 text-scholafy-muted">
                      <li><a href="#" className="hover:text-scholafy-accent transition-colors">Privacy Policy</a></li>
                      <li><a href="#" className="hover:text-scholafy-accent transition-colors">Terms of Service</a></li>
                      <li><a href="#" className="hover:text-scholafy-accent transition-colors">Cookie Policy</a></li>
                      <li><a href="#" className="hover:text-scholafy-accent transition-colors">Safeguarding</a></li>
                  </ul>
              </div>
          </div>
          <div className="text-center text-scholafy-muted/50 pt-8 border-t border-white/5 text-xs md:text-sm">
              &copy; 2024 Scholafy Education Ltd. All rights reserved.
          </div>
      </footer>
    </div>
  );
};

const FeatureCard: React.FC<{ icon: string, title: string, desc: string }> = ({ icon, title, desc }) => (
    <div className="bg-white/5 border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-colors group">
        <div className="text-4xl mb-4 group-hover:scale-110 transition-transform origin-left">{icon}</div>
        <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
        <p className="text-scholafy-muted leading-relaxed">{desc}</p>
    </div>
);

const SubjectRow: React.FC<{ subject: string, desc: string, color: string }> = ({ subject, desc, color }) => (
    <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/20 transition-colors">
        <div className={`w-3 h-12 rounded-full ${color} flex-shrink-0`}></div>
        <div>
            <h4 className="font-bold text-lg text-white">{subject}</h4>
            <p className="text-sm text-scholafy-muted">{desc}</p>
        </div>
    </div>
);

const TestimonialCard: React.FC<{ quote: string, author: string, role: string, stars: number }> = ({ quote, author, role, stars }) => (
    <div className="bg-[#0b1527] border border-white/10 p-6 md:p-8 rounded-2xl relative shadow-xl hover:-translate-y-2 transition-transform duration-300">
        <div className="text-scholafy-accent text-2xl mb-4">
            {"★".repeat(stars)}
        </div>
        <p className="text-white/80 italic mb-6 leading-relaxed text-sm md:text-base">"{quote}"</p>
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center font-bold text-scholafy-muted">{author.charAt(0)}</div>
            <div>
                <div className="font-bold text-white">{author}</div>
                <div className="text-xs text-scholafy-muted uppercase">{role}</div>
            </div>
        </div>
    </div>
);