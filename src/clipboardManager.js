import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import St from 'gi://St';
import Meta from 'gi://Meta';

const DEBOUNCE_MS = 300;

export class ClipboardManager {
    constructor() {
        this._history = [];
        this._maxSize = 50;
        this._storeImages = true;
        this._debounceId = null;
        this._ownerChangedId = null;
        this._onChangeCallbacks = [];
        this._isSelecting = false;
    }

    enable() {
        const selection = global.display.get_selection();
        this._ownerChangedId = selection.connect('owner-changed', (sel, type, _src) => {
            if (type === Meta.SelectionType.SELECTION_CLIPBOARD)
                this._scheduleRead();
        });
    }

    disable() {
        if (this._ownerChangedId) {
            const selection = global.display.get_selection();
            selection.disconnect(this._ownerChangedId);
            this._ownerChangedId = null;
        }
        if (this._debounceId) {
            GLib.source_remove(this._debounceId);
            this._debounceId = null;
        }
    }

    get history() {
        return this._history;
    }

    set history(value) {
        this._history = value;
    }

    set maxSize(value) {
        this._maxSize = value;
    }

    set storeImages(value) {
        this._storeImages = value;
    }

    onChange(callback) {
        this._onChangeCallbacks.push(callback);
    }

    removeOnChange(callback) {
        this._onChangeCallbacks = this._onChangeCallbacks.filter(cb => cb !== callback);
    }

    _notifyChange() {
        for (const cb of this._onChangeCallbacks)
            cb(this._history);
    }

    _scheduleRead() {
        if (this._debounceId) {
            GLib.source_remove(this._debounceId);
            this._debounceId = null;
        }
        this._debounceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, DEBOUNCE_MS, () => {
            this._debounceId = null;
            if (this._isSelecting) {
                this._isSelecting = false;
                return GLib.SOURCE_REMOVE;
            }
            this._readClipboard();
            return GLib.SOURCE_REMOVE;
        });
    }

    _readClipboard() {
        const clipboard = St.Clipboard.get_default();
        const mimeTypes = clipboard.get_mimetypes(St.ClipboardType.CLIPBOARD);
        const hasImage = mimeTypes?.some(m => m.startsWith('image/'));

        if (hasImage && this._storeImages) {
            this._readImage();
        } else {
            this._readText();
        }
    }

    _readText() {
        const clipboard = St.Clipboard.get_default();
        clipboard.get_text(St.ClipboardType.CLIPBOARD, (_clipboard, text) => {
            if (!text || text.trim() === '')
                return;

            const isDuplicate = this._history.length > 0 &&
                this._history[0].type === 'text' &&
                this._history[0].content === text;

            if (isDuplicate)
                return;

            const entry = {
                type: 'text',
                content: text,
                timestamp: Date.now(),
            };

            this._history = [entry, ...this._history.filter(
                h => !(h.type === 'text' && h.content === text)
            )].slice(0, this._maxSize);

            this._notifyChange();
        });
    }

    _readImage() {
        const selection = global.display.get_selection();
        const mimeType = 'image/png';

        try {
            const outputStream = Gio_MemoryOutputStream_new_resizable();
            selection.transfer_async(
                Meta.SelectionType.SELECTION_CLIPBOARD,
                mimeType, -1, outputStream, null,
                (sel, result) => {
                    try {
                        sel.transfer_finish(result);
                        outputStream.close(null);
                        const bytes = outputStream.steal_as_bytes();

                        if (!bytes || bytes.get_size() === 0)
                            return;

                        const entry = {
                            type: 'image',
                            content: null,
                            bytes,
                            timestamp: Date.now(),
                            imagePath: null,
                        };

                        this._history = [entry, ...this._history].slice(0, this._maxSize);
                        this._notifyChange();
                    } catch (e) {
                        logError(e, 'Failed to read image from clipboard');
                    }
                }
            );
        } catch (e) {
            logError(e, 'Failed to initiate image clipboard transfer');
        }
    }

    selectItem(index) {
        if (index < 0 || index >= this._history.length)
            return;

        const item = this._history[index];
        const newHistory = [
            item,
            ...this._history.slice(0, index),
            ...this._history.slice(index + 1),
        ];
        this._history = newHistory;

        this._isSelecting = true;

        if (item.type === 'text') {
            const clipboard = St.Clipboard.get_default();
            clipboard.set_text(St.ClipboardType.CLIPBOARD, item.content);
        } else if (item.type === 'image' && item.bytes) {
            const clipboard = St.Clipboard.get_default();
            clipboard.set_content(St.ClipboardType.CLIPBOARD, 'image/png', item.bytes);
        }

        this._notifyChange();
    }

    clearAll() {
        this._history = [];
        this._notifyChange();
    }
}

function Gio_MemoryOutputStream_new_resizable() {
    return Gio.MemoryOutputStream.new_resizable();
}
