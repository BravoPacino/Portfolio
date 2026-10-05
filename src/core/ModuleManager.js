const ATTR_PREFIX = 'data-module-';

export default class ModuleManager {
  constructor(registry = {}) {
    this.registry = registry;
    this.instances = new Map();
  }

  register(name, ModuleClass) {
    this.registry[name] = ModuleClass;
  }

  mount(container = document.body) {
    const els = [container, ...container.querySelectorAll('*')];

    for (const el of els) {
      if (!el.attributes) continue;

      for (const attr of Array.from(el.attributes)) {
        if (!attr.name.startsWith(ATTR_PREFIX)) continue;

        const name = attr.name.slice(ATTR_PREFIX.length);
        const ModuleClass = this.registry[name];

        if (!ModuleClass) {
          console.warn(`[ModuleManager] 未注册的模块 "${name}"`, el);
          continue;
        }
        if (el.__modules?.[name]) continue;

        const instance = new ModuleClass({ el, name, app: this });
        el.__modules = el.__modules || {};
        el.__modules[name] = instance;

        if (!this.instances.has(name)) this.instances.set(name, new Set());
        this.instances.get(name).add(instance);

        instance.init?.();
      }
    }
  }

  unmount(container = document.body) {
    const els = [container, ...container.querySelectorAll('*')];

    for (const el of els) {
      if (!el.__modules) continue;

      for (const [name, instance] of Object.entries(el.__modules)) {
        try {
          instance.destroy?.();
        } catch (err) {
          console.error(`[ModuleManager] "${name}" 销毁失败`, err);
        }
        this.instances.get(name)?.delete(instance);
      }
      delete el.__modules;
    }
  }

  call(method, arg = null, moduleName = null) {
    const targets = moduleName
      ? [this.instances.get(moduleName)]
      : [...this.instances.values()];

    for (const set of targets) {
      if (!set) continue;
      for (const instance of set) {
        if (typeof instance[method] === 'function') instance[method](arg);
      }
    }
  }

  get(name) {
    return [...(this.instances.get(name) || [])];
  }
}
