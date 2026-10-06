"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fillWithRandom = fillWithRandom;
exports.uuid4FromRandom = uuid4FromRandom;
exports.createUnsafeRandomSource = createUnsafeRandomSource;
function fillWithRandom(random, bytes) {
    for (let i = 0; i < bytes.length; ++i) {
        bytes[i] = Math.floor(random() * 0x100);
    }
    return bytes;
}
function uuid4FromRandom(random) {
    const ho = (n, p) => n.toString(16).padStart(p, '0');
    const view = new DataView(new ArrayBuffer(16));
    view.setUint32(0, (random() * 0x100000000) >>> 0);
    view.setUint32(4, (random() * 0x100000000) >>> 0);
    view.setUint32(8, (random() * 0x100000000) >>> 0);
    view.setUint32(12, (random() * 0x100000000) >>> 0);
    view.setUint8(6, (view.getUint8(6) & 0xf) | 0x40);
    view.setUint8(8, (view.getUint8(8) & 0x3f) | 0x80);
    return `${ho(view.getUint32(0), 8)}-${ho(view.getUint16(4), 4)}-${ho(view.getUint16(6), 4)}-${ho(view.getUint16(8), 4)}-${ho(view.getUint32(10), 8)}${ho(view.getUint16(14), 4)}`;
}
function createUnsafeRandomSource(random) {
    const source = {
        random,
        uuid4: () => uuid4FromRandom(random),
        fillRandom: (bytes) => fillWithRandom(random, bytes),
    };
    // Omit from JSON like `now`: the methods otherwise stringify to a misleading empty {}.
    Object.defineProperty(source, 'toJSON', { value: () => undefined, enumerable: true });
    return source;
}
//# sourceMappingURL=random-helpers.js.map