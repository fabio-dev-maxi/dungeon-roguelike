import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

Object.freeze(Math);

bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    // Neutralizza i metodi di debug residui senza rompere il registro interno di Angular
    const globalNg = (window as any).ng;
    if (globalNg) {
      delete globalNg.getComponent;
      delete globalNg.getInjector;
      delete globalNg.getOwningComponent;
      delete globalNg.getContext;
    }
  })
  .catch(err => console.error(err));