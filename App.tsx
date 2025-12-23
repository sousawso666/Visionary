
import React, { useState, useEffect } from 'react';
import { ToolType, GeneratedContent, AspectRatio, Language, User, UserTier, ImageStyle } from './types';
import { geminiService } from './services/geminiService';
import { dbService } from './services/dbService';
import { Button } from './components/Button';
import { translations } from './locales';

const PAYMENT_LINKS = {
  start: "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=4b07242350ed4f3fbdea8ced409eb9b2",
  pro: "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=d79b85e2a5ca476aaa63b6a24ebe46b3"
};

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('pt');
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');
  
  const [activeTool, setActiveTool] = useState<ToolType>(ToolType.IMAGE_GEN);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<GeneratedContent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [selectedStyle, setSelectedStyle] = useState<ImageStyle>('none');
  const [useHighQuality, setUseHighQuality] = useState(false);

  const t = translations[lang];

  useEffect(() => {
    const initializeApp = async () => {
      const savedEmail = localStorage.getItem('visionary_active_session');
      if (savedEmail) {
        const dbUser = await dbService.getUser(savedEmail);
        if (dbUser) {
          setUser(dbUser);
          if (dbUser.tier !== 'pro') await dbService.cleanup();
          setHistory(await dbService.getAll());
        }
      }
    };
    initializeApp();
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'signup') {
      const newUser: User = { email: authEmail, name: authEmail.split('@')[0], tier: 'free', usage: { imagesGenerated: 0, videosGenerated: 0 } };
      await dbService.saveUser(newUser);
      setAuthMode('login');
      showToast("Conta criada!");
    } else {
      const dbUser = await dbService.getUser(authEmail);
      if (dbUser) {
        setUser(dbUser);
        localStorage.setItem('visionary_active_session', authEmail);
        setHistory(await dbService.getAll());
      } else setError("Usuário não encontrado.");
    }
  };

  const handleProcess = async () => {
    if (!user || !prompt) return;
    setIsLoading(true);
    setError(null);
    try {
      let result: string;
      let type: 'image' | 'text' | 'video' = 'image';
      
      switch (activeTool) {
        case ToolType.IMAGE_GEN:
          result = await geminiService.generateImage(prompt, aspectRatio, selectedStyle, useHighQuality);
          break;
        case ToolType.STORY_GEN:
          result = await geminiService.generateStory(prompt);
          type = 'text';
          break;
        case ToolType.VIDEO_GEN:
          type = 'video';
          const videoUri = await geminiService.generateVideo(prompt, undefined, (aspectRatio === '9:16' ? '9:16' : '16:9'));
          result = `${videoUri}&key=${process.env.API_KEY}`;
          break;
        default: throw new Error("Ferramenta em desenvolvimento.");
      }
      
      const newContent: GeneratedContent = { id: Date.now().toString(), type, content: result, prompt, timestamp: Date.now() };
      await dbService.save(newContent);
      setHistory(prev => [newContent, ...prev]);
      setPrompt('');
      showToast("Criação finalizada!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 font-sans">
        <div className="glass max-w-md w-full rounded-[3rem] p-12 border border-white/5 space-y-10 text-center">
          <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] mx-auto flex items-center justify-center font-bold text-4xl text-white shadow-2xl shadow-indigo-600/30">V</div>
          <div className="space-y-3">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">{authMode === 'login' ? t.loginTitle : t.signupTitle}</h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-[0.4em] font-bold">{t.loginSubtext}</p>
          </div>
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-6 py-4 text-white outline-none focus:border-indigo-500/50 transition-all placeholder-zinc-700 text-sm" placeholder={t.emailLabel} />
            <input type="password" required value={authPass} onChange={e => setAuthPass(e.target.value)} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-6 py-4 text-white outline-none focus:border-indigo-500/50 transition-all placeholder-zinc-700 text-sm" placeholder={t.passwordLabel} />
            <Button type="submit" className="w-full py-5 shadow-indigo-600/20 text-xs uppercase tracking-widest font-black">{authMode === 'login' ? t.loginBtn : t.signupBtn}</Button>
          </form>
          <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-[9px] text-zinc-600 hover:text-white underline uppercase tracking-[0.3em] font-bold transition-colors">{authMode === 'login' ? t.noAccount : t.hasAccount}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#020202] text-zinc-400 font-sans selection:bg-indigo-500/30">
      {toast && <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[500] bg-indigo-600 text-white px-8 py-3 rounded-full shadow-2xl font-bold text-xs uppercase tracking-widest animate-in slide-in-from-top-4">{toast}</div>}

      <aside className="w-full md:w-80 glass border-r border-white/5 p-8 flex flex-col gap-10 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-white">V</div>
            <h1 className="font-black text-xl text-white tracking-tighter uppercase italic">{t.studioName}</h1>
          </div>
          <button onClick={() => setLang(l => l === 'en' ? 'pt' : 'en')} className="text-[10px] font-black text-zinc-500 border border-white/10 px-2 py-1 rounded bg-black">{lang}</button>
        </div>

        <nav className="flex flex-col gap-3">
          <span className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.4em] mb-2">{t.toolsHeader}</span>
          {[
            { id: ToolType.IMAGE_GEN, label: t.imageGen, icon: '🎨' },
            { id: ToolType.VIDEO_GEN, label: t.videoGen, icon: '🎬' },
            { id: ToolType.STORY_GEN, label: t.storyGen, icon: '✍️' },
            { id: ToolType.PRICING, label: t.pricingNav, icon: '💎' },
            { id: ToolType.DEPLOY, label: t.deployNav, icon: '🚀' },
          ].map(tool => (
            <button key={tool.id} onClick={() => setActiveTool(tool.id)} className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all border ${activeTool === tool.id ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/20 shadow-inner' : 'text-zinc-600 hover:bg-white/5 border-transparent'}`}>
              <span className="text-xl opacity-70">{tool.icon}</span>
              <span className="font-bold text-xs uppercase tracking-widest">{tool.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-6 lg:p-12 pb-32">
        <div className="max-w-6xl mx-auto space-y-12">
          {activeTool === ToolType.DEPLOY ? (
            <section className="space-y-12 animate-in fade-in slide-in-from-bottom-8">
              <div className="text-center space-y-6">
                <h2 className="text-6xl font-black text-white tracking-tighter italic uppercase">{t.deployTitle}</h2>
                <p className="text-zinc-500 max-w-2xl mx-auto font-medium text-lg">Seu site está pronto para ganhar o mundo. Siga o checklist abaixo.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="glass p-12 rounded-[4rem] border border-indigo-500/20 bg-indigo-600/5 space-y-8">
                  <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">Checklist de Lançamento</h3>
                  <div className="space-y-6">
                    {[
                      { step: "Pasta Criada", desc: "Crie uma pasta no seu computador com todos os arquivos." },
                      { step: "Terminal Aberto", desc: "Abra o Prompt de Comando ou Terminal dentro dessa pasta." },
                      { step: "Vercel CLI", desc: "Digite 'npm i -g vercel' para instalar a ferramenta oficial." },
                      { step: "Comando Deploy", desc: "Digite apenas 'vercel' e dê Enter em todas as perguntas." }
                    ].map((item, i) => (
                      <div key={i} className="flex gap-6 items-start">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-[10px] shrink-0">{i+1}</div>
                        <div>
                          <p className="text-white font-bold text-sm uppercase">{item.step}</p>
                          <p className="text-zinc-500 text-xs">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass p-12 rounded-[4rem] border border-white/5 space-y-8">
                  <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">O Toque Final</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">Após o deploy, a Vercel te dará um link (ex: meu-estudio.vercel.app). Para a IA funcionar lá, você PRECISA fazer isso:</p>
                  <div className="bg-black/80 p-8 rounded-[2.5rem] border border-indigo-500/30 space-y-4">
                    <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Configuração Obrigatória</p>
                    <div className="font-mono text-xs text-indigo-400">
                      Settings > Environment Variables<br/><br/>
                      Name: <span className="text-white">API_KEY</span><br/>
                      Value: <span className="text-white">(Sua Chave do Google)</span>
                    </div>
                  </div>
                  <Button onClick={() => window.open('https://vercel.com/dashboard', '_blank')} className="w-full py-5 text-xs font-black uppercase tracking-widest bg-white text-black hover:bg-zinc-200">Ir para Painel Vercel</Button>
                </div>
              </div>

              <div className="text-center p-12 border-t border-white/5">
                <p className="text-zinc-600 text-[10px] uppercase font-bold tracking-[0.5em]">Visionary Studio Engine © 2025</p>
              </div>
            </section>
          ) : activeTool === ToolType.PRICING ? (
            <div className="space-y-16 animate-in fade-in">
              <div className="text-center space-y-4">
                <h2 className="text-6xl font-black text-white tracking-tighter italic uppercase">{t.plansTitle}</h2>
                <p className="text-zinc-500 max-w-2xl mx-auto font-medium">{t.plansSubtext}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[ 
                  { id: 'free', name: t.planFree, price: t.priceFree, features: t.planFeaturesFree }, 
                  { id: 'start', name: t.planStart, price: t.priceStart, features: t.planFeaturesStart }, 
                  { id: 'pro', name: t.planPro, price: t.pricePro, features: t.planFeaturesPro } 
                ].map(plan => (
                  <div key={plan.id} className={`glass rounded-[3.5rem] p-12 border ${user.tier === plan.id ? 'border-indigo-600 bg-indigo-600/5' : 'border-white/5'} flex flex-col gap-10 hover:border-indigo-500/30 transition-all group relative overflow-hidden`}>
                    {plan.id === 'pro' && <div className="absolute top-8 -right-12 rotate-45 bg-white text-black text-[9px] font-black px-12 py-2 uppercase tracking-widest shadow-2xl">Elite</div>}
                    <div className="space-y-3">
                      <h3 className="text-3xl font-black text-white group-hover:text-indigo-400 transition-colors uppercase italic">{plan.name}</h3>
                      <p className="text-indigo-400 font-bold text-3xl">{plan.price}</p>
                    </div>
                    <ul className="flex-1 space-y-5">
                      {plan.features.map((f, i) => (
                        <li key={i} className="text-xs text-zinc-500 flex gap-4 items-center font-bold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span> {f}
                        </li>
                      ))}
                    </ul>
                    <Button 
                      onClick={() => window.open(PAYMENT_LINKS[plan.id as keyof typeof PAYMENT_LINKS], '_blank')}
                      variant={user.tier === plan.id ? 'secondary' : 'primary'} 
                      disabled={plan.id === 'free' || user.tier === plan.id}
                      className="py-5 text-[10px] uppercase font-black tracking-[0.3em]"
                    >
                      {user.tier === plan.id ? 'ATIVO' : t.upgrade}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <section className="glass rounded-[3.5rem] p-8 lg:p-16 space-y-12 relative overflow-hidden border border-white/5 shadow-2xl">
                {isLoading && (
                  <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center gap-8 animate-in fade-in">
                    <div className="w-20 h-20 border-t-4 border-indigo-600 border-solid rounded-full animate-spin"></div>
                    <p className="text-3xl font-black text-white italic uppercase tracking-tighter">{t.processing}</p>
                  </div>
                )}
                
                <div className="flex items-center justify-between border-b border-white/5 pb-8">
                  <h2 className="text-4xl font-black text-white flex items-center gap-6 italic uppercase tracking-tighter">
                    <span className="w-3 h-12 bg-indigo-600 rounded-full"></span>
                    {t[activeTool.toLowerCase().replace('_', '') as keyof typeof t] || activeTool}
                  </h2>
                </div>

                <div className="space-y-10">
                  <textarea 
                    value={prompt} 
                    onChange={(e) => setPrompt(e.target.value)} 
                    placeholder="Descreva sua obra aqui..." 
                    className="w-full h-56 bg-zinc-950/50 border border-white/5 rounded-[2.5rem] p-10 text-white outline-none focus:border-indigo-600/30 transition-all resize-none text-lg" 
                  />

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 bg-white/2 p-8 rounded-[3rem] border border-white/5">
                    <div className="space-y-5">
                      <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em]">Proporção</span>
                      <div className="flex flex-wrap gap-2">
                        {['1:1', '9:16', '16:9'].map(ratio => (
                          <button key={ratio} onClick={() => setAspectRatio(ratio as AspectRatio)} className={`px-5 py-3 rounded-2xl text-[10px] font-black border ${aspectRatio === ratio ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-black text-zinc-600 border-white/5'}`}>{ratio}</button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-5">
                      <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em]">Estilo Visual</span>
                      <select 
                        value={selectedStyle} 
                        onChange={(e) => setSelectedStyle(e.target.value as ImageStyle)}
                        className="w-full bg-black border border-white/5 rounded-2xl px-5 py-3 text-[10px] font-black text-zinc-400 uppercase outline-none"
                      >
                        <option value="none">Padrão / Realista</option>
                        <option value="cinematic">Cinematográfico</option>
                        <option value="cyberpunk">Cyberpunk / Neon</option>
                        <option value="anime">Anime / Ilustração</option>
                      </select>
                    </div>
                  </div>

                  <Button onClick={handleProcess} className="w-full py-8 text-2xl rounded-[2.5rem] font-black italic uppercase tracking-tighter shadow-indigo-600/30 transform hover:scale-[1.01] transition-all">
                    {t.generateBtn}
                  </Button>
                </div>
              </section>

              <section className="space-y-10">
                <h3 className="text-3xl font-black text-white flex items-center gap-6 italic uppercase tracking-tighter">
                  <span className="w-3 h-10 bg-indigo-600/30 rounded-full"></span> 
                  Arquivo do Estúdio
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                  {history.map(item => (
                    <div key={item.id} className="glass rounded-[3rem] overflow-hidden border border-white/5 flex flex-col group hover:border-indigo-500/30 transition-all animate-in fade-in">
                      <div className="bg-zinc-950 aspect-square flex items-center justify-center overflow-hidden relative">
                        {item.type === 'image' && <img src={item.content} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />}
                        {item.type === 'video' && <video src={item.content} controls className="w-full h-full object-cover" />}
                        {item.type === 'text' && <div className="p-10 text-xs italic text-zinc-400 overflow-y-auto max-h-full font-serif">{item.content}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
