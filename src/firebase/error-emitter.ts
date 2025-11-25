// src/firebase/error-emitter.ts
import { EventEmitter } from 'events';

// Garantindo que a classe EventEmitter não seja removida pelo tree-shaking no browser
// e fornecendo um polyfill se necessário.
class Emitter extends EventEmitter {}

export const errorEmitter = new Emitter();
