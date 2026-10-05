import './styles/main.css';
import ModuleManager from './core/ModuleManager.js';
import { initScroll } from './core/scroll.js';
import Preloader from './modules/Preloader.js';
import HeroLight from './modules/HeroLight.js';
import Rolodex   from './modules/Rolodex.js';
import Reveal    from './modules/Reveal.js';
import Budget    from './modules/Budget.js';
import Rail      from './modules/Rail.js';
import Case      from './modules/Case.js';
import Ending    from './modules/Ending.js';
import Cursor    from './modules/Cursor.js';

const { lenis, snap } = initScroll();

const app = new ModuleManager({
  preloader: Preloader,
  herolight: HeroLight,
  rolodex:   Rolodex,
  reveal:    Reveal,
  budget:    Budget,
  rail:      Rail,
  case:      Case,
  ending:    Ending,
  cursor:    Cursor,
});
app.lenis = lenis;
app.mount(document.body);

app.call('bindSnap', snap, 'rail');

document.addEventListener('visibilitychange', () => {
  app.call(document.hidden ? 'pause' : 'resume');
});
