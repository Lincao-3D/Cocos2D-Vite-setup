// @ts-ignore
// src/main.ts
import { boot } from './core/Bootstrapper';

// Console filter to clear irrelevant Cocos warnings.
(function() {
    const ignoredErrors = ['getComponent', 'activeInHierarchy', 'Scene'];
    const orgError = console.error;
    const orgWarn = console.warn;

    const filter = (args: any[], org: Function) => {
        const msg = args.join(' ');
        if (ignoredErrors.some(term => msg.includes(term))) return;
        org.apply(console, args);
    };

    console.error = (...args) => filter(args, orgError);
    console.warn = (...args) => filter(args, orgWarn);
})();

// Starts the engine (registerScripts is called internally after the engine is ready)
boot();