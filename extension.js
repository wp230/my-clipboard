import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {ClipboardManager} from './src/clipboardManager.js';
import {ClipboardPopup} from './src/clipboardPopup.js';
import {HistoryManager} from './src/historyManager.js';

export default class MyClipboardExtension extends Extension {
    enable() {
        this._settings = this.getSettings();

        this._historyManager = new HistoryManager();
        this._clipboardManager = new ClipboardManager();

        this._clipboardManager.maxSize = this._settings.get_int('max-history-size');
        this._clipboardManager.storeImages = this._settings.get_boolean('store-images');

        const savedHistory = this._historyManager.load();
        this._clipboardManager.history = savedHistory;

        this._clipboardPopup = new ClipboardPopup(this._clipboardManager, this._settings);

        this._clipboardManager.enable();
        this._clipboardPopup.enable();

        Main.wm.addKeybinding('toggle-shortcut', this._settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
            () => this._clipboardPopup.toggle()
        );

        this._settingsIds = [];
        this._settingsIds.push(this._settings.connect('changed::max-history-size', () => {
            this._clipboardManager.maxSize = this._settings.get_int('max-history-size');
        }));
        this._settingsIds.push(this._settings.connect('changed::store-images', () => {
            this._clipboardManager.storeImages = this._settings.get_boolean('store-images');
        }));
    }

    disable() {
        Main.wm.removeKeybinding('toggle-shortcut');

        if (this._settingsIds) {
            for (const id of this._settingsIds)
                this._settings.disconnect(id);
            this._settingsIds = null;
        }

        if (this._clipboardPopup) {
            this._clipboardPopup.disable();
            this._clipboardPopup = null;
        }

        if (this._clipboardManager) {
            this._historyManager.save(this._clipboardManager.history);
            this._historyManager.cleanupImages(this._clipboardManager.history);
            this._clipboardManager.disable();
            this._clipboardManager = null;
        }

        this._historyManager = null;
        this._settings = null;
    }
}
